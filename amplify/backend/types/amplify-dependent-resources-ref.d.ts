export type AmplifyDependentResourcesAttributes = {
    "auth": {
        "playerjwtcognito5d5d2eb2": {
            "IdentityPoolId": "string",
            "IdentityPoolName": "string",
            "UserPoolId": "string",
            "UserPoolArn": "string",
            "UserPoolName": "string",
            "AppClientIDWeb": "string",
            "AppClientID": "string"
        }
    },
    "function": {
        "jwtauth": {
            "Name": "string",
            "Arn": "string",
            "Region": "string",
            "LambdaExecutionRole": "string"
        },
        "getjwttoken": {
            "Name": "string",
            "Arn": "string",
            "Region": "string",
            "LambdaExecutionRole": "string"
        }
    },
    "api": {
        "getToken": {
            "RootUrl": "string",
            "ApiName": "string",
            "ApiId": "string"
        }
    }
}