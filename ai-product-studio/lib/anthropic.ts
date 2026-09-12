import Anthropic from "@anthropic-ai/sdk";
import { ERROR_MARK } from "./constants";

/**
 * 创建 Anthropic 客户端。
 * 优先使用请求头里的 x-aps-key（用户在设置里填写的 Key），
 * 否则回落到服务器环境变量 ANTHROPIC_API_KEY。
 */
export function makeClient(headerKey: string | null): Anthropic {
  const apiKey = headerKey?.trim();
  if (apiKey) return new Anthropic({ apiKey });
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    // 交给 SDK 从环境解析凭证
    return new Anthropic();
  }
  throw new Error(
    "缺少 API Key：请点击右上角「设置」填写 Anthropic API Key，或在服务器上配置 ANTHROPIC_API_KEY 环境变量。"
  );
}

/** 把 SDK 的消息流转成纯文本 HTTP 流；出错时写入错误标记，客户端据此报错。 */
export function streamToResponse(stream: AsyncIterable<any>): Response {
  const encoder = new TextEncoder();
  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(`${ERROR_MARK}${e?.message ?? "生成失败，请重试"}`)
        );
      }
      controller.close();
    },
  });
  return new Response(rs, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export function errorJson(e: unknown, status = 500): Response {
  const message = e instanceof Error ? e.message : "请求失败";
  return Response.json({ error: message }, { status });
}
