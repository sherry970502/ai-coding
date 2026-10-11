import { NextRequest } from "next/server";
import { makeClient, errorJson } from "@/lib/anthropic";
import { QA_SYSTEM } from "@/lib/prompts";
import { DEFAULT_MODEL } from "@/lib/constants";
import type { Spec } from "@/lib/types";

export const runtime = "nodejs";

const QA_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          fix: { type: "string" },
        },
        required: ["title", "detail", "severity", "fix"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "issues"],
  additionalProperties: false,
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { html: string; spec: Spec; model?: string };
    const client = makeClient(req.headers.get("x-aps-key"));

    const user = `产品方案（验收标准的背景）：\n${JSON.stringify({
      productName: body.spec.productName,
      tagline: body.spec.tagline,
      modules: body.spec.modules,
    })}\n\n待验收的完整 HTML：\n${body.html}\n\n请输出体检报告。`;

    const response = await client.messages.create({
      model: body.model || DEFAULT_MODEL,
      max_tokens: 4000,
      system: QA_SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: QA_SCHEMA as any },
      },
      messages: [{ role: "user", content: user }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("没有返回体检结果");
    return Response.json(JSON.parse(text.text));
  } catch (e) {
    return errorJson(e);
  }
}
