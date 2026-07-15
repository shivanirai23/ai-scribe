import { NextResponse } from "next/server";
import { refreshEndUser } from "@/lib/auth/identity";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      refresh_token?: string;
    };

    if (!body.refresh_token) {
      return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
    }

    const result = await refreshEndUser(body.refresh_token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token refresh failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
