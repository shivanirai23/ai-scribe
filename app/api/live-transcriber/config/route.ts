import { NextRequest, NextResponse } from "next/server";
import { HIKIGAI_BACKEND_URL_DEFAULT } from "@/lib/hikigai";

const DEFAULT_PROJECT_ID = "a060ee0a-4be3-4fcc-84df-84f0be2a3197";
const LIVE_TRANSCRIBER_AGENT_SLUG = "live-transcriber-agent";

export async function GET(request: NextRequest) {
  const apiKey = process.env.HIKIGAI_API_KEY || "";
  const projectIdFromEnv = process.env.HIKIGAI_PROJECT_ID;
  const backendUrlFromEnv = process.env.HIKIGAI_BACKEND_URL;
  const projectId = projectIdFromEnv || DEFAULT_PROJECT_ID;
  const baseUrl = backendUrlFromEnv || HIKIGAI_BACKEND_URL_DEFAULT;

  const referer = request.headers.get("referer") || "";
  let refererPath = "";
  try {
    refererPath = referer ? new URL(referer).pathname : "";
  } catch {
    refererPath = "";
  }

  const diagnostics = {
    requestPath: request.nextUrl.pathname,
    refererPath,
    host: request.headers.get("host"),
    basepathEnv: process.env.BASEPATH || null,
    usingFallbacks: {
      projectId: !projectIdFromEnv,
      backendUrl: !backendUrlFromEnv,
    },
    hasApiKey: Boolean(apiKey),
  };

  console.info("[live-transcriber/config] request diagnostics", diagnostics);

  if (!backendUrlFromEnv) {
    console.warn(
      "[live-transcriber/config] HIKIGAI_BACKEND_URL missing, using fallback value",
      { fallback: HIKIGAI_BACKEND_URL_DEFAULT }
    );
  }

  if (!projectIdFromEnv) {
    console.warn(
      "[live-transcriber/config] HIKIGAI_PROJECT_ID missing, using fallback value",
      { fallback: DEFAULT_PROJECT_ID }
    );
  }

  if (!apiKey || !projectId) {
    console.error("[live-transcriber/config] required env missing", {
      hasApiKey: Boolean(apiKey),
      hasProjectId: Boolean(projectId),
    });
    return NextResponse.json(
      {
        error: "Missing HIKIGAI_API_KEY or HIKIGAI_PROJECT_ID in environment",
        diagnostics,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      baseUrl,
      apiKey,
      projectId,
      agentName: LIVE_TRANSCRIBER_AGENT_SLUG,
      diagnostics,
    },
    { status: 200 }
  );
}
