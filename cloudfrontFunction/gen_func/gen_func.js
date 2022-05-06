// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// Author Osmar Bento @osmarb

"use strict";

const fs = require("fs");
var config = require("./config");

console.log(config);

writeConfig(config);

function writeConfig(config) {
  console.log(config.KID);
  let configParams = `
  // This is auto generated be the gen_func.js v3
  var crypto = require("crypto");
  var config = {};
  config.KID = '${config.KID}'
  config.ISS = '${config.ISS}'
  config.SECRET = '${config.SECRET}'
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
