import { NextResponse } from "next/server";
import { hikigai } from "@/lib/hikigai";

export async function POST() {
  try {
    await hikigai.ensureAuthToken();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch auth token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}