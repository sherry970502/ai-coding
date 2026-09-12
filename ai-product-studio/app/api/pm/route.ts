import { NextRequest } from "next/server";
import { makeClient, streamToResponse, errorJson } from "@/lib/anthropic";
import { PM_SYSTEM } from "@/lib/prompts";
import { DEFAULT_MODEL } from "@/lib/constants";
import type { ChatMessage, Spec } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages: ChatMessage[];
      spec?: Spec | null;
      model?: string;
    };
    const client = makeClient(req.headers.get("x-aps-key"));

    let system = PM_SYSTEM;
    if (body.spec) {
      system += `\n\n## 当前已确认的方案（用户可能基于它提出修改）\n${JSON.stringify(
        body.spec
      )}`;
    }

    const stream = client.messages.stream({
      model: body.model || DEFAULT_MODEL,
      max_tokens: 8000,
      system,
      messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return streamToResponse(stream);
  } catch (e) {
    return errorJson(e, 400);
  }
}
