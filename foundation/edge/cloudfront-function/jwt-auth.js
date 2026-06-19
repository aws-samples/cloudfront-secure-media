// CloudFront Function — viewer-request JWT validation (ALTERNATIVE to Lambda@Edge).
//
// The CloudFront Functions runtime does NOT support RSA, so it cannot verify
// Cognito's RS256 access tokens directly. Instead it validates a short-lived
// HS256 token minted by the token-vending Lambda (which DOES verify the Cognito
// token first). Sub-millisecond, no cold start, far cheaper than Lambda@Edge.
//
// The HMAC secret is read at runtime from the associated CloudFront KeyValueStore
// (populated at deploy time from Secrets Manager) — never hardcoded.
//
// See docs/EDGE-AUTH-MODES.md for the full tradeoff discussion.
import cf from 'cloudfront';
import crypto from 'crypto';

// Handle to the KeyValueStore associated with this function (single store).
var kvs = cf.kvs();

function base64urlToString(input) {
    // CloudFront Functions JS 2.0 deprecated String.bytesFrom(); use Buffer.from().
    return Buffer.from(input, 'base64url').toString();
}

var unauthorized = { statusCode: 401, statusDescription: 'Unauthorized' };

async function handler(event) {
    var request = event.request;
    var qs = request.querystring;

    if (!qs.token || !qs.token.value) {
        return unauthorized;
    }

    // All token parsing/decoding/HMAC work is wrapped so a malformed token returns
    // a clean 401. An uncaught throw in a CloudFront Function surfaces as a 503,
    // which would wrongly look like an edge fault rather than a rejected token.
    try {
        var token = qs.token.value;
        var parts = token.split('.');
        if (parts.length !== 3) {
            return unauthorized;
        }

        // Enforce the expected algorithm before doing anything else.
        var header = JSON.parse(base64urlToString(parts[0]));
        if (header.alg !== 'HS256') {
            return unauthorized;
        }

        // Read the shared HMAC secret and expected issuer from the KeyValueStore.
        var hmacSecret = await kvs.get('hmacSecret');
        var expectedIss = await kvs.get('issuer');

        // Recompute the HMAC over "header.payload" and compare to the signature.
        var signingInput = parts[0] + '.' + parts[1];
        var expectedSig = crypto.createHmac('sha256', hmacSecret)
            .update(signingInput)
            .digest('base64url');

        if (expectedSig !== parts[2]) {
            return unauthorized;
        }

        var payload = JSON.parse(base64urlToString(parts[1]));

        // Validate issuer and expiry (seconds since epoch).
        if (payload.iss !== expectedIss) {
            return unauthorized;
        }
        var now = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp < now) {
            return unauthorized;
        }
    } catch (e) {
        return unauthorized;
    }

    // Strip the token so it is not forwarded to (or cached by) the S3 origin.
    delete request.querystring.token;
    return request;
}
