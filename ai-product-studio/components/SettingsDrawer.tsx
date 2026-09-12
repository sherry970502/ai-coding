"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";
import { MODEL_OPTIONS } from "@/lib/constants";

export default function SettingsDrawer({
  settings,
  onSave,
  onClose,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Settings>({ ...settings });

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>设置</h3>
          <button className="close-x" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="field">
          <span>Anthropic API Key</span>
          <input
            type="password"
            placeholder="sk-ant-…（只保存在你的浏览器里）"
            value={draft.apiKey}
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          />
          <small>留空则使用服务器配置的 ANTHROPIC_API_KEY。</small>
        </label>

        <label className="field">
          <span>产品经理 / 设计师模型</span>
          <select
            value={draft.chatModel}
            onChange={(e) => setDraft({ ...draft, chatModel: e.target.value })}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <small>负责需求对话、视觉方向、迭代建议。</small>
        </label>

        <label className="field">
          <span>工程师模型（写代码）</span>
          <select
            value={draft.buildModel}
            onChange={(e) => setDraft({ ...draft, buildModel: e.target.value })}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <small>负责生成和修改产品。建议保持最强模型，成品质量差异明显。</small>
        </label>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
