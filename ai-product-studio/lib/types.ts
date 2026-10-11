export interface ChatMessage {
  role: "user" | "assistant";
  content: string; // 原始内容（可能含 <proposal> 标签），展示时另行剥离
}

export interface SpecModule {
  name: string;
  desc: string;
  priority: "core" | "plus";
}

export interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
  defaultOn: boolean;
  enabled?: boolean; // 用户确认后的最终状态
}

/** 方案推荐开启的平台能力（PM 在方案中给出，确认方案时自动开启） */
export interface RecommendedService {
  id: string; // PLATFORM_SERVICES 的 id
  reason: string; // 用大白话说明为什么这个产品需要它
}

export interface Spec {
  productName: string;
  tagline: string;
  targetUsers: string;
  coreValue: string;
  scenarios: string[];
  modules: SpecModule[];
  checklist: ChecklistItem[];
  recommendedServices?: RecommendedService[];
}

export interface StylePalette {
  bg: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
}

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  mood: string;
  palette: StylePalette;
  fonts: { heading: string; body: string };
  radius: "sharp" | "soft" | "round";
}

export interface Suggestion {
  label: string;
  instruction: string;
}

export interface Version {
  html: string;
  label: string;
  ts: number;
}

export interface SelectedElement {
  tag: string;
  text: string;
  selector: string;
  html: string;
}

export type Stage = "discover" | "style" | "building" | "preview" | "publish";

/** 发布渠道（产品出口） */
export type ChannelId = "web" | "h5" | "apk" | "mini" | "ios";

export interface ChannelState {
  status: "idle" | "working" | "done";
  detail?: string; // 完成后的产物说明（文件名 / 状态文案）
  updatedAt?: number;
}

/** 平台服务勾选状态（在方案阶段勾选，发布后生效） */
export interface ServicesState {
  enabled: Record<string, boolean>; // PLATFORM_SERVICES 的 id -> 是否开通
  aiModel: string; // AI 能力选择的模型，"auto" 表示交给系统
}

/** 产品体检发现的问题 */
export interface QaIssue {
  title: string; // 一句话问题描述
  detail: string; // 具体表现与位置
  severity: "high" | "medium" | "low";
  fix: string; // 可直接执行的修复指令
}

export interface QaReport {
  issues: QaIssue[];
  summary: string; // 一句话总体评价
  ts: number;
}

/** 项目的发布状态（草稿与线上分离：versions 是草稿流，publish 记录线上版） */
export interface PublishState {
  status: "unpublished" | "live" | "paused";
  url: string | null; // 线上访问链接（Web / H5 共用）
  liveVersionTs: number | null; // 线上版本对应 versions[].ts
  liveVersionLabel: string;
  publishedAt: number | null;
  updatedAt: number | null;
  aiKey: string | null; // 勾选 AI 能力后平台签发的专属 Key
  channels: Record<ChannelId, ChannelState>;
}

export interface Settings {
  apiKey: string;
  chatModel: string; // 产品经理 / 设计师 / 建议
  buildModel: string; // 编码
}
