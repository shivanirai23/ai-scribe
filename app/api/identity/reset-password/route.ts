import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      new_password?: string;
    };

    if (!body.email || !body.code || !body.new_password) {
      return NextResponse.json(
        { error: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    const result = await resetPassword({
      email: body.email,
      code: body.code,
      new_password: body.new_password,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
