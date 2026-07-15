import { NextResponse } from "next/server";
import {
  type DiagnosisFeedbackType,
  writeDiagnosisFeedback,
} from "@/lib/bigquery-mcp";

const FEEDBACK_TYPES = new Set<DiagnosisFeedbackType>([
  "soap",
  "visit_notes",
  "labtest",
  "followup",
  "procedure",
  "medication",
  "vaccine",
  "referral",
  "icd_codes",
  "em_codes",
  "cpt2_codes",
]);

interface DiagnosisFeedbackRequest {
  visit_id?: string;
  session_id?: string;
  feedback_type?: DiagnosisFeedbackType;
  rating?: number;
  notes?: string;
  response?: string[];
  doctor_id?: string;
  doctor_name?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DiagnosisFeedbackRequest;

    if (!body.feedback_type || !FEEDBACK_TYPES.has(body.feedback_type)) {
      return NextResponse.json({ error: "Invalid feedback_type" }, { status: 400 });
    }

    if (body.rating !== 0 && body.rating !== 1) {
      return NextResponse.json({ error: "rating must be 0 or 1" }, { status: 400 });
    }

    const visitId = body.visit_id?.trim();
    const sessionId = body.session_id?.trim();

    if (!visitId) {
      return NextResponse.json({ error: "visit_id is required" }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const result = await writeDiagnosisFeedback({
      visit_id: visitId,
      session_id: sessionId,
      feedback_type: body.feedback_type,
      rating: body.rating,
      notes: body.notes ?? "",
      response: Array.isArray(body.response) ? body.response : [],
      doctor_id: body.doctor_id?.trim() || "unknown",
      doctor_name: body.doctor_name?.trim() || "",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit diagnosis feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
