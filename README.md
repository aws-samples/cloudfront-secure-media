# Secure your Media Workloads with JWT Token with Lambda@Edge

This is a sample code for protecting your Amazon CloudFront media distributions with AWS Cognito JWT Token, Lambda@Edge and Video.js

## Deployment Steps:

### 1. Project Dependencies

For building the integration with AWS components and host our web application we will be using AWS Amplify. 
For more complete steps of installing and configure AWS Amplify please visit the documentation (Amplify Documentation (https://docs.amplify.aws/start/getting-started/installation/q/integration/react#option-2-follow-the-instructions) for React). 

```sh
  npm install -g @aws-amplify/cli
  amplify configure
```

*[Optional]* If you are using [AWS Cloud9](https://aws.amazon.com/cloud9/), you need to copy the cretential for the amplify config

```sh
  cp ~/.aws/credentials ~/.aws/config
```

### 2. Clone the repository
We will clone using the amplify init app. AWS Amplify will create a sample implementation on your local environment and provision the AWS backend resources: (API and Authentication).

```sh
  git clone https://github.com/aws-samples/cloudfront-secure-media.git
  cd cloudfront-secure-media/
```

Now install the dependencies and start your backend environment with AWS Amplify.

```sh
  npm install   
```
```sh
  amplify init
  ? Enter a name for the environment dev
  ? Choose your default editor: Visual Studio Code
  Using default provider  awscloudformation
  ? Select the authentication method you want to use: AWS profile
  ? Please choose the profile you want to use default
```
*Please make sure to select correct aws profile created with amplify configure*

### 3. Create your cloud environment for authentication

```sh
  amplify status
```

It should list the following resources:

```
      Current Environment: dev
      
  ┌──────────┬──────────────────────────┬───────────┬───────────────────┐
  │ Category │ Resource name            │ Operation │ Provider plugin   │
  ├──────────┼──────────────────────────┼───────────┼───────────────────┤
  │ Auth     │ playerjwtcognito5d5d2eb2 │ Create    │ awscloudformation │
  ├──────────┼──────────────────────────┼───────────┼───────────────────┤
  │ Function │ jwtauth                  │ Create    │ awscloudformation │
  └──────────┴──────────────────────────┴───────────┴───────────────────┘
```

To create the Amazon Cognito user pool for authenticate our users, and provide the JWT token to protect your media resources, we need to push the local resources to the AWS cloud.

```sh
  amplify push
```

## 4. Start your local environment 

Now you can start testig your application

```sh
  npm start
```
It should load the authentication page. Now you can create your first user account and sign in.
Click in *Create Account*

<img src="/doc/Auth01.png" alt="Create your Account" />

 *After the login, it should load the following local website:*
<img src="/doc/SimplePlayer.png" alt="Simple Player Demo" />

### 5. Setup the video workflow: **[ Optional ]**
*Note: You can jump this step if you already have a video, HLS content in a S3 bucket*

We will be using Amplify Video (https://github.com/awslabs/amplify-video) for creating some test VOD content, Amplify Video is an open-source plugin for the Amplify CLI, that makes it easy to incorporate video streaming to your web or mobile applications. Powered by AWS Amplify (https://aws-amplify.github.io/) and AWS Media Services (https://aws.amazon.com/media-services/).
Amplify video also supports live workflows. For more options and sample implementations, please visit amplify-video (https://github.com/awslabs/amplify-video) GitHub.

```
  npm i amplify-category-video -g

  amplify add video
  ? Please select from one of the below mentioned services: Video-On-Demand
  ? Provide a friendly name for your resource to be used as a label for this category in the project: vod-wf-jwt
  ? Select a system-provided encoding template, specify an already-created template name:  Default HLS Adaptive Bitrate
  ? Is this a production enviroment? Yes
  ? Do you want to protect your content with signed urls? No
  ? Do you want Amplify to create a new GraphQL API to manage your videos? (Beta) No
  ✔ All resources built.
```
```
  amplify push
```

Amplify Video will create the S3 bucket to store the source content, the transcoded content, it will also deploy the CloudFront distribution. Please see the sample result of amplify push.

```
  Video on Demand:

  Input Storage bucket:
  vodcfjwt-dev-input-SOMEID

  Output URL for content:
  https://someid.cloudfront.net (https://someid.cloudfront.net/)
```


*Note:* Amplify Video also offers the option to protect the content with a signed URL, you can find more information on how to use signed url using amplify video at Getting Started with VOD (https://github.com/awslabs/amplify-video/wiki/Getting-Started-with-VOD).

**Test Transcoding**

Navigate to the S3 console. Amplify Video has deployed a few buckets into your environment. Select the input bucket and upload a .mp4 file you have stored locally on your computer.
Once the file has been successfully uploaded, navigate the MediaConvert Console to see your transcode job kicked off. This job takes the input file, transcodes it into the Apple HTTP Live Streaming Protocol (HLS), and outputs the segment files to the S3 bucket labeled output.

**Testing Media Playback**

After the MediaConvert job has reached a completed state, navigate back to the S3 Console, and locate the output bucket. When you step into the bucket you will see a folder with the name of the file you uploaded. Step into the folder and you will see the output files created by MediaConvert. Locate the HLS Manifest, the file with the .m3u8 extension, then replace the S3 domain with the Output URL of the content.

The format of the playable URL will be the Output URL for content + /name of the asset/ + name of the asset.m3u8
Example: https://someid.cloudfront.net/BigBuckBunny/BigBuckBunny.m3u8

### 5. Add JWT token authentication to your Amazon CloudFront distribution.

*a. Install the dependencies of Lambda@Edge JWT authentication*

```
  cd amplify/backend/function/jwtauth/src/
```

*b. Edit the index.js function file and add your Cognito User Pool attributes*

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

Add the Region of the deployment (Cognito region) to the var 

```javascript
  config.REGION = 'us-east-1'
```

Copy the *Pool Id *information and replace in the var USERPOOLID

```javascript
  config.USERPOOLID = 'us-east-1_SomeID';
```

*c. Download and store the corresponding public JSON Web Key (JWK) for your user pool. It is available as part of a JSON.*
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

6. *Deploy to Lambda@Edge*

Now that we have pushed the function to check the JWT Token to the cloud, you have to deploy it to your distribution, which has been created at step 5.

*a. Go to the* *CloudFront console* (https://console.aws.amazon.com/cloudfront/)*, and get the distribution ARN created at step 5*
<img src="/doc/cloudfrontARN.png" alt="cloudfront arn" />


*b. Go to Lambda console (https://console.aws.amazon.com/lambda), and Deploy the function to Lambda@Edge*
<img src="/doc/DeploytoEDGE.png" alt="cloudfront arn" />

Then, select **Viewer Request**
<img src="/doc/DeploytoEDGE02.png" alt="cloudfront arn" />


7. End-to-End Tests

Now open your web application and play some test content.
In the video URL field, add the full CloudFront URL of your output asset created at step 5.
<img src="/doc/SimplePlayer.png" alt="Simple Player Demo" />

8. Cleanup, removing the provisioned AWS resources.
If you need to remove the resources deployed by this sample, you can use the command below:

```
  amplify delete
```

### License Summary
This sample code is made available under a modified MIT license. See the LICENSE file.