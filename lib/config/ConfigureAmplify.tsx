"use client";

import { useEffect } from "react";
import { configureCognitoAuth } from "@/lib/auth/cognito";

export function ConfigureAmplify() {
  useEffect(() => {
    configureCognitoAuth();
  }, []);

  return null;
}
