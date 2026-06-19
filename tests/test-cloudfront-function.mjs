// Integration tests for the CloudFront Functions (HS256) auth mode.
//
// Prerequisites:
//   1. foundation stack deployed with: cdk deploy -c authMode=cloudfront-function
//   2. cdk-outputs.json present in foundation/
//   3. AWS credentials available (same profile used for deploy)
//
// Run: cd tests && node --test test-cloudfront-function.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadOutputs, createTestUser, craftJwt } from './helpers.mjs';

let outputs;
let user;

describe('CloudFront Functions auth mode', () => {
  before(() => {
    outputs = loadOutputs();
    assert.equal(outputs.authMode, 'cloudfront-function', 'Stack must be deployed in cloudfront-function mode');
    assert.ok(outputs.tokenVendingApiUrl, 'Token vending API URL must be present');
    user = createTestUser(outputs);
  });

  after(() => {
    user?.dispose();
  });

  // --- Helper: mint a stream token via the token-vending API ---
  // The API Gateway Cognito authorizer validates the `aud` claim, which only the
  // ID token carries — so the token-vending call authenticates with the ID token.

  async function mintStreamToken(cognitoIdToken) {
    const res = await fetch(outputs.tokenVendingApiUrl, {
      headers: { Authorization: `Bearer ${cognitoIdToken}` },
    });
    assert.equal(res.status, 200, 'Token vending API should return 200');
    const { token } = await res.json();
    assert.ok(token, 'Response should contain a token');
    return token;
  }

  // --- Token Vending API tests ---

  it('token-vending API rejects unauthenticated requests (401)', async () => {
    const res = await fetch(outputs.tokenVendingApiUrl);
    assert.equal(res.status, 401);
  });

  it('token-vending API rejects invalid bearer token (401)', async () => {
    const res = await fetch(outputs.tokenVendingApiUrl, {
      headers: { Authorization: 'Bearer invalidtoken' },
    });
    assert.equal(res.status, 401);
  });

  it('token-vending API returns HS256 token for valid Cognito ID token (200)', async () => {
    const token = await mintStreamToken(user.idToken);
    const parts = token.split('.');
    assert.equal(parts.length, 3, 'Minted token should be a 3-part JWT');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    assert.equal(header.alg, 'HS256', 'Minted token should use HS256');
  });

  it('token-vending API rejects a Cognito access token (401)', async () => {
    // The API Gateway Cognito authorizer validates `aud`, which access tokens
    // lack — so only the ID token is accepted at the gateway.
    const res = await fetch(outputs.tokenVendingApiUrl, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    assert.equal(res.status, 401);
  });

  it('token-vending API minted token has correct issuer and short TTL', async () => {
    const token = await mintStreamToken(user.idToken);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    assert.equal(payload.iss, 'cloudfront-secure-media');
    assert.ok(payload.exp, 'Token should have exp claim');
    const ttl = payload.exp - payload.iat;
    assert.ok(ttl <= 600, `Token TTL should be ≤ 600s, got ${ttl}s`);
    assert.ok(ttl >= 60, `Token TTL should be ≥ 60s, got ${ttl}s`);
  });

  // --- CloudFront edge rejection tests ---

  it('rejects requests with no token (401)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8`);
    assert.equal(res.status, 401);
  });

  it('rejects requests with garbage token (401)', async () => {
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=garbage`);
    assert.equal(res.status, 401);
  });

  it('rejects RS256 tokens at the edge (wrong alg for CFF mode) (401)', async () => {
    // In CFF mode, sending the raw Cognito access token should fail because
    // the CFF only validates HS256.
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${user.accessToken}`);
    assert.equal(res.status, 401);
  });

  it('rejects HS256 token with wrong issuer (401)', async () => {
    const token = craftJwt(
      { alg: 'HS256', typ: 'JWT' },
      { iss: 'wrong-issuer', sub: 'test', exp: 9999999999 },
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  it('rejects HS256 token with wrong signature (401)', async () => {
    const token = craftJwt(
      { alg: 'HS256', typ: 'JWT' },
      { iss: 'cloudfront-secure-media', sub: 'test', exp: 9999999999 },
      'wrongsignaturehere',
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  it('rejects expired HS256 token (401)', async () => {
    const token = craftJwt(
      { alg: 'HS256', typ: 'JWT' },
      { iss: 'cloudfront-secure-media', sub: 'test', exp: 1 },
      'wrongsig',
    );
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${token}`);
    assert.equal(res.status, 401);
  });

  // --- Success cases ---

  it('serves HLS manifest with valid minted stream token (200)', async () => {
    const streamToken = await mintStreamToken(user.idToken);
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny.m3u8?token=${streamToken}`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.startsWith('#EXTM3U'), 'Response body should be an HLS manifest');
  });

  it('serves TS segment with valid minted stream token (200)', async () => {
    const streamToken = await mintStreamToken(user.idToken);
    const res = await fetch(`${outputs.distributionUrl}/big_buck_bunny_000.ts?token=${streamToken}`);
    assert.equal(res.status, 200);
  });

  it('returns 403 for non-existent file with valid stream token (S3 denies)', async () => {
    const streamToken = await mintStreamToken(user.idToken);
    const res = await fetch(`${outputs.distributionUrl}/does-not-exist.m3u8?token=${streamToken}`);
    assert.equal(res.status, 403);
  });
});
