# Secure your Media Workloads with JWT Token with CloudFront Functions

Video streaming is no longer exclusively done by media companies. Schools, ecommerce retailers, tech companies, and banks are creating media content to distribute directly to their consumers. Video streaming, both live and on-demand, has become the prevailing communication tool to reach the target audiences. As the value and number of media assets grow, creating a secure distribution workflow to ensure that only the intended audiences have access.

## Architecture overview

<img src="/doc/architecture.png" alt="Architecture" />

## Solution components
In this post, we walk through the implementation of the component in the web APP (GitHub repository). We also go through the cloud components for authentication, token validation, and CDN caching.

The frontend and backend AWS resources are built using [AWS Amplify](https://docs.amplify.aws/), an end-to-end solution that enables mobile and front-end web developers to build and deploy secure, scalable full-stack applications. With Amplify, you can configure app backends in minutes, connect them to your app in just a few lines of code, and deploy static web apps in three steps.

The web app is built in React and uses Video.JS as the video player.

After successful authentication, [Amazon Cognito](https://aws.amazon.com/cognito/) returns user pool tokens to your application. Then, you can use the token to grant access to the backend resources. In the proposed architecture, the token is used for signing the requests for media stream content, Lambda@Edge function decode and validate the token attributes, authenticating the spectator to watch the content.


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

```sh
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
```sh
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

### 6. Add JWT token authentication to your Amazon CloudFront distribution.

This step has been astracted by Amaplify Hooks, by creating a before push script.
If you need to configure manually [follow this guide](/Cognito_MANUAL.md)

### 7. *Deploy to Lambda@Edge*

Now that we have pushed the function to check the JWT Token to the cloud, you have to deploy it to your distribution, which has been created at step 5.

*a. Go to the* *CloudFront console* (https://console.aws.amazon.com/cloudfront/)*, and get the distribution ARN created at step 5*
<img src="/doc/cloudfrontARN.png" alt="cloudfront arn" />


*b. Go to Lambda console (https://console.aws.amazon.com/lambda), and Deploy the function to Lambda@Edge*
<img src="/doc/DeploytoEDGE.png" alt="cloudfront arn" />

Then, select **Viewer Request**
<img src="/doc/DeploytoEDGE02.png" alt="cloudfront arn" />


### 8. End-to-End Tests

Now open your web application and play some test content.
In the video URL field, add the full CloudFront URL of your output asset created at step 5.
<img src="/doc/SimplePlayer.png" alt="Simple Player Demo" />

### 9. Cleanup, removing the provisioned AWS resources.  **[ Optional ]**
If you need to remove the resources deployed by this sample, you can use the command below:

```sh
  amplify delete
```

### License Summary
This sample code is made available under a modified MIT-0 [LICENSE](LICENSE)