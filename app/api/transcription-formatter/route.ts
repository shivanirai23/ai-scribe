import { NextRequest, NextResponse } from "next/server";
import { hikigai } from "@/lib/hikigai";

export async function POST(request: NextRequest) {
  try {
    const { message } = (await request.json()) as { message?: string };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await hikigai.invokeAgent("hikigai-transcription-agent", {
      transcription: message,
    });
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
