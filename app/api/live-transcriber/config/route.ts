import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PROJECT_ID = "a060ee0a-4be3-4fcc-84df-84f0be2a3197";
const DEFAULT_PLATFORM_URL = "http://hikigai-alb-1665592634.us-east-2.elb.amazonaws.com";

export async function GET(request: NextRequest) {
  const apiKey = process.env.HIKIGAI_API_KEY || "";
  const projectIdFromEnv = process.env.HIKIGAI_PROJECT_ID;
  const platformUrlFromEnv = process.env.HIKIGAI_PLATFORM_URL;
  const projectId = projectIdFromEnv || DEFAULT_PROJECT_ID;
  const baseUrl = platformUrlFromEnv || DEFAULT_PLATFORM_URL;

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
      platformUrl: !platformUrlFromEnv,
    },
    hasApiKey: Boolean(apiKey),
  };

  console.info("[live-transcriber/config] request diagnostics", diagnostics);

  if (!platformUrlFromEnv) {
    console.warn(
      "[live-transcriber/config] HIKIGAI_PLATFORM_URL missing, using fallback value",
      { fallback: DEFAULT_PLATFORM_URL }
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
      agentName: "live-transcriber",
      diagnostics,
    },
    { status: 200 }
  );
}
