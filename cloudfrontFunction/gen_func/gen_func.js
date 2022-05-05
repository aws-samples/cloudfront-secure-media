// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// Author Osmar Bento @osmarb

"use strict";

const axios = require("axios").default;
const fs = require("fs");
var jwkToPem = require("jwk-to-pem");
var base64 = require("base64url");

const awsExportsPath = "../../src/aws-exports.js";
readBlock(awsExportsPath);

function readBlock(file_path) {
  fs.readFile(file_path, "utf8", function (err, data) {
    if (err) console.log(err);
    else {
      let splitArray = data.split("\n");
      let newArr = [];
      newArr.push(searchParams("aws_cognito_region", splitArray));
      newArr.push(
        searchParams("aws_user_pools_id", splitArray).replace(/,/g, "")
      );
      newArr.unshift("{");
      newArr.push("}");
      let awsmobile = newArr.join("\n");
      getJWKS(awsmobile);
    }
  });
}

// helper funciton find params
function searchParams(element, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].match(element)) {
      return arr[i];
    }
  }
}

async function getJWKS(awsfile) {
  var awsConfig = JSON.parse(awsfile);
  var config = {};
  config.REGION = awsConfig.aws_cognito_region;
  config.USERPOOLID = awsConfig.aws_user_pools_id;

  var congnitoJWKSurl = `https://cognito-idp.${config.REGION}.amazonaws.com/${config.USERPOOLID}/.well-known/jwks.json`;

  await getJWKSinfo(congnitoJWKSurl);

  async function getJWKSinfo(url) {
    await axios
      .get(url)
      .then(function (response) {
        console.log(response);
        config.JWKS = JSON.stringify(response.data);
        getPublicKey(config.JWKS);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  }
  async function getPublicKey(jwks) {
    console.log(jwks);
    var keys = JSON.parse(jwks).keys;
    for (var i = 0; i < keys.length; i++) {
      var key_id = keys[i].kid;
      var modulus = keys[i].n;
      var exponent = keys[i].e;
      var key_type = keys[i].kty;
      var jwk = { kty: key_type, n: modulus, e: exponent };
    }

    let PUBKEY = await jwkToPem(jwk);
    let buff = new Buffer(PUBKEY);
    config.KID = key_id;
    config.PUBKEY = buff.toString("base64");
    writeConfig(config);
  }
}

function writeConfig(config) {
  console.log(config.PUBKEY);
  let configParams = `
  // This is auto generated be the gen_func.js v3
  var crypto = require("crypto");
  var config = {};
  config.REGION = '${config.REGION}'
  config.USERPOOLID = '${config.USERPOOLID}'
  config.KID = '${config.KID}'
  config.PUBKEY = '${config.PUBKEY}'
  // This is auto generated be the gen_func.js`;

  fs.appendFile("../function.js", configParams, { flag: "r+" }, (error) => {
    if (error) console.log(error);
    else {
      console.log("File written successfully\n");
      console.log("The written has the following contents: ");
      console.log(fs.readFileSync("../function.js", "utf8"));
    }
  });
}
