import { NextResponse } from "next/server";
import { forgotPassword } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };

    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await forgotPassword(body.email);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request password reset";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
