'use strict';
var jwt = require('jsonwebtoken');  
var jwkToPem = require('jwk-to-pem');
var config = require('./config');
var JWKS = config.JWKS; // please configure the file config.js
var iss = 'https://cognito-idp.' + config.REGION + '.amazonaws.com/' + config.USERPOOLID;
var pems;

pems = {};
var keys = JSON.parse(JWKS).keys;
for(var i = 0; i < keys.length; i++) {
    var key_id = keys[i].kid;
    var modulus = keys[i].n;
    var exponent = keys[i].e;
    var key_type = keys[i].kty;
    var jwk = { kty: key_type, n: modulus, e: exponent};
    var pem = jwkToPem(jwk);
    pems[key_id] = pem;
}

const response401 = {
    status: '401',
    statusDescription: 'Unauthorized'
};

exports.handler = (event, callback) => {
    const cfrequest = event.Records[0].cf.request;
    const headers = cfrequest.headers;
    console.log('getting started');
    console.log('pems=' + pems);
    console.log('cfrequest=' + cfrequest);
    console.log("!!!", config, iss, JWKS);
    
    const srcQuerystring = cfrequest.querystring;
    console.log('qurey pam=', srcQuerystring);

    //strip out "Bearer " to extract JWT token only
    var jwtToken = srcQuerystring.slice(6);
    console.log('jwtToken=' + jwtToken);

    //Fail if the token is not jwt
    var decodedJwt = jwt.decode(jwtToken, {complete: true});
    console.log("Decoded Token", decodedJwt);
    if (!decodedJwt) {
        console.log("Not a valid JWT token");
        
        callback(null, response401);
        return false;
    }

    // UserPool check
    if (decodedJwt.payload.iss != iss) {
        console.log("invalid issuer, check config.js");
        callback(null, response401);
        return false;
    }

    //Reject the jwt if it's not an 'Access Token'
    if (decodedJwt.payload.token_use != 'access') {
        console.log("Not an access token");
        callback(null, response401);
        return false;
    }

    //Get the kid from the token and retrieve corresponding PEM
    var kid = decodedJwt.header.kid;
    var pem = pems[kid];
    if (!pem) {
        console.log('Invalid access token');
        callback(null, response401);
        return false;
    }

    //Verify the signature of the JWT token to ensure it's really coming from your User Pool
    jwt.verify(jwtToken, pem, { issuer: iss }, function(err, payload) {
      if(err) {
        console.log('Token failed verification', err);
        callback(null, response401);
        return false;
      } else {
        //Valid token. 
        console.log('Successful verification');
        //remove authorization header
        delete cfrequest.headers.authorization;
        //CloudFront can proceed to fetch the content from origin
        callback(null, cfrequest);
        return true;
      }
    });
};