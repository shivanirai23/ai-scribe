import { NextResponse } from "next/server";
import { toUserFacingApiError } from "@/lib/api-errors";
import { HIKIGAI_AGENT_TIMEOUT_MS, hikigai } from "@/lib/hikigai";

export const maxDuration = 300;

interface Cpt2Request {
  message?: string;
}

type Cpt2CodeItem = {
  cpt2_code: string;
  description: string;
};

function normalizeCpt2Codes(payload: unknown): Cpt2CodeItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as {
    codes?: unknown;
    output?: {
      codes?: unknown;
    };
    data?: {
      codes?: unknown;
    };
  };

  const codes = data.codes ?? data.output?.codes ?? data.data?.codes;

  if (!Array.isArray(codes)) {
    return [];
  }

  return codes
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as {
        cpt2_code?: unknown;
        description?: unknown;
      };

      const cpt2_code = typeof item.cpt2_code === "string" ? item.cpt2_code : "";
      const description = typeof item.description === "string" ? item.description : "";

      if (!cpt2_code || !description) {
        return null;
      }

      return {
        cpt2_code,
        description,
      };
    })
    .filter((item): item is Cpt2CodeItem => item !== null);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Cpt2Request;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agentResponse = await hikigai.invokeAgent("cpt2-code-agent", { message }, HIKIGAI_AGENT_TIMEOUT_MS);
    // console.log("[cpt2-code-agent] raw invoke output:", JSON.stringify(agentResponse));

    const codes = normalizeCpt2Codes(agentResponse);
    return NextResponse.json({ codes }, { status: 200 });
  } catch (error) {
    console.error("[cpt2-code-agent] error:", error);
    return NextResponse.json(
      {
        error: toUserFacingApiError(
          error,
          "Failed to generate CPT-2 codes. Please try again."
        ),
      },
      { status: 500 }
    );
  }
}
