"use client";

import { configureCognitoAuth } from "@/lib/auth/cognito";

if (typeof window !== "undefined") {
  configureCognitoAuth();
}

export function ConfigureAmplify() {
  return null;
}
