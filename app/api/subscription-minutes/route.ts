import { NextResponse } from "next/server";
import {
  deductSubscriptionMinutes,
  getSubscriptionMinutesLeft,
} from "@/lib/bigquery-mcp";

interface DeductMinutesRequest {
  doctor_id?: string;
  doctor_name?: string;
  consumed_minutes?: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctor_id")?.trim();
    const doctorName = searchParams.get("doctor_name")?.trim() || "";

    if (!doctorId) {
      return NextResponse.json({ error: "doctor_id is required" }, { status: 400 });
    }

    const result = await getSubscriptionMinutesLeft({
      doctor_id: doctorId,
      doctor_name: doctorName,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch subscription minutes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeductMinutesRequest;
    const doctorId = body.doctor_id?.trim();
    const consumedMinutes = body.consumed_minutes;

    if (!doctorId) {
      return NextResponse.json({ error: "doctor_id is required" }, { status: 400 });
    }

    if (typeof consumedMinutes !== "number" || !Number.isFinite(consumedMinutes) || consumedMinutes < 0) {
      return NextResponse.json(
        { error: "consumed_minutes must be a non-negative number" },
        { status: 400 }
      );
    }

    const result = await deductSubscriptionMinutes({
      doctor_id: doctorId,
      consumed_minutes: consumedMinutes,
      doctor_name: body.doctor_name?.trim() || "",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to deduct subscription minutes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
