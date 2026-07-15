import { NextResponse } from "next/server";
import { loginEndUser } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await loginEndUser({
      email: body.email,
      password: body.password,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
