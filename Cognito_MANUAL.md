# Configure the function congnito params manually
This step has been astracted by Amaplify Hooks, by creating a before push script.
If you need to configure manually, please follow the steps below:  
**a. Edit the index.js function file and add your Cognito User Pool attributes**

Open the config.js file, located in

```
  cd amplify/backend/function/jwtauth/src/
  amplify/backend/function/jwtauth/src/config.js
```

List the auth resources created and copy the User Pool id.

```
  amplify auth console
  Using service: Cognito, provided by: awscloudformation
  ? Which console User Pool
  User Pool console:
  https://us-east-1.console.aws.amazon.com/cognito/users/?region=us-east-1#/pool/us-east-SomeID/details
  Current Environment: dev
```

The user pool id can be located in the URL returned by running *amplify auth console*
https://us-east-1.console.aws.amazon.com/cognito/users/?region=us-east-1#/pool/us-east-SomeID/details

**b. Add the Region of the deployment (Cognito region) to the var**

```javascript
  config.REGION = 'us-east-1'
```

**c. Copy the *Pool Id *information and replace in the var USERPOOLID**

```javascript
  config.USERPOOLID = 'us-east-1_SomeID';
```

**d. Download and store the corresponding public JSON Web Key (JWK) for your user pool. It is available as part of a JSON.**
* *Web Key Set (JWKS). You can locate it at:
https://cognito-idp.us-east-1.amazonaws.com/*us-east-SomeID*/.well-known/jwks.json

For more information on JWK and JWK sets, see Cognito Verifying a JSON Web Token documentation (https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html) and JSON Web Key (JWK) (https://tools.ietf.org/html/rfc7517).

You can see the sample jwks.json  in JSON Web Token documentation (https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html).
 Now replace the JWKS with the credentials of your Cognito User Pool.

```javascript
  config.JWKS = '{"keys":[{"alg":"RS256","e":"AQAB","kid":"1234exemple=","kty"::"RSA"....}]}
```

Now deploy your lambda function by simply executing amplify push in the home app folder.

```
  amplify push
```
