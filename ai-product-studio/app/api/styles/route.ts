import { NextRequest } from "next/server";
import { makeClient, errorJson } from "@/lib/anthropic";
import { DESIGNER_SYSTEM } from "@/lib/prompts";
import { DEFAULT_MODEL } from "@/lib/constants";
import type { Spec } from "@/lib/types";

export const runtime = "nodejs";

const STYLES_SCHEMA = {
  type: "object",
  properties: {
    styles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          mood: { type: "string" },
          palette: {
            type: "object",
            properties: {
              bg: { type: "string" },
              surface: { type: "string" },
              primary: { type: "string" },
              accent: { type: "string" },
              text: { type: "string" },
            },
            required: ["bg", "surface", "primary", "accent", "text"],
            additionalProperties: false,
          },
          fonts: {
            type: "object",
            properties: {
              heading: { type: "string" },
              body: { type: "string" },
            },
            required: ["heading", "body"],
            additionalProperties: false,
          },
          radius: { type: "string", enum: ["sharp", "soft", "round"] },
        },
        required: [
          "id",
          "name",
          "description",
          "mood",
          "palette",
          "fonts",
          "radius",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["styles"],
  additionalProperties: false,
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      spec: Spec;
      tweak?: string;
      model?: string;
    };
    const client = makeClient(req.headers.get("x-aps-key"));

    let user = `产品方案：\n${JSON.stringify(body.spec)}\n\n请给出 3 个视觉方向。`;
    if (body.tweak) {
      user += `\n\n用户对上一批方向的反馈/要求：${body.tweak}\n请据此重新给出 3 个方向。`;
    }

    const response = await client.messages.create({
      model: body.model || DEFAULT_MODEL,
      max_tokens: 4000,
      system: DESIGNER_SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: STYLES_SCHEMA as any },
      },
      messages: [{ role: "user", content: user }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("设计师没有返回内容");
    return Response.json(JSON.parse(text.text));
  } catch (e) {
    return errorJson(e);
  }
}
