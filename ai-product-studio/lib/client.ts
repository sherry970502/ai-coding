import { ERROR_MARK } from "./constants";
import type { Spec } from "./types";

/** 流式请求纯文本接口；onDelta 收到的是"到目前为止的完整文本"。 */
export async function streamText(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  onDelta?: (full: string) => void
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `请求失败（${res.status}）`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const errIdx = full.indexOf(ERROR_MARK);
    if (errIdx >= 0) {
      throw new Error(full.slice(errIdx + ERROR_MARK.length).trim() || "生成中断，请重试");
    }
    onDelta?.(full);
  }
  return full;
}

export async function postJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `请求失败（${res.status}）`);
  return data as T;
}

/** 从 PM 回复中解析 <proposal>JSON</proposal>。 */
export function parseProposal(text: string): Spec | null {
  const match = text.match(/<proposal>([\s\S]*?)<\/proposal>/);
  if (!match) return null;
  let raw = match[1].trim();
  // 容错：模型偶尔会在标签内再包一层代码块
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const spec = JSON.parse(raw) as Spec;
    if (!spec.productName || !Array.isArray(spec.modules)) return null;
    if (!Array.isArray(spec.checklist)) spec.checklist = [];
    if (!Array.isArray(spec.scenarios)) spec.scenarios = [];
    return spec;
  } catch {
    return null;
  }
}

/** 展示用：去掉 proposal 标签块（方案改由卡片呈现）。 */
export function stripProposal(text: string): string {
  return text
    .replace(/<proposal>[\s\S]*?<\/proposal>/g, "")
    .replace(/<proposal>[\s\S]*$/g, "") // 流式过程中标签尚未闭合
    .trim();
}

/** 从模型输出中提取 HTML 文档（剥掉可能的代码块围栏或多余文字）。 */
export function extractHtml(text: string): string | null {
  const start = text.search(/<!DOCTYPE html/i);
  const altStart = start < 0 ? text.search(/<html[\s>]/i) : start;
  if (altStart < 0) return null;
  const end = text.lastIndexOf("</html>");
  const html = end >= 0 ? text.slice(altStart, end + "</html>".length) : text.slice(altStart);
  return html.trim() || null;
}

/** 纯文字修改：仅当旧文字在源码中唯一出现时本地替换，否则返回 null（交给 AI）。 */
export function replaceTextOnce(html: string, oldText: string, newText: string): string | null {
  const trimmed = oldText.trim();
  if (!trimmed) return null;
  const first = html.indexOf(trimmed);
  if (first < 0) return null;
  const second = html.indexOf(trimmed, first + 1);
  if (second >= 0) return null;
  return html.slice(0, first) + newText + html.slice(first + trimmed.length);
}
