// Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// Author Osmar Bento @osmarb

"use strict";

const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "..", "/src/aws-exports.js");
const strToRemove = "export default awsmobile;";
/*const awsExports = fs.readFileSync(filePath, "utf-8", function (err, data) {
  if (err) console.log(err);
  else {
    let splitArray = data.split("\n");
    splitArray.splice(splitArray.indexOf(strToRemove), 1);
    let result = splitArray.join("\n");
    return result;
  }

    
});*/

readBlock(filePath);

async function readBlock(file) {
  await removeString(
    file,
    "const awsmobile = {",
    "export default awsmobile;",
    "};"
  );

  async function removeString(
    fileName,
    removeParam1,
    removeParam2,
    removeParam3
  ) {
    await fs.readFile(fileName, "utf8", function (err, data) {
      let splitArray = data.split("\n");
      splitArray.splice(splitArray.indexOf(removeParam1), 1);
      splitArray.splice(splitArray.indexOf(removeParam2), 1);
      splitArray.splice(splitArray.indexOf(removeParam3), 1);
      let newArr = splitArray.slice(3);
      newArr.unshift("{");
      newArr.push("}");
      let result = newArr.join("\n");
      callImport(result);
    });
  }
}

async function callImport(awsmobile) {
  var awsConfig = JSON.parse(awsmobile);

  var config = {};
  config.REGION = awsConfig.aws_project_region;
  config.USERPOOLID = awsConfig.aws_user_pools_id;

  var congnitoJWKSurl = `https://cognito-idp.${config.REGION}.amazonaws.com/${config.USERPOOLID}/.well-known/jwks.json`;

  await getJWKSinfo(congnitoJWKSurl);

  async function getJWKSinfo(url) {
    await axios
      .get(url)
      .then(function (response) {
        console.log(response);
        config.JWKS = response.data;
        writeConfig(config);
      })
      .catch(function (error) {
        // handle error
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
