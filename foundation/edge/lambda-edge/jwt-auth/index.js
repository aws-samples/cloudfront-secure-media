// Lambda@Edge viewer-request handler: validates a Cognito RS256 access token
// passed as ?token=<jwt>, then strips it before the request reaches the S3 origin.
//
// Two values are resolved at cold start and cached in module scope:
//   1. Auth config (region + userPoolId) — read from SSM Parameter Store, because
//      Lambda@Edge cannot use environment variables and the pool ID is only known
//      at deploy time. This is the AWS-documented pattern for edge configuration.
//   2. JWKS — fetched from the Cognito endpoint and cached by kid; an unknown kid
//      refreshes the cache, so key rotation does not require a redeploy.
const crypto = require('crypto');
const https = require('https');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const config = require('./config');

const ssm = new SSMClient({ region: config.SSM_REGION });

let authConfig = null; // { region, userPoolId, iss, jwksUrl }
let keyCache = {}; // kid -> crypto.KeyObject

const response401 = { status: '401', statusDescription: 'Unauthorized' };

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

async function getAuthConfig() {
  if (authConfig) return authConfig;
  const out = await ssm.send(new GetParameterCommand({ Name: config.SSM_PARAMETER_NAME }));
  const parsed = JSON.parse(out.Parameter.Value); // { region, userPoolId }
  const iss = `https://cognito-idp.${parsed.region}.amazonaws.com/${parsed.userPoolId}`;
  authConfig = { ...parsed, iss, jwksUrl: `${iss}/.well-known/jwks.json` };
  return authConfig;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

// Returns the KeyObject for a kid, refreshing the cache once on a miss.
async function getKey(kid, jwksUrl) {
  if (keyCache[kid]) return keyCache[kid];
  const jwks = await fetchJson(jwksUrl);
  const next = {};
  for (const key of jwks.keys || []) {
    if (key.kty === 'RSA') {
      try {
        next[key.kid] = crypto.createPublicKey({ key, format: 'jwk' });
      } catch (err) {
        console.log('Failed to create key for kid:', key.kid, err.message);
      }
    }
  }
  keyCache = next;
  return keyCache[kid];
}

exports.handler = async (event) => {
  const cfrequest = event.Records[0].cf.request;
  const srcQuerystring = cfrequest.querystring;

  // Never log the raw token or decoded claims — they would land in CloudWatch.
  const tokenMatch = srcQuerystring.match(/token=([^&]*)/);
  if (!tokenMatch) {
    console.log('No token found in query string');
    return response401;
  }

  const jwtToken = decodeURIComponent(tokenMatch[1]);
  const parts = jwtToken.split('.');
  if (parts.length !== 3) {
    console.log('Invalid JWT token format');
    return response401;
  }

  let header, payload;
  try {
    header = JSON.parse(base64urlDecode(parts[0]).toString());
    payload = JSON.parse(base64urlDecode(parts[1]).toString());
  } catch (err) {
    console.log('Malformed JWT header or payload');
    return response401;
  }

  // Enforce the expected algorithm before trusting the key id (defends against
  // algorithm-confusion attacks).
  if (header.alg !== 'RS256') {
    console.log('Unexpected JWT algorithm:', header.alg);
    return response401;
  }

  let cfg;
  try {
    cfg = await getAuthConfig();
  } catch (err) {
    console.log('Failed to load auth config from SSM:', err.message);
    return response401;
  }

  if (payload.iss !== cfg.iss) {
    console.log('Invalid issuer');
    return response401;
  }
  if (payload.token_use !== 'access') {
    console.log('Not an access token');
    return response401;
  }

  let keyObject;
  try {
    keyObject = await getKey(header.kid, cfg.jwksUrl);
  } catch (err) {
    console.log('Failed to load JWKS:', err.message);
    return response401;
  }
  if (!keyObject) {
    console.log('Invalid access token - no matching key');
    return response401;
  }

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(parts[0] + '.' + parts[1]);
    if (!verifier.verify(keyObject, base64urlDecode(parts[2]))) {
      console.log('Token signature verification failed');
      return response401;
    }

    // Require a future exp. A token without exp is treated as invalid rather than
    // never-expiring.
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      console.log('Token missing or past expiration');
      return response401;
    }

    console.log('Successful verification');
    // Strip the token from the query string before forwarding to S3.
    cfrequest.querystring = srcQuerystring.replace(/[?&]?token=[^&]*&?/, '').replace(/^&/, '');
    return cfrequest;
  } catch (err) {
    console.log('Token failed verification', err.message);
    return response401;
  }
};
