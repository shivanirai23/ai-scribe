import { NextResponse } from "next/server";
import { logoutEndUser } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
    };

    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await logoutEndUser(body.email);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
