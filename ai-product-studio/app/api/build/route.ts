import { NextRequest } from "next/server";
import { makeClient, streamToResponse, errorJson } from "@/lib/anthropic";
import { ENGINEER_SYSTEM } from "@/lib/prompts";
import {
  AI_SERVICE_MODELS,
  DEFAULT_MODEL,
  PLATFORM_SERVICES,
  PLATFORM_SIDE_SERVICES,
} from "@/lib/constants";
import type { SelectedElement, ServicesState, Spec, StyleOption } from "@/lib/types";

export const runtime = "nodejs";

interface BuildBody {
  mode: "build" | "revise" | "patch";
  spec: Spec;
  style: StyleOption;
  html?: string; // revise / patch 时的现有版本
  instruction?: string; // 修改要求
  element?: SelectedElement | null; // patch 时用户点选的元素
  services?: ServicesState; // 已勾选的平台服务（生成本地模拟版）
  model?: string;
}

function servicesBrief(services?: ServicesState): string {
  if (!services?.enabled) return "";
  const on = PLATFORM_SERVICES.filter(
    (s) => services.enabled[s.id] && !PLATFORM_SIDE_SERVICES.includes(s.id)
  );
  if (!on.length) return "";
  const lines = on.map((s) => {
    if (s.id === "ai") {
      const model =
        AI_SERVICE_MODELS.find((m) => m.id === services.aiModel)?.label || "交给系统";
      return `- ${s.label}（模型：${model}）`;
    }
    return `- ${s.label}`;
  });
  return `已开通的平台服务（按系统提示词的要求做本地模拟）：\n${lines.join("\n")}`;
}

function specBrief(spec: Spec): string {
  const enabled = spec.checklist
    .filter((c) => c.enabled !== false)
    .map((c) => `- ${c.label}：${c.desc}`)
    .join("\n");
  const disabled = spec.checklist
    .filter((c) => c.enabled === false)
    .map((c) => `- ${c.label}（用户明确不需要）`)
    .join("\n");
  return [
    `产品名：${spec.productName}（${spec.tagline}）`,
    `目标用户：${spec.targetUsers}`,
    `核心价值：${spec.coreValue}`,
    `使用场景：\n${spec.scenarios.map((s) => `- ${s}`).join("\n")}`,
    `功能模块：\n${spec.modules
      .map((m) => `- [${m.priority === "core" ? "必须" : "加分"}] ${m.name}：${m.desc}`)
      .join("\n")}`,
    `产品形态确认项（已开启）：\n${enabled || "（无）"}`,
    disabled ? `用户关闭的确认项：\n${disabled}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function styleBrief(style: StyleOption): string {
  const radius =
    style.radius === "sharp" ? "小圆角/直角，利落" : style.radius === "round" ? "大圆角，柔和" : "适中圆角";
  return [
    `视觉方向：${style.name}（${style.mood}）—— ${style.description}`,
    `配色：背景 ${style.palette.bg}；卡片/表面 ${style.palette.surface}；主色 ${style.palette.primary}；点缀色 ${style.palette.accent}；正文 ${style.palette.text}`,
    `字体气质：标题 ${style.fonts.heading}；正文 ${style.fonts.body}（用系统字族实现，不引入网络字体文件）`,
    `圆角：${radius}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BuildBody;
    const client = makeClient(req.headers.get("x-aps-key"));

    const svc = servicesBrief(body.services);
    const svcPart = svc ? `\n\n## 平台服务\n${svc}` : "";

    let user: string;
    if (body.mode === "build") {
      user = `请实现下面这个产品的第一个正式版本。\n\n## 产品方案\n${specBrief(
        body.spec
      )}\n\n## 视觉规范\n${styleBrief(body.style)}${svcPart}\n\n直接输出完整单文件 HTML。`;
    } else if (body.mode === "revise") {
      user = `产品方案有更新，请在现有版本基础上按新方案修改。\n\n## 新的产品方案\n${specBrief(
        body.spec
      )}\n\n## 视觉规范（不变）\n${styleBrief(body.style)}${svcPart}\n\n## 现有版本\n${
        body.html
      }\n\n尽量保留现有实现和数据结构，只做方案变化要求的改动。直接输出完整单文件 HTML。`;
    } else {
      const elementPart = body.element
        ? `\n\n## 用户在页面上点选的元素\n标签：<${body.element.tag}>\n可见文字：${body.element.text}\n位置（CSS 选择器）：${body.element.selector}\n元素源码片段：\n${body.element.html}`
        : "";
      user = `请对现有版本做一处修改。\n\n## 修改要求\n${body.instruction}${elementPart}\n\n## 产品方案（背景参考）\n${specBrief(
        body.spec
      )}\n\n## 视觉规范\n${styleBrief(body.style)}\n\n## 现有版本\n${
        body.html
      }\n\n只做这一处要求的修改，其余保持不变。直接输出完整单文件 HTML。`;
    }

    const stream = client.messages.stream({
      model: body.model || DEFAULT_MODEL,
      max_tokens: 64000,
      system: ENGINEER_SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    return streamToResponse(stream);
  } catch (e) {
    return errorJson(e, 400);
  }
}
