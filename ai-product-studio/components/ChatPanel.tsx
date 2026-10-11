"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { stripProposal } from "@/lib/client";

const TEXT_EXT = /\.(txt|md|markdown|csv|json)$/i;
const MAX_ATTACH_CHARS = 50_000;

/** 把消息中的附件全文折叠成一个标签展示（发送给 AI 的仍是全文）。 */
function displayText(content: string): string {
  return content.replace(/【附件：(.+?)】[\s\S]*?【附件结束】/g, "📎 已附上《$1》");
}

export default function ChatPanel({
  messages,
  busy,
  disabled,
  placeholder,
  onSend,
  inputRef,
}: {
  messages: ChatMessage[];
  busy: boolean;
  disabled: boolean;
  placeholder: string;
  onSend: (text: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const [attachHint, setAttachHint] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function pickFile(file: File) {
    setAttachHint("");
    if (!TEXT_EXT.test(file.name)) {
      setAttachHint("PDF、Word 和图片识别正在支持中，目前请把文字内容粘贴到输入框，或上传 txt / md 文件。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let text = String(reader.result || "").trim();
      if (!text) {
        setAttachHint("这个文件似乎是空的。");
        return;
      }
      if (text.length > MAX_ATTACH_CHARS) {
        text = text.slice(0, MAX_ATTACH_CHARS);
        setAttachHint("文件较长，已截取前 5 万字作为参考。");
      }
      setAttachment({ name: file.name, content: text });
    };
    reader.onerror = () => setAttachHint("读取文件失败，请重试。");
    reader.readAsText(file);
  }

  function submit() {
    const text = draft.trim();
    if ((!text && !attachment) || busy || disabled) return;
    let full = text;
    if (attachment) {
      full = `${text || "请参考这份材料。"}\n\n【附件：${attachment.name}】\n${attachment.content}\n【附件结束】`;
    }
    setDraft("");
    setAttachment(null);
    setAttachHint("");
    onSend(full);
  }

  return (
    <div className="chat-panel">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💡</div>
            <p>用一句话描述你想做的东西，比如：</p>
            <ul>
              <li>"我想做一个帮我记录每天喝水的小工具"</li>
              <li>"给我们羽毛球俱乐部做个活动报名页"</li>
              <li>"做一个给孩子练口算的小游戏"</li>
            </ul>
            <p className="chat-empty-note">
              不需要懂任何技术，产品经理会引导你。
              <br />
              已有现成的方案文档？点 📎 附上；也可以直接说"参考 XX 产品"。
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const display =
            m.role === "assistant" ? stripProposal(m.content) : displayText(m.content);
          const isStreamingEmpty =
            m.role === "assistant" && !display && busy && i === messages.length - 1;
          return (
            <div key={i} className={`bubble ${m.role}`}>
              <div className="bubble-role">{m.role === "user" ? "我" : "产品经理"}</div>
              <div className="bubble-body">
                {isStreamingEmpty ? <span className="dots">正在思考</span> : display}
                {m.role === "assistant" &&
                  busy &&
                  i === messages.length - 1 &&
                  display && <span className="caret" />}
              </div>
            </div>
          );
        })}
      </div>

      {attachment && (
        <div className="attach-chip-row">
          <span className="attach-chip">
            📎 {attachment.name}
            <button onClick={() => setAttachment(null)} aria-label="移除附件">
              ×
            </button>
          </span>
        </div>
      )}
      {attachHint && <div className="attach-hint">{attachHint}</div>}

      <div className="chat-input-row">
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".txt,.md,.markdown,.csv,.json,.pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
            e.target.value = "";
          }}
        />
        <button
          className="btn ghost attach-btn"
          disabled={busy || disabled}
          title="附上已有的方案文档（txt / md / csv / json）"
          onClick={() => fileRef.current?.click()}
        >
          📎
        </button>
        <textarea
          ref={inputRef}
          value={draft}
          disabled={disabled}
          placeholder={disabled ? "当前阶段暂不需要对话" : placeholder}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          className="btn primary send-btn"
          disabled={busy || disabled || (!draft.trim() && !attachment)}
          onClick={submit}
        >
          {busy ? "…" : "发送"}
        </button>
      </div>
    </div>
  );
}
