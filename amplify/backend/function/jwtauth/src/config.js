var config = {};

config.REGION = "us-east-1"; // please replace with the cognito region id. region of the deployment, e.i us-east-1
config.USERPOOLID = ""; // please add your cognito user pool id, you can run amplify auth console and select 'User Pool option'
config.JWKS = ""; // please add the cognito well-known JWKS, please read step 5
module.exports = config;

/// version 0.1.7
