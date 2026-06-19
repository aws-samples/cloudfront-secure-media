// Static configuration for the Lambda@Edge validator.
//
// Lambda@Edge cannot use environment variables, and the Cognito user pool ID is
// not known until deploy time. The clean, AWS-documented workaround is SSM
// Parameter Store: this file holds only static values (the parameter name and the
// region the parameter lives in — both known at synth), and the handler reads the
// pool ID from SSM at cold start. See index.js.
module.exports = {
  SSM_PARAMETER_NAME: '/cloudfront-secure-media/auth-config',
  SSM_REGION: 'us-east-1',
};
