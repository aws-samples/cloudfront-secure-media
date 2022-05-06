// This is auto generated be the gen_func.js v3
var crypto = require("crypto");
var config = {};
config.KID = "MySecretID";
config.ISS = "aws.sample.code";
config.SECRET =
  "2afe16a6d630d94cd07c68d5e35568655bf5f60bef29c4f1321fc857816afec9"; // has to be replaced with your secret key
// This is auto generated be the gen_func.js//////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var response401 = {
  statusCode: 401,
  statusDescription: "Unauthorized",
};

function jwt_verify(JWT) {
  // 2. validate
  // check token
  if (!JWT) {
    throw new Error("No token supplied");
  }
  // check segments
  var segments = JWT.split(".");
  if (segments.length !== 3) {
    throw new Error("Token provided is not a valid JWT Token");
  }

  var jwtHeader = JWT.split(".")[0];
  var jwtPayload = JWT.split(".")[1];
  var jwtSignature = JWT.split(".")[2];

  validateHeader(jwtHeader);
  validatePayload(jwtPayload);

  // final signature validation
  var payload = JSON.parse(_base64urlDecode(jwtPayload));

  var tokenInput = [jwtHeader, jwtPayload].join(".");
  var signingMethod = "sha256";

  if (jwtSignature != signToken(tokenInput, signingMethod, config.SECRET)) {
    throw new Error("Token provided is not a valid JWT Token Signature");
  }

  return payload;
}

function validateHeader(header) {
  var header = JSON.parse(_base64urlDecode(header));
  // check kid
  if (header.kid != config.KID) {
    throw new Error("Header failed");
  }
}

function validatePayload(payload) {
  var payload = JSON.parse(_base64urlDecode(payload));
  // check payload iss
  if (payload.iss != config.ISS) {
    throw new Error("Payload failed");
  }
  if (payload.iat && Date.now() < payload.nbf * 1000) {
    throw new Error("Token not yet active");
  }

  if (payload.exp && Date.now() > payload.exp * 1000) {
    throw new Error("Token expired");
  }
}

function signToken(input, method, secret) {
  var signature = crypto
    .createHmac(method, secret)
    .update(input)
    .digest("base64url");
  return signature;
}

function handler(event) {
  var request = event.request;

  // 1. validate if has querystring
  if (!request.querystring.token) {
    console.log("No JWT token was supplied");
    return response401;
  }

  var token = request.querystring.token.value;

  try {
    jwt_verify(token);
  } catch (e) {
    console.log(e);
    return response401;
  }

  //Remove the JWT from the query string if valid and return.
  delete request.querystring.jwt;
  console.log("Valid JWT token");
  return request;
}

// helper funcitons

function _base64Decode(str) {
  return String.bytesFrom(str, "base64");
}

function _base64urlDecode(str) {
  return String.bytesFrom(str, "base64url");
}
