"use client";

import { useState } from "react";
import {
  AI_SERVICE_MODELS,
  PLATFORM_SERVICES,
  type PlatformServiceDef,
} from "@/lib/constants";
import type { ServicesState, Spec } from "@/lib/types";

const CORE_SVCS = PLATFORM_SERVICES.filter((s) => s.group === "core");
const MORE_SVCS = PLATFORM_SERVICES.filter((s) => s.group === "more");

export default function SpecCard({
  spec,
  checklistOn,
  onToggle,
  onConfirm,
  confirmLabel,
  hint,
  services,
  onServiceToggle,
  onAiModelChange,
}: {
  spec: Spec;
  checklistOn: Record<string, boolean>;
  onToggle: (id: string) => void;
  onConfirm: () => void;
  confirmLabel: string;
  hint?: string;
  services?: ServicesState;
  onServiceToggle?: (id: string) => void;
  onAiModelChange?: (model: string) => void;
}) {
  // 「更多能力」默认折叠；里面有已开项时默认展开
  const [moreOpen, setMoreOpen] = useState(
    () => !!services && MORE_SVCS.some((s) => services.enabled[s.id])
  );

  function renderService(s: PlatformServiceDef) {
    if (!services || !onServiceToggle) return null;
    const on = !!services.enabled[s.id];
    return (
      <div key={s.id} className={`check-item svc ${on ? "on" : "off"}`}>
        <button
          className="svc-toggle"
          onClick={() => onServiceToggle(s.id)}
          type="button"
          aria-label={`${on ? "关闭" : "开通"}${s.label}`}
        >
          <span className={`switch ${on ? "on" : ""}`}>
            <span className="knob" />
          </span>
        </button>
        <span className="check-text">
          <span className="check-label">
            {s.icon} {s.label}
            {s.note && <span className="svc-note">{s.note}</span>}
          </span>
          <span className="check-desc">{s.desc}</span>
          {on && s.id === "ai" && onAiModelChange && (
            <label className="svc-model" onClick={(e) => e.stopPropagation()}>
              模型：
              <select
                value={services.aiModel}
                onChange={(e) => onAiModelChange(e.target.value)}
              >
                {AI_SERVICE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </span>
      </div>
    );
  }

  const moreOnCount = services
    ? MORE_SVCS.filter((s) => services.enabled[s.id]).length
    : 0;

  return (
    <div className="spec-card">
      <div className="spec-head">
        <div>
          <h2>{spec.productName}</h2>
          <p className="spec-tagline">{spec.tagline}</p>
        </div>
        <span className="spec-badge">产品方案</span>
      </div>

      <div className="spec-grid">
        <div className="spec-block">
          <h4>目标用户</h4>
          <p>{spec.targetUsers}</p>
        </div>
        <div className="spec-block">
          <h4>核心价值</h4>
          <p>{spec.coreValue}</p>
        </div>
      </div>

      <div className="spec-block">
        <h4>使用场景</h4>
        <ul className="spec-scenarios">
          {spec.scenarios.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="spec-block">
        <h4>功能模块</h4>
        <div className="module-list">
          {spec.modules.map((m, i) => (
            <div key={i} className={`module-item ${m.priority}`}>
              <div className="module-name">
                {m.name}
                <span className="module-tag">{m.priority === "core" ? "第一版" : "加分项"}</span>
              </div>
              <div className="module-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {spec.checklist.length > 0 && (
        <div className="spec-block">
          <h4>请逐项确认（可点击开关调整）</h4>
          <div className="checklist">
            {spec.checklist.map((c) => {
              const on = checklistOn[c.id] ?? c.defaultOn;
              return (
                <button
                  key={c.id}
                  className={`check-item ${on ? "on" : "off"}`}
                  onClick={() => onToggle(c.id)}
                  type="button"
                >
                  <span className={`switch ${on ? "on" : ""}`}>
                    <span className="knob" />
                  </span>
                  <span className="check-text">
                    <span className="check-label">{c.label}</span>
                    <span className="check-desc">{c.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {services && onServiceToggle && (
        <div className="spec-block">
          <h4>
            平台能力（建议现在确认——越早确定，产品结构越合理；之后也可以随时补开 · 当前免费开放）
          </h4>
          <div className="checklist">{CORE_SVCS.map(renderService)}</div>
          <button
            type="button"
            className="svc-more-toggle"
            onClick={() => setMoreOpen(!moreOpen)}
          >
            {moreOpen ? "▾" : "▸"} 更多能力（{MORE_SVCS.length} 项
            {moreOnCount > 0 ? ` · 已开 ${moreOnCount} 项` : ""}
            ）：钱包、通知、权限、协作、分享、地图、统计
          </button>
          {moreOpen && <div className="checklist">{MORE_SVCS.map(renderService)}</div>}
        </div>
      )}

      <div className="spec-foot">
        <p className="spec-hint">{hint || "对方案不满意？直接在左侧对话里告诉产品经理，TA 会更新方案。"}</p>
        <button className="btn primary big" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
