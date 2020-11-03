'use strict';
var jwt = require('jsonwebtoken');  
var jwkToPem = require('jwk-to-pem');
//const querystring = require('querystring');

/*
TO DO:
copy values from CloudFormation outputs into USERPOOLID and JWKS variables
*/

var USERPOOLID = 'us-east-1_DRBoVcEDj';
var JWKS = '{"keys":[{"alg":"RS256","e":"AQAB","kid":"lEpBAGaRbWs8ErEq8+q+11psTXahTixNIe7v3DcOQiU=","kty":"RSA","n":"l386VbwpGsFML-g_mwbh7ivdwT6m0JTp2F4h2rJ-Z9y7hBwKhHYMPnMMzXXnE-MUlSkD05Amvk7ZsN7kRHIv8uQnwXaAm8SQNl9e7SJOd_PlI4GzB_uBMhd_V7Z4ijpBHTmStDO8ff3cg6GNW4EVpv9Ux7EaU7vuC6Ace_TcgSpqqJ5wsPp7TAhtJS5JwIG2In86kLgQ8caa1Yd4lC0y7xLLeC1dZ-8m4DRClPs1xrO5840i2xanrOMrbAnSvSfNEGSDVN-T2FKs4N4e2h0jmve0BorCrVCsus5gpzr4MJ4SJlhfELh9dhUhXji3KpMkLA0y3IZrJRIBYveEi-9WeQ","use":"sig"},{"alg":"RS256","e":"AQAB","kid":"X7bZrqnWFxtFKDtIlqphlblmMtrCCnTCVSqZ5BFFlLM=","kty":"RSA","n":"uyCyrAgzqpGMxhvnFexZU8bocg9v7omFo35O6j9xHaG4Q0UYFfFCj-3SkT1R_UjBbdTWLNQk3gVENUJRlHdffZKkXzQD_drglt5DZ0inWqsipePB4ZzTGKJgw7QftxbKYmbTIfEjDQJEHkvKU2CLLsho_-0MxMd_nwSP0gc1JixMqPvooIaR0dpJVNZ8TullxWnAxx4gsW0xdm20MGy33t-qNlOsocZY8bfXzKOq0jNzfsl4wb8iop93-JWImBBhkDF-mBTqFeMmRcmBFq4geq_tYWT0yKeb63o_gXl68BX7z_CKA-j5wZmwXXE8L8Cvqr7CtdebXeWvhS1T5ZMaAw","use":"sig"}]}';

/*
verify values above  
*/


var region = 'us-east-1';
var iss = 'https://cognito-idp.' + region + '.amazonaws.com/' + USERPOOLID;
var pems;

pems = {};
var keys = JSON.parse(JWKS).keys;
for(var i = 0; i < keys.length; i++) {
    //Convert each key to PEM
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

exports.handler = (event, context, callback) => {
    const cfrequest = event.Records[0].cf.request;
    const headers = cfrequest.headers;
    console.log('getting started');
    console.log('USERPOOLID=' + USERPOOLID);
    console.log('region=' + region);
    console.log('pems=' + pems);
    console.log('cfrequest=' + cfrequest);
    
    const srcQuerystring = cfrequest.querystring;
    console.log('qurey pam=', srcQuerystring);

    //Fail if no authorization header found
    // Video JS is removing headers when custom header
    /*if(!headers.authorization) {
        console.log("no auth header");
        callback(null, response401);
        return false;
    }*/

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

    //Fail if token is not from your UserPool
    if (decodedJwt.payload.iss != iss) {
        console.log("invalid issuer");
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
