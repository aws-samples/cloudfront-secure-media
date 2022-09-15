// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// Author Osmar Bento @osmarb

"use strict";

const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "..", "/src/aws-exports.js");
readBlock(filePath);

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

function searchParams(element, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].match(element)) {
      return arr[i];
    }
  }
}

async function getJWKS(awsmobile) {
  var awsConfig = JSON.parse(awsmobile);
  var config = {};
  config.REGION = awsConfig.aws_cognito_region;
  config.USERPOOLID = awsConfig.aws_user_pools_id;

  var congnitoJWKSurl = `https://cognito-idp.${config.REGION}.amazonaws.com/${config.USERPOOLID}/.well-known/jwks.json`;

  await getJWKSinfo(congnitoJWKSurl);

  async function getJWKSinfo(url) {
    await axios
      .get(url)
      .then(function (response) {
        config.JWKS = response.data;
        writeConfig(config);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
}

async function writeConfig(config) {
  let params = `
  var config = {};
  config.REGION = '${config.REGION}'
  config.USERPOOLID = '${config.USERPOOLID}'
  config.JWKS = '${JSON.stringify(config.JWKS)}'
  module.exports = config;`;

  fs.writeFile(
    __dirname + "/../backend/function/jwtauth/src/config.js",
    params,
    (error) => {
      if (error) console.log(error);
      else {
        console.log("File written successfully\n");
        console.log("The written has the following contents:");
        console.log(
          fs.readFileSync(
            __dirname + "/../backend/function/jwtauth/src/config.js",
            "utf8"
          )
        );
      }
    }
  );
}
