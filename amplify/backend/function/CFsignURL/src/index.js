'use strict';
// load the AWS SDK
const AWS = require('aws-sdk')


exports.handler = async (event, context) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    const clientIP = request.clientIp;
    console.log('SourceIP =', clientIP);
    console.log('headers =', headers);
    
  

var pivKEY = '-----BEGIN RSA PRIVATE KEY-----' + '\n' + 
'MIIEowIBAAKCAQEAjLF+IyWB+HaEYqJov94vn5sX9yeiTPQBd3MnR1LALxQb2+8F' + '\n' + 
'MwKpW0KJgTbokpeFDOU61BT5urEwUfOsfKcXRHBKyuiTz47hatV9zefNmKRdlUQv' + '\n' + 
'ZPIUISJxbf3sgpd5J2hLzB2rJx92bVaTy6YhgzmA2YIvrjMJD1llHhYU7Zb4Q8J8' + '\n' + 
'ZeD8SgJAXcOQJzJedCq+IYIjQFQbwSiOkC3QMaQ4CWibWagb7CAzOHgXjGFsUGLj' + '\n' + 
'Y5nJIp5VHpM/DNistjnPKpqxvF9geGXf8QoBY98Dr/Wi8PRaoQjo05K3EhV3+CXX' + '\n' + 
'WnaSlIUZCDNtThhQd0o1dPXtEgegfRVqcXzjrwIDAQABAoIBAHm3zMKnXmwQTLPw' + '\n' + 
'geMMW/MfAHrIhTdCGkq3CxI/WxjfssJxZPQep1nWlJN/Z3H7OBZR8rUseGi1hnI/' + '\n' + 
'98fX3t9Mrsggsk/s8sO0c6RBmLMn7/aFCOOyMwv/elaISacpWJ1pM7ohKMMuCwzI' + '\n' + 
'zBBxZ6jZhMmoQYvZh0sKMdr3i5+HpiO8f14s3fzuoGns5JZfERUPY+nn//LmHDUp' + '\n' + 
'pRsUznwXtaerUsx6/OPt3nnNayw/hOVTkgEXmOEP37SqRTTN1wdNT/+KFhbhSF1d' + '\n' + 
'eSuWe7KMo6z/RJrtPd/lEfJCVmWkfGqjkGikcTaQTyLkuCypvPreN5YBQSfEB9AQ' + '\n' + 
'9gKS+RECgYEAxN+agUeAw3jyh4+XA48UUoguxWx9zm7K7bEHDv2TP6xSRcFeeH8c' + '\n' + 
'WY8aCjV437s71UVpdYi57XJHeMj8P5H0g/5PG0Ikwq0n5qcvXTlCCH/HgvQq3Pcy' + '\n' + 
'Qf5K1yrj4L+RBHQ3fcLgkXC0VBO4vaSukyTH9RgGf6PJr0AeVMzZ+ZMCgYEAtvKL' + '\n' + 
'B4FULw5IuV8tO7HvwnyhJj21f1jfahBI9/PMG1JMS2nMqi7Dc7I/pTBY+93G8DH5' + '\n' + 
'XnJATUl7E+eFBOujjEpXcuUjHA2Vxg6g9RdE5ECIkfurDTubmwBD2DYPYI7qxfdI' + '\n' + 
'wbFISAOiODG7gDgnyKlf+GiZPv4CDicZbSq5DvUCgYA0GG9MEl2yXAjhck+ls3DP' + '\n' + 
'PhYSS9kmjQ7JwvR5NQSH7tN+feK/w/L+h+1+EhRAL81vbASyA1If0QO0pIqLT9YC' + '\n' + 
'L4NDVUdg9G0AjfDsnEAq+5URxAarngYAjIfFVCYkzMxU/2PHtY+zLL2rGeTi2fcQ' + '\n' + 
'HMWEx6zAjdjKtQ7RpbtwXQKBgQCEcu5yvZAMDURbaGugFz+kx4QH4o8/JkGBUU7y' + '\n' + 
'rH+tnBR+WJeC8h4w6fCoEGur1TFM/nEyjna9PaCslWY5XLvoOn47QWb8zV0MqdSf' + '\n' + 
'/Hu04H+/aLu69de/DR8RLnpNhsq0DkaPbGEPOgo8ssyzlHRBE1bWyiuAbndgdbAz' + '\n' + 
'18Vo7QKBgH6ziusN0d5DFajVvlThf5Nu36DtjI5ml1eWS50NAH2IGaKgLJnKo934' + '\n' + 
'kvZp647ljcMLEcVNpaxg6+BBLOgLpEAz9qoI9v1BbGq+uTW1YUvcZKM6slpc9uTF' + '\n' + 
'uCo/EtkLeNtcIYwkdsHUH5pkO+5hxqXN4Ao4gq0Kc/jAQEUYDclX' + '\n' + 
'-----END RSA PRIVATE KEY-----';


//cookie policy
const policy = JSON.stringify({
  Statement: [
    {
      Resource: 'http*://d3kjupj76hs2nw.cloudfront.net/*', // http* => http and https
      Condition: {
        IpAddress:{
           'AWS:SourceIp': '177.72.241.17/32' 
        },
        DateLessThan: {
          'AWS:EpochTime':
            Math.floor(new Date().getTime() / 1000) + 60 * 60 * 1, // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
        },
      },
    },
  ],
});

//url policy
const URLPolicy = JSON.stringify({
  Statement: [
    {
      Resource: "https://d3kjupj76hs2nw.cloudfront.net/index.html", // http* => http and https
      Condition: {
        IpAddress:{
           'AWS:SourceIp': '177.72.241.17/32' 
        },
        DateLessThan: {
          'AWS:EpochTime': '1606514603', // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
        },
      },
    },
  ],
});


const cloudfrontAccessKeyId = process.env.CF_ACCESS_KEY_ID
const cloudFrontPrivateKey = pivKEY

const signer = new AWS.CloudFront.Signer(cloudfrontAccessKeyId, cloudFrontPrivateKey)

// in milesecs
const expire = 1*24*60*60*1000 

const signedUrl = signer.getSignedUrl({
  url: 'https://d3kjupj76hs2nw.cloudfront.net/index.html',
  expires: Math.floor((Date.now() + expire)/1000), // Unix UTC timestamp for now + 2 days
})




const urlSign = signer.getSignedUrl({
  url: 'https://d3kjupj76hs2nw.cloudfront.net/index.html',
  //expires: Math.floor((Date.now() + expire)/1000), // Unix UTC timestamp for now + 2 days
  policy,
})

const cookie = signer.getSignedCookie({
    //expires: Math.floor((Date.now() + expire)/1000), // Unix UTC timestamp for now + 2 days
    policy,
});

console.log("response cookie was", cookie)
console.log("response url was", urlSign)

const response = {
    statusCode: 200,
    body: JSON.stringify(signedUrl),
    headers: {
      'Access-Control-Allow-Origin':'*',
    },
  };
  console.log("response was", response)
  
  return response;
};