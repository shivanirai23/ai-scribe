import { NextResponse } from "next/server";
import { changePassword } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      access_token?: string;
      current_password?: string;
      new_password?: string;
    };

    if (!body.access_token || !body.current_password || !body.new_password) {
      return NextResponse.json(
        { error: "Access token, current password, and new password are required" },
        { status: 400 }
      );
    }

    const result = await changePassword({
      access_token: body.access_token,
      current_password: body.current_password,
      new_password: body.new_password,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to change password";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
