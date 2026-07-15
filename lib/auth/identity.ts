import { HIKIGAI_BACKEND_URL_DEFAULT } from "@/lib/hikigai";

const USER_AGENT = "hikigai-sdk/0.0.1";

export type IdentitySignupResult = {
  user_sub: string | null;
  user_id: string;
  email: string;
  confirmed: boolean;
};

export type IdentityLoginSuccess = {
  status: "authenticated";
  id_token: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user_sub?: string;
  user_id?: string;
};

export type IdentityLoginChallenge = {
  status: "challenge";
  challenge_name: string;
  session: string;
};

export type IdentityLoginResult = IdentityLoginSuccess | IdentityLoginChallenge;

export type IdentityRefreshResult = {
  status: "authenticated";
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export type IdentityAppConfig = {
  app_id: string;
  project_id: string;
  mode: string;
  status: string;
  cognito_pool_id: string | null;
  cognito_client_id: string | null;
  cognito_region: string | null;
  enabled_methods: string[];
  error_message: string | null;
};

function getBackendUrl() {
  return process.env.HIKIGAI_BACKEND_URL || HIKIGAI_BACKEND_URL_DEFAULT;
}

function getApiKey() {
  const apiKey = process.env.HIKIGAI_API_KEY || "";
  if (!apiKey) {
    throw new Error("Missing HIKIGAI_API_KEY");
  }
  return apiKey;
}

function getProjectId() {
  const projectId = process.env.HIKIGAI_PROJECT_ID || "";
  if (!projectId) {
    throw new Error("Missing HIKIGAI_PROJECT_ID");
  }
  return projectId;
}

export function getAppId() {
  const appId = process.env.HIKIGAI_APP_ID || "";
  if (!appId) {
    throw new Error("Missing HIKIGAI_APP_ID");
  }
  return appId;
}

function identityHeaders(contentType = false): HeadersInit {
  const headers: Record<string, string> = {
    "X-API-Key": getApiKey(),
    "X-Project-ID": getProjectId(),
    "User-Agent": USER_AGENT,
  };
  if (contentType) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const data = JSON.parse(text) as {
      detail?: string | { msg?: string }[];
      message?: string;
      error?: string;
      error_message?: string;
    };

    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
    if (typeof data.message === "string") {
      return data.message;
    }
    if (typeof data.error === "string") {
      return data.error;
    }
    if (typeof data.error_message === "string") {
      return data.error_message;
    }
  } catch {
    // return raw text below
  }

  return text;
}

async function identityFetch<T>(
  path: string,
  init: RequestInit,
  fallbackError: string
): Promise<T> {
  const response = await fetch(`${getBackendUrl()}${path}`, init);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallbackError));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getIdentityConfig(): Promise<IdentityAppConfig> {
  return identityFetch<IdentityAppConfig>(
    `/api/v1/identity/apps/${getAppId()}`,
    {
      method: "GET",
      headers: identityHeaders(),
    },
    "Failed to fetch identity config"
  );
}

export async function signupEndUser(input: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  attributes?: Record<string, string>;
}): Promise<IdentitySignupResult> {
  return identityFetch<IdentitySignupResult>(
    "/api/v1/identity/signup",
    {
      method: "POST",
      headers: identityHeaders(true),
      body: JSON.stringify({
        app_id: getAppId(),
        ...input,
      }),
    },
    "Sign up failed"
  );
}

export async function confirmEndUser(input: {
  email: string;
  code: string;
}): Promise<{ success: boolean; message: string }> {
  return identityFetch(
    "/api/v1/identity/confirm",
    {
      method: "POST",
      headers: identityHeaders(true),
      body: JSON.stringify({
        app_id: getAppId(),
        ...input,
      }),
    },
    "Confirmation failed"
  );
}

export async function loginEndUser(input: {
  email: string;
  password: string;
}): Promise<IdentityLoginResult> {
  return identityFetch<IdentityLoginResult>(
    "/api/v1/identity/login",
    {
      method: "POST",
      headers: identityHeaders(true),
      body: JSON.stringify({
        app_id: getAppId(),
        ...input,
      }),
    },
    "Sign in failed"
  );
}

export async function refreshEndUser(refreshToken: string): Promise<IdentityRefreshResult> {
  return identityFetch<IdentityRefreshResult>(
    "/api/v1/identity/refresh",
    {
      method: "POST",
      headers: identityHeaders(true),
      body: JSON.stringify({
        app_id: getAppId(),
        refresh_token: refreshToken,
      }),
    },
    "Token refresh failed"
  );
}

export async function logoutEndUser(email: string): Promise<{ success: boolean; message: string }> {
  return identityFetch(
    "/api/v1/identity/logout",
    {
      method: "POST",
      headers: identityHeaders(true),
      body: JSON.stringify({
        app_id: getAppId(),
        email,
      }),
    },
    "Logout failed"
  );
}
