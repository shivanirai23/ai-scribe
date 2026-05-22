import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message } = (await request.json()) as { message?: string };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.HIKIGAI_BASE_URL;
    const projectId = process.env.HIKIGAI_PROJECT_ID;
    const apiKey = process.env.HIKIGAI_API_KEY;

    if (!baseUrl || !projectId || !apiKey) {
      return NextResponse.json(
        { error: "Missing Hikigai configuration" },
        { status: 500 }
      );
    }

      // Step 1: Exchange API key for auth token
      const authUrl = `${baseUrl}/api/v1/auth/exchange`;
      const authResponse = await fetch(authUrl, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!authResponse.ok) {
        const authError = await authResponse.text();
        console.error("[transcription-formatter] Auth exchange error:", authError);
        return NextResponse.json(
          { error: `Auth token exchange failed: ${authResponse.statusText}` },
          { status: authResponse.status }
        );
      }

      const authData = await authResponse.json();
      const authToken =
        authData?.auth_token ||
        authData?.access_token ||
        authData?.token ||
        authData?.data?.access_token;

      if (!authToken || typeof authToken !== "string") {
        console.error("[transcription-formatter] No auth token in response:", authData);
        return NextResponse.json(
          { error: "Failed to obtain auth token" },
          { status: 500 }
        );
      }

      // Step 2: Invoke the agent with the auth token
      const response = await fetch(`${baseUrl}/api/v1/agents/hikigai-transcription-agent/invoke`, {
      method: "POST",
      headers: {
          "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId,
          input: {
          transcription: message,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[transcription-formatter] Agent error:", errorData);
      return NextResponse.json(
        { error: `Transcription formatter failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log("[transcription-formatter] raw invoke output:", JSON.stringify(result));

    // Extract the formatted transcription from the agent output
    const formattedTranscription = result.output?.transcription || result.content || message;

    return NextResponse.json({
      transcription: formattedTranscription,
      raw: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[transcription-formatter] Error:", errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
