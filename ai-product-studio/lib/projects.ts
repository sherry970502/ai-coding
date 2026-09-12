import { PLATFORM_SERVICES } from "./constants";
import type {
  ChatMessage,
  PublishState,
  ServicesState,
  Spec,
  Stage,
  StyleOption,
  Suggestion,
  Version,
} from "./types";

/** 多项目工作台：项目索引 + 每项目完整状态，全部存 localStorage。 */

export interface ProjectMeta {
  id: string;
  name: string;
  tagline: string;
  stage: Stage;
  createdAt: number;
  updatedAt: number;
  customName?: boolean; // 用户手动改过名后，不再跟随方案自动更名
}

export interface ProjectData {
  messages: ChatMessage[];
  spec: Spec | null;
  pendingSpec: Spec | null;
  checklistOn: Record<string, boolean>;
  styles: StyleOption[];
  styleId: string | null;
  versions: Version[];
  currentVersion: number;
  suggestions: Suggestion[];
  stage: Stage;
  services: ServicesState; // 平台服务勾选（账号 / 云端数据 / AI / 积分钱包 / 统计）
  publish: PublishState; // 发布状态（草稿与线上分离）
  initialIdea?: string; // 新建项目时填的一句话想法，进入项目后自动发给产品经理
}

export function defaultServices(): ServicesState {
  const enabled: Record<string, boolean> = {};
  PLATFORM_SERVICES.forEach((s) => (enabled[s.id] = s.defaultOn));
  return { enabled, aiModel: "auto" };
}

export function defaultPublish(): PublishState {
  return {
    status: "unpublished",
    url: null,
    liveVersionTs: null,
    liveVersionLabel: "",
    publishedAt: null,
    updatedAt: null,
    aiKey: null,
    channels: {
      web: { status: "idle" },
      h5: { status: "idle" },
      apk: { status: "idle" },
      mini: { status: "idle" },
      ios: { status: "idle" },
    },
  };
}

const INDEX_KEY = "aps.projects.v1";
const dataKey = (id: string) => `aps.project.${id}`;

function readIndex(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeIndex(list: ProjectMeta[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function listProjects(): ProjectMeta[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function emptyData(initialIdea?: string): ProjectData {
  return {
    messages: [],
    spec: null,
    pendingSpec: null,
    checklistOn: {},
    styles: [],
    styleId: null,
    versions: [],
    currentVersion: 0,
    suggestions: [],
    stage: "discover",
    services: defaultServices(),
    publish: defaultPublish(),
    initialIdea,
  };
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createProject(initialIdea?: string, name?: string): ProjectMeta {
  const meta: ProjectMeta = {
    id: genId(),
    name: name || "未命名项目",
    tagline: initialIdea ? initialIdea.slice(0, 40) : "",
    stage: "discover",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    customName: !!name,
  };
  writeIndex([meta, ...readIndex()]);
  writeData(meta.id, emptyData(initialIdea));
  return meta;
}

export function getMeta(id: string): ProjectMeta | null {
  return readIndex().find((p) => p.id === id) || null;
}

export function loadProjectData(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(dataKey(id));
    if (!raw) return null;
    const data = JSON.parse(raw) as ProjectData;
    // 自愈：刷新时若停在瞬态阶段，回落到合理阶段
    if (data.stage === "building") {
      data.stage = data.versions?.length ? "preview" : data.styles?.length ? "style" : "discover";
    }
    if ((data.stage === "preview" || data.stage === "publish") && !data.versions?.length) {
      data.stage = data.styles?.length ? "style" : "discover";
    }
    if (!Array.isArray(data.messages)) data.messages = [];
    if (!Array.isArray(data.versions)) data.versions = [];
    data.currentVersion = Math.min(data.currentVersion || 0, Math.max(0, data.versions.length - 1));
    // 旧数据迁移：补齐平台服务与发布状态
    if (!data.services) data.services = defaultServices();
    if (!data.services.enabled) data.services = { ...defaultServices(), ...data.services };
    if (!data.publish) data.publish = defaultPublish();
    if (!data.publish.channels) data.publish = { ...defaultPublish(), ...data.publish };
    return data;
  } catch {
    return null;
  }
}

function writeData(id: string, data: ProjectData) {
  const attempt = (d: ProjectData) => localStorage.setItem(dataKey(id), JSON.stringify(d));
  try {
    attempt(data);
  } catch {
    // 空间不足：只保留最近 3 个版本重试
    try {
      const keep = Math.max(0, data.versions.length - 3);
      const trimmed: ProjectData = {
        ...data,
        versions: data.versions.slice(keep),
        currentVersion: Math.max(0, data.currentVersion - keep),
      };
      attempt(trimmed);
    } catch {
      /* 放弃本次保存 */
    }
  }
}

/** 保存项目状态，并同步索引里的名称/阶段/更新时间。 */
export function saveProject(id: string, data: ProjectData) {
  const { initialIdea: _drop, ...persist } = data; // initialIdea 只消费一次
  writeData(id, persist as ProjectData);
  const list = readIndex();
  const meta = list.find((p) => p.id === id);
  if (meta) {
    if (!meta.customName && data.spec?.productName) meta.name = data.spec.productName;
    if (data.spec?.tagline) meta.tagline = data.spec.tagline;
    meta.stage = data.stage;
    meta.updatedAt = Date.now();
    writeIndex(list);
  }
}

export function renameProject(id: string, name: string) {
  const list = readIndex();
  const meta = list.find((p) => p.id === id);
  if (meta && name.trim()) {
    meta.name = name.trim();
    meta.customName = true;
    meta.updatedAt = Date.now();
    writeIndex(list);
  }
}

export function duplicateProject(id: string): ProjectMeta | null {
  const src = getMeta(id);
  const data = loadProjectData(id);
  if (!src || !data) return null;
  const meta: ProjectMeta = {
    ...src,
    id: genId(),
    name: `${src.name} 副本`,
    customName: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeIndex([meta, ...readIndex()]);
  writeData(meta.id, data);
  return meta;
}

export function deleteProject(id: string) {
  writeIndex(readIndex().filter((p) => p.id !== id));
  try {
    localStorage.removeItem(dataKey(id));
  } catch {
    /* ignore */
  }
}

/** 工作台缩略图用：取项目当前版本的 HTML。 */
export function latestHtml(id: string): string | null {
  const data = loadProjectData(id);
  if (!data || !data.versions.length) return null;
  return data.versions[Math.min(data.currentVersion, data.versions.length - 1)].html;
}

/** 工作台卡片用：项目的上线状态摘要。 */
export function publishSummary(id: string): { live: boolean; url: string | null; visits: number } {
  const data = loadProjectData(id);
  if (!data || data.publish.status !== "live") return { live: false, url: null, visits: 0 };
  return { live: true, url: data.publish.url, visits: mockVisits(data.publish.publishedAt) };
}

/** 演示用访问量：按上线时长匀速累计，让数据看起来是活的。 */
export function mockVisits(publishedAt: number | null): number {
  if (!publishedAt) return 0;
  return Math.min(99999, Math.floor((Date.now() - publishedAt) / 45000));
}
