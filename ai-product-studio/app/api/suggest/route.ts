import { NextRequest } from "next/server";
import { makeClient, errorJson } from "@/lib/anthropic";
import { SUGGEST_SYSTEM } from "@/lib/prompts";
import { DEFAULT_MODEL } from "@/lib/constants";
import type { Spec } from "@/lib/types";

export const runtime = "nodejs";

const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          instruction: { type: "string" },
        },
        required: ["label", "instruction"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      spec: Spec;
      history: string[]; // 已应用的修改记录（版本标签）
      model?: string;
    };
    const client = makeClient(req.headers.get("x-aps-key"));

    const user = `产品方案：\n${JSON.stringify(body.spec)}\n\n已完成的版本与修改记录：\n${
      body.history.length ? body.history.map((h, i) => `${i + 1}. ${h}`).join("\n") : "（首个版本，暂无修改）"
    }\n\n请给出 4 个下一步迭代建议。不要与已完成的修改重复。`;

    const response = await client.messages.create({
      model: body.model || DEFAULT_MODEL,
      max_tokens: 2000,
      system: SUGGEST_SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: SUGGEST_SCHEMA as any },
      },
      messages: [{ role: "user", content: user }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("没有返回建议");
    return Response.json(JSON.parse(text.text));
  } catch (e) {
    return errorJson(e);
  }
}
