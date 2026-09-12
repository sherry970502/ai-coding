"use client";

import { useState } from "react";
import type { StyleOption } from "@/lib/types";

function fontFamily(desc: string): string {
  if (/衬线|宋|serif|Serif/.test(desc) && !/无衬线/.test(desc)) {
    return "Georgia, 'Songti SC', 'Noto Serif SC', serif";
  }
  if (/等宽|mono/i.test(desc)) return "ui-monospace, Menlo, monospace";
  return "-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif";
}

function radiusPx(r: StyleOption["radius"]): string {
  return r === "sharp" ? "3px" : r === "round" ? "16px" : "9px";
}

export default function StylePicker({
  styles,
  loading,
  error,
  selectedId,
  onSelect,
  onConfirm,
  onRegenerate,
}: {
  styles: StyleOption[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onRegenerate: (tweak: string) => void;
}) {
  const [tweak, setTweak] = useState("");

  if (loading) {
    return (
      <div className="stage-loading">
        <div className="spinner" />
        <h3>设计师正在为你的产品构思视觉方向…</h3>
        <p>会给出 3 个气质不同的方向供你挑选</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stage-loading">
        <h3>视觉方向生成失败</h3>
        <p className="error-text">{error}</p>
        <button className="btn primary" onClick={() => onRegenerate("")}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="style-picker">
      <div className="stage-title">
        <h2>选一个你喜欢的视觉方向</h2>
        <p>决定产品的整体气质。选定后工程团队会严格按它来制作。</p>
      </div>

      <div className="style-grid">
        {styles.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              className={`style-card ${active ? "active" : ""}`}
              onClick={() => onSelect(s.id)}
            >
              {/* 迷你预览 */}
              <div
                className="style-preview"
                style={{ background: s.palette.bg, borderRadius: "10px 10px 0 0" }}
              >
                <div
                  className="sp-header"
                  style={{ background: s.palette.primary, borderRadius: radiusPx(s.radius) }}
                />
                <div
                  className="sp-card"
                  style={{
                    background: s.palette.surface,
                    borderRadius: radiusPx(s.radius),
                    fontFamily: fontFamily(s.fonts.heading),
                    color: s.palette.text,
                  }}
                >
                  <div className="sp-title" style={{ color: s.palette.text }}>
                    标题文字
                  </div>
                  <div className="sp-line" style={{ background: `${s.palette.text}33` }} />
                  <div className="sp-line short" style={{ background: `${s.palette.text}22` }} />
                  <div
                    className="sp-btn"
                    style={{
                      background: s.palette.accent,
                      borderRadius: radiusPx(s.radius),
                    }}
                  />
                </div>
              </div>
              <div className="style-meta">
                <div className="style-name-row">
                  <span className="style-name">{s.name}</span>
                  <span className="style-mood">{s.mood}</span>
                </div>
                <p className="style-desc">{s.description}</p>
                <div className="swatches">
                  {[s.palette.bg, s.palette.surface, s.palette.primary, s.palette.accent, s.palette.text].map(
                    (c, i) => (
                      <span key={i} className="swatch" style={{ background: c }} title={c} />
                    )
                  )}
                </div>
              </div>
              {active && <div className="style-check">✓ 已选择</div>}
            </button>
          );
        })}
      </div>

      <div className="style-actions">
        <div className="tweak-row">
          <input
            value={tweak}
            placeholder="都不满意？说说你想要的感觉，比如：更活泼一点 / 换成深色"
            onChange={(e) => setTweak(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                onRegenerate(tweak);
                setTweak("");
              }
            }}
          />
          <button
            className="btn ghost"
            onClick={() => {
              onRegenerate(tweak);
              setTweak("");
            }}
          >
            换一批
          </button>
        </div>
        <button className="btn primary big" disabled={!selectedId} onClick={onConfirm}>
          就选这个，开始制作 →
        </button>
      </div>
    </div>
  );
}
