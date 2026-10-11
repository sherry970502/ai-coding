"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QaReport, SelectedElement, Suggestion, Version } from "@/lib/types";
import { injectEditScript } from "@/lib/editScript";
import { COST_ESTIMATE, formatDuration } from "@/lib/credits";

/** 修改清单里的一条待改项 */
export interface PendingEdit {
  display: string; // 给用户看的短描述
  text: string; // 给工程师的完整指令（含元素定位信息）
}

const SEVERITY_LABEL = { high: "严重", medium: "建议修复", low: "轻微" } as const;

export default function PreviewPane({
  html,
  productName,
  versions,
  currentVersion,
  onRevert,
  onRestore,
  patching,
  patchLabel,
  patchEtaMs,
  suggestions,
  suggestLoading,
  onSuggestion,
  onLocalTextEdit,
  onAIEdit,
  onBatchEdit,
  qaReport,
  qaLoading,
  onRunQa,
  onFixIssues,
  live,
  onOpenPublish,
}: {
  html: string;
  productName: string;
  versions: Version[];
  currentVersion: number;
  onRevert: (index: number) => void;
  onRestore: (index: number) => void;
  patching: boolean;
  patchLabel: string;
  patchEtaMs: number;
  suggestions: Suggestion[];
  suggestLoading: boolean;
  onSuggestion: (s: Suggestion) => void;
  onLocalTextEdit: (el: SelectedElement, newText: string) => boolean;
  onAIEdit: (el: SelectedElement | null, instruction: string) => void;
  onBatchEdit: (instructions: string[]) => void;
  qaReport: QaReport | null;
  qaLoading: boolean;
  onRunQa: () => void;
  onFixIssues: (fixes: string[]) => void;
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
  const [queue, setQueue] = useState<PendingEdit[]>([]);
  const [qaOpen, setQaOpen] = useState(false);

  const doc = useMemo(() => injectEditScript(html), [html]);
  const isOldVersion = versions.length > 0 && currentVersion < versions.length - 1;

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

  // 体检结果到达时自动展开
  useEffect(() => {
    if (qaReport) setQaOpen(true);
  }, [qaReport]);

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

  function elementInstruction(el: SelectedElement, ins: string): string {
    return `针对元素 <${el.tag}>（可见文字「${el.text.slice(0, 60)}」，选择器 ${el.selector}）：${ins}`;
  }

  function addToQueue() {
    if (!selected || !instruction.trim()) return;
    const ins = instruction.trim();
    setQueue((q) => [
      ...q,
      { display: ins.slice(0, 24), text: elementInstruction(selected, ins) },
    ]);
    setSelected(null);
    setInstruction("");
  }

  function runQueue() {
    if (!queue.length || patching) return;
    onBatchEdit(queue.map((q) => q.text));
    setQueue([]);
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
          <button
            className="btn ghost"
            disabled={qaLoading || patching}
            title={`请验收工程师过一遍产品，找出显示错乱、点不动的按钮等问题（~${COST_ESTIMATE.qa} 积分）`}
            onClick={() => (qaReport ? setQaOpen(!qaOpen) : onRunQa())}
          >
            {qaLoading ? "体检中…" : "🩺 体检"}
          </button>
          <div className="history-wrap">
            <button className="btn ghost" onClick={() => setHistoryOpen(!historyOpen)}>
              历史 ({versions.length})
            </button>
            {historyOpen && (
              <div className="history-menu">
                {versions.map((v, i) => (
                  <div key={v.ts} className={`history-item ${i === currentVersion ? "current" : ""}`}>
                    <button
                      className="history-main"
                      onClick={() => {
                        onRevert(i);
                        setHistoryOpen(false);
                      }}
                    >
                      <span>
                        v{i + 1} · {v.label}
                      </span>
                      <span className="history-time">
                        {new Date(v.ts).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>
                    {i < versions.length - 1 && (
                      <button
                        className="history-restore"
                        title="把这个版本恢复为最新版本（免费，当前最新版仍保留在历史里）"
                        onClick={() => {
                          onRestore(i);
                          setHistoryOpen(false);
                        }}
                      >
                        ⟲ 恢复
                      </button>
                    )}
                  </div>
                ))}
                <p className="history-tip">点击查看任意版本；「恢复」会把旧版本变成最新版本，不满意随时回来。</p>
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

      {/* 正在查看旧版本的提示 */}
      {isOldVersion && (
        <div className="old-version-banner">
          正在查看 v{currentVersion + 1}（不是最新版本）。
          <button onClick={() => onRestore(currentVersion)}>⟲ 恢复这个版本</button>
          <button onClick={() => onRevert(versions.length - 1)}>回到最新 v{versions.length}</button>
        </div>
      )}

      {editMode && !selected && (
        <div className="edit-banner">
          点击页面上任意文字或元素进行修改（再按一次「编辑模式」退出）。改文字免费；小修改可以先「加入清单」，攒几处一起改，只按一次计费。
        </div>
      )}

      {/* 修改清单：多处小改合并成一次构建 */}
      {queue.length > 0 && (
        <div className="queue-bar">
          <span className="queue-title">修改清单（{queue.length} 处）：</span>
          <div className="queue-chips">
            {queue.map((q, i) => (
              <span key={i} className="queue-chip" title={q.text}>
                {q.display}
                <button onClick={() => setQueue((qs) => qs.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
          </div>
          <button className="btn primary sm" disabled={patching} onClick={runQueue}>
            一次改完 {queue.length} 处（~{COST_ESTIMATE.patch} 积分）
          </button>
        </div>
      )}

      {/* 体检报告 */}
      {qaOpen && qaReport && (
        <div className="qa-panel">
          <div className="qa-head">
            <b>🩺 体检报告</b>
            <span className="qa-summary">{qaReport.summary}</span>
            <button className="close-x" onClick={() => setQaOpen(false)}>
              ×
            </button>
          </div>
          {qaReport.issues.length === 0 ? (
            <p className="qa-clean">✓ 没有发现影响使用的问题。</p>
          ) : (
            <>
              <div className="qa-list">
                {qaReport.issues.map((it, i) => (
                  <div key={i} className={`qa-item ${it.severity}`}>
                    <span className={`qa-sev ${it.severity}`}>{SEVERITY_LABEL[it.severity]}</span>
                    <div className="qa-body">
                      <b>{it.title}</b>
                      <p>{it.detail}</p>
                    </div>
                    <button
                      className="btn sm"
                      disabled={patching}
                      onClick={() => onFixIssues([it.fix])}
                    >
                      修复
                    </button>
                  </div>
                ))}
              </div>
              <div className="qa-foot">
                <button
                  className="btn primary sm"
                  disabled={patching}
                  onClick={() => onFixIssues(qaReport.issues.map((it) => it.fix))}
                >
                  一键修复全部 {qaReport.issues.length} 项（~{COST_ESTIMATE.patch} 积分）
                </button>
                <button className="btn ghost sm" disabled={qaLoading} onClick={onRunQa}>
                  重新体检
                </button>
              </div>
            </>
          )}
        </div>
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
              title={`${s.instruction}（~${COST_ESTIMATE.patch} 积分）`}
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

        {patching && <PatchOverlay label={patchLabel} etaMs={patchEtaMs} />}

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
                <label>直接改文字（立即生效 · 免费）</label>
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
            <div className="edit-popover-actions">
              <button
                className="btn primary sm"
                disabled={!instruction.trim()}
                onClick={() => {
                  onAIEdit(selected, instruction.trim());
                  setSelected(null);
                }}
              >
                立即修改（~{COST_ESTIMATE.patch} 积分）
              </button>
              <button
                className="btn sm"
                disabled={!instruction.trim()}
                title="还有别处要改？先加入清单，攒几处一起改，只按一次计费"
                onClick={addToQueue}
              >
                ＋ 加入清单
              </button>
            </div>
            {localHint && <p className="edit-hint">{localHint}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** 修改中的遮罩：显示预估剩余时间，回应「等待无反馈」 */
function PatchOverlay({ label, etaMs }: { label: string; etaMs: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = etaMs - elapsed;
  return (
    <div className="patch-overlay">
      <div className="spinner" />
      <p>{label || "正在修改…"}</p>
      <p className="patch-eta">
        {remaining > 0 ? `预计还需 ${formatDuration(remaining)}` : "马上就好…"} · 失败不扣积分
      </p>
    </div>
  );
}
