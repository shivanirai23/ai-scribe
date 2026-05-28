import { Amplify } from "aws-amplify";

const DEFAULT_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
const DEFAULT_USER_POOL_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";

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
