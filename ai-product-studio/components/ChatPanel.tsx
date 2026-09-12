"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { stripProposal } from "@/lib/client";

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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit() {
    const text = draft.trim();
    if (!text || busy || disabled) return;
    setDraft("");
    onSend(text);
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
            <p className="chat-empty-note">不需要懂任何技术，产品经理会引导你。</p>
          </div>
        )}
        {messages.map((m, i) => {
          const display = m.role === "assistant" ? stripProposal(m.content) : m.content;
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
      <div className="chat-input-row">
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
          disabled={busy || disabled || !draft.trim()}
          onClick={submit}
        >
          {busy ? "…" : "发送"}
        </button>
      </div>
    </div>
  );
}
