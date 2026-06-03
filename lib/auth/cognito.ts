import { Amplify } from "aws-amplify";

const DEFAULT_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "ap-southeast-2_u5nE1Hebd";
const DEFAULT_USER_POOL_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "4vvhfub3j5453moo5abnr0ppfi";

let isConfigured = false;

export const cognitoConfig = {
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? DEFAULT_USER_POOL_ID,
  userPoolClientId:
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? DEFAULT_USER_POOL_CLIENT_ID,
};

export function configureCognitoAuth() {
  if (isConfigured) {
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: cognitoConfig.userPoolId,
        userPoolClientId: cognitoConfig.userPoolClientId,
      },
    },
  });

  isConfigured = true;
}
