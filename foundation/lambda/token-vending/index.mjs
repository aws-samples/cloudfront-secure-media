// Token-vending Lambda (behind API Gateway + Cognito authorizer).
//
// SECURITY: this Lambda is NOT publicly reachable. API Gateway's Cognito User
// Pools authorizer validates the caller's Cognito JWT BEFORE this code runs, so
// we can trust the gateway-supplied claims and simply mint a short-lived HS256
// token that the CloudFront Function verifies at the edge.
//
// Config arrives via environment variables (a regular Lambda can use them):
//   ISSUER, TOKEN_TTL_SECONDS, SECRET_ARN.
import crypto from 'node:crypto';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Fail loudly on missing config rather than silently defaulting — a wrong issuer
// would make every minted token fail the CloudFront Function's iss check with no
// obvious cause.
const ISSUER = requireEnv('ISSUER');
const SECRET_ARN = requireEnv('SECRET_ARN');
const TOKEN_TTL_SECONDS = parseInt(process.env.TOKEN_TTL_SECONDS || '300', 10);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const sm = new SecretsManagerClient({});
let hmacSecret = null;

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getHmacSecret() {
  if (hmacSecret) return hmacSecret;
  const out = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_ARN }));
  hmacSecret = out.SecretString;
  return hmacSecret;
}

// Mint a short-lived HS256 token the CloudFront Function validates.
function mintHs256(secret, sub) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ iss: ISSUER, sub, iat: now, exp: now + TOKEN_TTL_SECONDS }));
  const signingInput = `${header}.${body}`;
  const sig = base64url(crypto.createHmac('sha256', secret).update(signingInput).digest());
  return `${signingInput}.${sig}`;
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
  };
}

export const handler = async (event) => {
  // The gateway's Cognito authorizer guarantees these claims exist; if somehow
  // absent, fail closed.
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims || !claims.sub) {
    return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: 'unauthorized' }) };
  }

  // The API Gateway Cognito authorizer validates the `aud` claim, which only ID
  // tokens carry (access tokens have `client_id`, not `aud`). So this endpoint is
  // reached with an ID token; require it explicitly.
  if (claims.token_use !== 'id') {
    return { statusCode: 403, headers: cors(), body: JSON.stringify({ error: 'id token required' }) };
  }

  try {
    const secret = await getHmacSecret();
    const token = mintHs256(secret, claims.sub);
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ token }) };
  } catch (err) {
    console.log('Token minting failed:', err.message);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'internal' }) };
  }
};
