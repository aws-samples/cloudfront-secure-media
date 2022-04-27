const axios = require("axios").default;
const fs = require("fs");

var awsConfig = require("./src/aws-exports");
var config = {};
config.REGION = awsConfig.default.aws_project_region;
config.USERPOOLID = awsConfig.default.aws_user_pools_id;

console.log(config.REGION);

var congnitoJWKSurl = `https://cognito-idp.${config.REGION}.amazonaws.com/${config.USERPOOLID}/.well-known/jwks.json`;

writeConfig();

async function writeConfig() {
  await getJWKSinfo(congnitoJWKSurl);

  console.log("HERE", config.JWKS);

  let params = `
  var config = {};
  config.REGION = '${config.REGION}'
  config.USERPOOLID = '${config.USERPOOLID}'
  config.JWKS = '${JSON.stringify(config.JWKS)}'
  module.exports = config;`;

  fs.writeFile(
    "./amplify/backend/function/jwtauth/src/config.js",
    params,
    (error) => {
      if (error) console.log(error);
      else {
        console.log("File written successfully\n");
        console.log("The written has the following contents:");
        console.log(
          fs.readFileSync(
            "./amplify/backend/function/jwtauth/src/config.js",
            "utf8"
          )
        );
      }
    }
  );
}

async function getJWKSinfo(url) {
  await axios
    .get(url)
    .then(function (response) {
      console.log(response);
      config.JWKS = response.data;
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function () {
      // always executed
    });
}
