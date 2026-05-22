import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HIKIGAI_API_KEY || "";
  const projectId = process.env.HIKIGAI_PROJECT_ID || "";
  const baseUrl =
    process.env.HIKIGAI_BASE_URL ||
    "http://hikigai-alb-1665592634.us-east-2.elb.amazonaws.com";

  if (!apiKey || !projectId) {
    return NextResponse.json(
      {
        error: "Missing HIKIGAI_API_KEY or HIKIGAI_PROJECT_ID in environment",
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
    },
    { status: 200 }
  );
}
