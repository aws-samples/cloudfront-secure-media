/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

var AWS = require("aws-sdk");
var crypto = require("crypto");
var secret;

// get the secret from secrets manager
exports.handler = async (event) => {
  //get user details
  let username = event.path.substring(event.path.lastIndexOf("/") + 1);

  // get the secret from secrets manager
  if (secret === undefined) {
    console.log("secret", secret);
    await getSecret(
      "arn:aws:secretsmanager:us-east-1:098435415742:secret:MySecret-sCZzxB"
    );
  }
  // generate the token
  // header definition
  let header = {
    "alg": "HS256",
    "typ": "JWT",
  };
  header = JSON.stringify(header);
  header = Buffer.from(header).toString("base64url");

  // playload definition
  let dateNow = new Date();
  let expDate = new Date();
  expDate.setHours(48);
  let payload = {
    "iss": "aws.sample.code",
    "iat": dateNow.toLocaleString(),
    "exp": expDate.toLocaleString(),
    "username": username,
  };
  payload = JSON.stringify(payload);
  payload = Buffer.from(payload).toString("base64url");

  // signature with sha256 and crypto
  var input = [header, payload].join(".");
  let signature = crypto
    .createHmac("sha256", secret)
    .update(input)
    .digest("base64url");

  let jwtToken = input + "." + signature;

  // return token
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: jwtToken,
  };
};

async function getSecret(arn) {
  var secretsManager = new AWS.SecretsManager({ apiVersion: "2017-10-17" });
  let secretReq = await secretsManager
    .getSecretValue({ SecretId: arn })
    .promise();
  let secretValue = JSON.parse(secretReq.SecretString);
  secret = secretValue.secret;
}
