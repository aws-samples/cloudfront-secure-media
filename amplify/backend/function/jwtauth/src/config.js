var config = {};

config.REGION = process.env.AWS_REGION
config.USERPOOLID = '' // please add you cognito user pool id, you can run amplify auth console and select 'User Pool option'
config.JWKS = '' // please add the cognito well-known JWKS, please read step 5 
module.exports = config;