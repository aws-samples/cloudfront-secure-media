// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Configures Amplify Auth from the runtime config instead of a generated
// aws-exports.js. Only the *source* of the Cognito IDs changed — login UI and
// session retrieval still come from Amplify.
import { Amplify } from "aws-amplify";

export function configureAmplify(cfg) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: cfg.cognito.userPoolId,
        userPoolClientId: cfg.cognito.userPoolClientId,
        loginWith: {
          email: true,
        },
        signUpVerificationMethod: "code",
        userAttributes: {
          email: {
            required: true,
          },
        },
      },
    },
  });
}
