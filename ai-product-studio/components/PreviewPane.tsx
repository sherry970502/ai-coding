"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SelectedElement, Suggestion, Version } from "@/lib/types";
import { injectEditScript } from "@/lib/editScript";

export default function PreviewPane({
  html,
  productName,
  versions,
  currentVersion,
  onRevert,
  patching,
  patchLabel,
  suggestions,
  suggestLoading,
  onSuggestion,
  onLocalTextEdit,
  onAIEdit,
  live,
  onOpenPublish,
}: {
  html: string;
  productName: string;
  versions: Version[];
  currentVersion: number;
  onRevert: (index: number) => void;
  patching: boolean;
  patchLabel: string;
  suggestions: Suggestion[];
  suggestLoading: boolean;
  onSuggestion: (s: Suggestion) => void;
  onLocalTextEdit: (el: SelectedElement, newText: string) => boolean;
  onAIEdit: (el: SelectedElement | null, instruction: string) => void;
  live: boolean;
  onOpenPublish: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [newText, setNewText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [localHint, setLocalHint] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const doc = useMemo(() => injectEditScript(html), [html]);

  // 接收 iframe 内点选的元素
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data;
      if (d?.__aps === "element-selected") {
        setSelected(d.payload as SelectedElement);
        setNewText((d.payload as SelectedElement).text);
        setInstruction("");
        setLocalHint("");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 编辑模式开关同步到 iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ __aps: "edit-mode", on: editMode }, "*");
  }, [editMode, doc]);

  function syncEditMode() {
    // iframe 重新加载后重发一次
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ __aps: "edit-mode", on: editMode }, "*");
    }, 80);
  }

  function download() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productName || "app"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyTextEdit() {
    if (!selected) return;
    if (newText === selected.text) {
      setLocalHint("文字没有变化");
      return;
    }
    const ok = onLocalTextEdit(selected, newText);
    if (ok) {
      setSelected(null);
    } else {
      setLocalHint("这段文字在页面里不止一处，已交给 AI 精确修改…");
      onAIEdit(selected, `把这个元素里的文字「${selected.text}」改为「${newText}」`);
      setSelected(null);
    }
  }

  return (
    <div className="preview-pane">
      {/* 工具栏 */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <span className="preview-title">{productName}</span>
          <span className="version-pill">v{currentVersion + 1}</span>
        </div>
        <div className="toolbar-right">
          <div className="seg">
            <button
              className={device === "desktop" ? "on" : ""}
              onClick={() => setDevice("desktop")}
              title="电脑视图"
            >
              🖥
            </button>
            <button
              className={device === "mobile" ? "on" : ""}
              onClick={() => setDevice("mobile")}
              title="手机视图"
            >
              📱
            </button>
          </div>
          <button
            className={`btn ${editMode ? "primary" : "ghost"}`}
            onClick={() => {
              setEditMode(!editMode);
              setSelected(null);
            }}
            title="⌘E"
          >
            {editMode ? "✓ 编辑模式" : "✎ 编辑模式"}
          </button>
          <div className="history-wrap">
            <button className="btn ghost" onClick={() => setHistoryOpen(!historyOpen)}>
              历史 ({versions.length})
            </button>
            {historyOpen && (
              <div className="history-menu">
                {versions.map((v, i) => (
                  <button
                    key={v.ts}
                    className={i === currentVersion ? "current" : ""}
                    onClick={() => {
                      onRevert(i);
                      setHistoryOpen(false);
                    }}
                  >
                    <span>v{i + 1} · {v.label}</span>
                    <span className="history-time">
                      {new Date(v.ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn ghost" onClick={download}>
            ⬇ 下载
          </button>
          <button className="btn primary" onClick={onOpenPublish}>
            {live ? "● 已上线 · 管理发布" : "🚀 发布上线"}
          </button>
        </div>
      </div>

      {editMode && !selected && (
        <div className="edit-banner">点击页面上任意文字或元素进行修改（再按一次「编辑模式」退出）</div>
      )}

      {/* 迭代建议 */}
      <div className="chips-row">
        {suggestLoading && <span className="chips-loading">正在生成迭代建议…</span>}
        {!suggestLoading &&
          suggestions.map((s, i) => (
            <button
              key={i}
              className="chip"
              disabled={patching}
              onClick={() => onSuggestion(s)}
              title={s.instruction}
            >
              <kbd>⌘{i + 1}</kbd> {s.label}
            </button>
          ))}
      </div>

      {/* 预览区域 */}
      <div className={`preview-stage ${device}`}>
        <div className={`device-frame ${device}`}>
          <iframe
            ref={iframeRef}
            title="preview"
            srcDoc={doc}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            onLoad={syncEditMode}
          />
        </div>

        {patching && (
          <div className="patch-overlay">
            <div className="spinner" />
            <p>{patchLabel || "正在修改…"}</p>
          </div>
        )}

        {/* 元素编辑面板 */}
        {selected && (
          <div className="edit-popover">
            <div className="edit-popover-head">
              <span>
                已选中 <code>&lt;{selected.tag}&gt;</code>
              </span>
              <button className="close-x" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>

            {selected.text && (
              <>
                <label>直接改文字（立即生效）</label>
                <textarea
                  rows={2}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
                <button className="btn primary sm" onClick={applyTextEdit}>
                  应用文字修改
                </button>
                <div className="edit-divider">或</div>
              </>
            )}

            <label>告诉 AI 你想怎么改这个元素</label>
            <textarea
              rows={2}
              placeholder="比如：把这个按钮改成绿色 / 这块放到页面顶部"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
            <button
              className="btn primary sm"
              disabled={!instruction.trim()}
              onClick={() => {
                onAIEdit(selected, instruction.trim());
                setSelected(null);
              }}
            >
              让 AI 修改
            </button>
            {localHint && <p className="edit-hint">{localHint}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
