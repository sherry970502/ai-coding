export const MODEL_OPTIONS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 · 能力最强（默认）" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 · 均衡快速" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 · 极速轻量" },
];

export const DEFAULT_MODEL = "claude-opus-4-8";

export const ERROR_MARK = "<<APS_ERROR>>";

export const SETTINGS_KEY = "aps.settings.v1";

/** 平台服务：用户在方案阶段勾选，发布上线后生效（当前免费开放） */
export interface PlatformServiceDef {
  id: string;
  icon: string;
  label: string;
  desc: string;
  note?: string; // 附加说明（能力边界 / 规划中的部分）
  group: "core" | "more"; // 常用能力默认展开；更多能力折叠呈现
  defaultOn: boolean;
}

export const PLATFORM_SERVICES: PlatformServiceDef[] = [
  // ---- 常用能力（默认展开）----
  {
    id: "auth",
    icon: "👤",
    label: "账号体系",
    desc: "平台提供基础账号服务：微信、Google、手机号登录，勾选后自动集成登录组件",
    group: "core",
    defaultOn: false,
  },
  {
    id: "cloud",
    icon: "☁️",
    label: "云端数据",
    desc: "使用者的数据保存到云端，多设备自动同步（开启账号体系后建议同时开启）",
    group: "core",
    defaultOn: false,
  },
  {
    id: "ai",
    icon: "✨",
    label: "AI 能力",
    desc: "产品内直接调用 AI，无需去模型公司申请 Key——由平台签发专属 API Key，调用与计量统一走平台",
    group: "core",
    defaultOn: false,
  },
  {
    id: "storage",
    icon: "📁",
    label: "文件与图片存储",
    desc: "产品里可以上传和展示图片、附件（头像、照片、文件），保存在云端存储",
    group: "core",
    defaultOn: false,
  },
  {
    id: "forms",
    icon: "📮",
    label: "访客表单收集",
    desc: "访客无需注册即可提交报名、预约、留言、问卷，数据汇总到你的后台",
    group: "core",
    defaultOn: false,
  },
  // ---- 更多能力（折叠呈现）----
  {
    id: "wallet",
    icon: "💰",
    label: "积分钱包",
    desc: "内置积分 / 虚拟货币体系：发放、消费、余额与明细",
    note: "真实收款能力规划中，当前以积分体系承载",
    group: "more",
    defaultOn: false,
  },
  {
    id: "notify",
    icon: "🔔",
    label: "消息通知",
    desc: "给使用者发提醒和通知：到点提醒、有人报名了告诉你",
    note: "首期支持邮件 + 网页推送；短信、微信通知接入中",
    group: "more",
    defaultOn: false,
  },
  {
    id: "access",
    icon: "🔐",
    label: "访问权限",
    desc: "控制谁能打开你的产品：公开、密码保护，或仅邀请的人可见",
    group: "more",
    defaultOn: false,
  },
  {
    id: "collab",
    icon: "👥",
    label: "多人协作",
    desc: "多个使用者共享同一份数据：家庭清单、小组打卡、班级值日表",
    note: "需要账号体系，勾选后自动带上",
    group: "more",
    defaultOn: false,
  },
  {
    id: "share",
    icon: "📣",
    label: "分享传播",
    desc: "一键生成分享海报和微信链接卡片，看得到每个渠道带来的访问",
    group: "more",
    defaultOn: false,
  },
  {
    id: "maps",
    icon: "📍",
    label: "地图与位置",
    desc: "地图选点、展示门店/活动位置、周边导航（腾讯/高德地图统一接入）",
    group: "more",
    defaultOn: false,
  },
  {
    id: "analytics",
    icon: "📊",
    label: "访问统计",
    desc: "上线后自动统计访问量与活跃情况，在工作台随时查看",
    group: "more",
    defaultOn: true,
  },
];

/** 平台侧承载、无需改造产品的服务（补开/关闭即生效） */
export const PLATFORM_SIDE_SERVICES = ["analytics", "access"];

/** AI 能力可选模型（给用户产品用的平台 AI 服务，非本工具自身的模型） */
export const AI_SERVICE_MODELS = [
  { id: "auto", label: "交给系统 · 自动选择最合适的模型" },
  { id: "claude", label: "Claude · 综合能力最强" },
  { id: "deepseek", label: "DeepSeek · 高性价比" },
  { id: "qwen", label: "通义千问 · 国内接入快" },
];

/** 发布渠道（产品出口） */
export interface ChannelDef {
  id: "web" | "h5" | "apk" | "mini" | "ios";
  icon: string;
  label: string;
  desc: string;
  tag?: string; // 状态标签，如「规划中」
}

export const CHANNELS: ChannelDef[] = [
  { id: "web", icon: "🌐", label: "网页 Web", desc: "一键发布到云端，获得可分享的访问链接" },
  { id: "h5", icon: "📱", label: "手机 H5", desc: "同一链接自动适配手机，扫码即用，可添加到主屏幕" },
  { id: "apk", icon: "🤖", label: "安卓 APK", desc: "打包成安卓安装包，下载后直接安装到手机" },
  { id: "mini", icon: "💬", label: "微信小程序", desc: "生成小程序代码包，绑定你的 AppID 后提交微信审核" },
  { id: "ios", icon: "🍎", label: "iOS App", desc: "打包上架 App Store（需 Apple 开发者账号与商店审核）", tag: "规划中" },
];

/** 外接自有云（进阶）：提供入口与操作指引 */
export const BYO_CLOUDS = [
  { id: "tencent", label: "腾讯云", hint: "支持轻量服务器 / 云托管" },
  { id: "aliyun", label: "阿里云", hint: "支持 ECS / 函数计算" },
  { id: "railway", label: "Railway", hint: "海外部署，按用量计费" },
];
