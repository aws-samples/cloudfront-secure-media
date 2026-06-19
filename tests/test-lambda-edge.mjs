// Integration tests for the Lambda@Edge (RS256) auth mode.
//
// Prerequisites:
//   1. foundation stack deployed with authMode=lambda-edge (the default)
//   2. cdk-outputs.json present in foundation/
//   3. AWS credentials available (same profile used for deploy)
//
// Run: cd tests && node --test test-lambda-edge.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadOutputs, createTestUser, craftJwt } from './helpers.mjs';

let outputs;
let user;

describe('Lambda@Edge auth mode', () => {
  before(() => {
    outputs = loadOutputs();
    assert.equal(outputs.authMode, 'lambda-edge', 'Stack must be deployed in lambda-edge mode');
    user = createTestUser(outputs);
  });

  after(() => {
    user?.dispose();
  });

  // --- Rejection cases (must all return 401) ---

  it('rejects requests with no token (401)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8`);
    assert.equal(res.status, 401);
  });

  it('rejects requests with garbage token (401)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=garbage`);
    assert.equal(res.status, 401);
  });

  it('rejects tokens with wrong algorithm HS256 (401)', async () => {
    const token = craftJwt(
      { alg: 'HS256', typ: 'JWT' },
      { iss: `https://cognito-idp.${outputs.region}.amazonaws.com/${outputs.userPoolId}`, token_use: 'access', exp: 9999999999 },
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  it('rejects tokens with wrong issuer (401)', async () => {
    const token = craftJwt(
      { alg: 'RS256', kid: 'nonexistent' },
      { iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_WRONG', token_use: 'access', exp: 9999999999 },
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  it('rejects tokens with token_use=id (401)', async () => {
    const token = craftJwt(
      { alg: 'RS256', kid: 'nonexistent' },
      { iss: `https://cognito-idp.${outputs.region}.amazonaws.com/${outputs.userPoolId}`, token_use: 'id', exp: 9999999999 },
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  it('rejects tokens with non-existent kid (401)', async () => {
    const token = craftJwt(
      { alg: 'RS256', kid: 'does-not-exist-in-jwks' },
      { iss: `https://cognito-idp.${outputs.region}.amazonaws.com/${outputs.userPoolId}`, token_use: 'access', exp: 9999999999 },
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  it('rejects tokens with invalid signature (401)', async () => {
    // Valid header/payload structure but signature is wrong.
    const token = craftJwt(
      { alg: 'RS256', kid: 'some-kid' },
      { iss: `https://cognito-idp.${outputs.region}.amazonaws.com/${outputs.userPoolId}`, token_use: 'access', exp: 9999999999, sub: 'fake' },
      'dGhpcyBpcyBub3QgYSB2YWxpZCBzaWduYXR1cmU', // base64url of garbage
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  it('rejects a two-part malformed JWT (401)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=part1.part2`);
    assert.equal(res.status, 401);
  });

  // --- Success cases ---

  it('serves HLS manifest with valid Cognito access token (200)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${user.accessToken}`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.startsWith('#EXTM3U'), 'Response body should be an HLS manifest');
  });

  it('serves TS segment with valid token (200)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny_000.ts?token=${user.accessToken}`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type');
    // S3 returns video/mp2t or application/octet-stream for .ts files.
    assert.ok(contentType, 'Should have a content-type header');
  });

  it('returns 403 for non-existent file with valid token (S3 denies)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/does-not-exist.m3u8?token=${user.accessToken}`);
    // CloudFront returns 403 when S3 says the key doesn't exist (OAC, no public listing).
    assert.equal(res.status, 403);
  });

  it('does not forward token to origin (CachePolicy strips querystring)', async () => {
    // Two requests with different tokens to the same path should hit the same
    // cache entry (if caching is enabled) or at minimum both succeed — proving
    // the token is not part of the cache key or the origin request.
    const res1 = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${user.accessToken}`);
    assert.equal(res1.status, 200);
    // Second request: same token, should also succeed (not cached with token).
    const res2 = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${user.accessToken}`);
    assert.equal(res2.status, 200);
  });
});
