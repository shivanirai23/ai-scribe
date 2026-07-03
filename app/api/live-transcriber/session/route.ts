import { NextRequest, NextResponse } from "next/server";
import { HIKIGAI_BACKEND_URL_DEFAULT, HikigaiClient } from "@/lib/hikigai";

const LIVE_TRANSCRIPTION_AGENT_SLUG = "live-transcription-agent";

export async function POST(request: NextRequest) {
  const apiKey = process.env.HIKIGAI_API_KEY || "";
  const projectId = process.env.HIKIGAI_PROJECT_ID || "";
  const baseUrl =
    process.env.HIKIGAI_PLATFORM_URL ||
    process.env.HIKIGAI_BACKEND_URL ||
    HIKIGAI_BACKEND_URL_DEFAULT;

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "Missing HIKIGAI_API_KEY or HIKIGAI_PROJECT_ID in environment" },
      { status: 500 }
    );
  }

  let body: { session_id?: string; user_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const sessionId = body.session_id || crypto.randomUUID();
  const userId = body.user_id || "ai-scribe-browser";

  try {
    const client = new HikigaiClient(apiKey, projectId, baseUrl);
    const { token } = await client.ensureAuthToken();

    const response = await fetch(
      `${baseUrl}/api/v1/agents/${encodeURIComponent(LIVE_TRANSCRIPTION_AGENT_SLUG)}/live/session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Project-ID": projectId,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[live-transcriber/session] mint failed", {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: `Live session mint failed (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const sessionInfo = await response.json();
    return NextResponse.json({
      ...sessionInfo,
      session_id: sessionInfo.session_id || sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mint live session";
    console.error("[live-transcriber/session]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
