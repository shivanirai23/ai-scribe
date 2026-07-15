import { NextResponse } from "next/server";
import { confirmEndUser } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
    };

    if (!body.email || !body.code) {
      return NextResponse.json({ error: "Email and confirmation code are required" }, { status: 400 });
    }

    const result = await confirmEndUser({
      email: body.email,
      code: body.code,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
