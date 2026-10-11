/**
 * 积分账本与耗时统计（本地演示实现，真实计量上线后由平台后端承载）。
 * 规则对用户的三个承诺：事前能看到预估、失败不扣、明细可查。
 */

export type CostKind =
  | "build" // 首次制作 / 更换视觉方向
  | "revise" // 按新方案改造
  | "patch" // 快速修改（局部）
  | "styles" // 视觉方向设计
  | "qa"; // 产品体检

export interface LedgerEntry {
  ts: number;
  kind: CostKind;
  label: string;
  cost: number; // 失败时为 0
  status: "ok" | "failed";
}

export interface CreditsState {
  balance: number;
  entries: LedgerEntry[]; // 最新在前
}

const KEY = "aps.credits.v1";
const DURATION_KEY = "aps.durations.v1";
const INITIAL_BALANCE = 500;
const MAX_ENTRIES = 60;

/** 各操作的预估消耗（积分）。对话与迭代建议免费。 */
export const COST_ESTIMATE: Record<CostKind, number> = {
  build: 40,
  revise: 30,
  patch: 8,
  styles: 5,
  qa: 2,
};

export const COST_LABEL: Record<CostKind, string> = {
  build: "整体制作",
  revise: "方案改造",
  patch: "快速修改",
  styles: "视觉方向设计",
  qa: "产品体检",
};

export function loadCredits(): CreditsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as CreditsState;
      if (typeof s.balance === "number" && Array.isArray(s.entries)) return s;
    }
  } catch {
    /* ignore */
  }
  return { balance: INITIAL_BALANCE, entries: [] };
}

function save(state: CreditsState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** 成功完成一次操作后记账。实际消耗按产出规模在预估值附近浮动。 */
export function chargeCredits(kind: CostKind, label: string, outputChars = 0): CreditsState {
  const base = COST_ESTIMATE[kind];
  // 产出越大消耗越多，上下浮动不超过 ±40%，保证与事前预估不脱节
  const scale = outputChars > 0 ? Math.min(1.4, Math.max(0.6, outputChars / 30000)) : 1;
  const cost = Math.max(1, Math.round(base * scale));
  const state = loadCredits();
  const next: CreditsState = {
    balance: state.balance - cost,
    entries: [
      { ts: Date.now(), kind, label, cost, status: "ok" as const },
      ...state.entries,
    ].slice(0, MAX_ENTRIES),
  };
  save(next);
  return next;
}

/** 操作失败：记一笔 0 消耗的流水，让「失败不扣」看得见。 */
export function recordFailure(kind: CostKind, label: string): CreditsState {
  const state = loadCredits();
  const next: CreditsState = {
    balance: state.balance,
    entries: [
      { ts: Date.now(), kind, label, cost: 0, status: "failed" as const },
      ...state.entries,
    ].slice(0, MAX_ENTRIES),
  };
  save(next);
  return next;
}

/** 演示账本：领取体验积分。 */
export function topUpCredits(amount = 500): CreditsState {
  const state = loadCredits();
  const next = { ...state, balance: state.balance + amount };
  save(next);
  return next;
}

// ---------- 耗时统计：用历史数据给出预估时长 ----------

type DurationMap = Partial<Record<CostKind, number[]>>;

/** 没有历史数据时的默认预估（毫秒） */
const DEFAULT_DURATION: Record<CostKind, number> = {
  build: 90_000,
  revise: 75_000,
  patch: 35_000,
  styles: 20_000,
  qa: 15_000,
};

function loadDurations(): DurationMap {
  try {
    const raw = localStorage.getItem(DURATION_KEY);
    if (raw) return JSON.parse(raw) as DurationMap;
  } catch {
    /* ignore */
  }
  return {};
}

export function recordDuration(kind: CostKind, ms: number) {
  if (ms < 1000) return; // 异常短的记录没有参考价值
  const map = loadDurations();
  const list = [...(map[kind] || []), ms].slice(-5); // 只看最近 5 次
  map[kind] = list;
  try {
    localStorage.setItem(DURATION_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** 预估时长（毫秒）：最近几次的平均，没有历史则用默认值。 */
export function estimateDuration(kind: CostKind): number {
  const list = loadDurations()[kind];
  if (!list || !list.length) return DEFAULT_DURATION[kind];
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} 分 ${rest} 秒` : `${m} 分钟`;
}
