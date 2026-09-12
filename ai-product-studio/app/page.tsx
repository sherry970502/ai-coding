"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SettingsDrawer from "@/components/SettingsDrawer";
import { DEFAULT_MODEL, SETTINGS_KEY } from "@/lib/constants";
import {
  DEMO_HTML,
  DEMO_MESSAGES,
  DEMO_SPEC,
  DEMO_STYLES,
  DEMO_STYLE_ID,
  DEMO_SUGGESTIONS,
} from "@/lib/demo";
import {
  createProject,
  defaultPublish,
  defaultServices,
  deleteProject,
  duplicateProject,
  latestHtml,
  listProjects,
  publishSummary,
  renameProject,
  saveProject,
  type ProjectMeta,
} from "@/lib/projects";
import type { Settings, Stage } from "@/lib/types";

const STAGE_LABEL: Record<Stage, { text: string; cls: string }> = {
  discover: { text: "需求阶段", cls: "s-discover" },
  style: { text: "视觉阶段", cls: "s-style" },
  building: { text: "制作中", cls: "s-building" },
  preview: { text: "已有成品", cls: "s-preview" },
  publish: { text: "已有成品", cls: "s-preview" },
};

interface CardItem {
  meta: ProjectMeta;
  html: string | null;
  live: boolean;
  visits: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

export default function Workbench() {
  const router = useRouter();
  const [items, setItems] = useState<CardItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    chatModel: DEFAULT_MODEL,
    buildModel: DEFAULT_MODEL,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  function refresh() {
    setItems(
      listProjects().map((meta) => {
        const pub = publishSummary(meta.id);
        return { meta, html: latestHtml(meta.id), live: pub.live, visits: pub.visits };
      })
    );
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    refresh();
    setLoaded(true);
  }, []);

  function saveSettings(s: Settings) {
    setSettings(s);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }

  function handleCreate() {
    const meta = createProject(idea.trim() || undefined);
    setIdea("");
    setCreateOpen(false);
    router.push(`/p/${meta.id}`);
  }

  function handleCreateDemo() {
    const meta = createProject(undefined, "水滴打卡（示例）");
    saveProject(meta.id, {
      messages: DEMO_MESSAGES,
      spec: DEMO_SPEC,
      pendingSpec: null,
      checklistOn: {},
      styles: DEMO_STYLES,
      styleId: DEMO_STYLE_ID,
      versions: [{ html: DEMO_HTML, label: "演示版本", ts: Date.now() }],
      currentVersion: 0,
      suggestions: DEMO_SUGGESTIONS,
      stage: "preview",
      services: {
        ...defaultServices(),
        enabled: {
          ...defaultServices().enabled,
          auth: true,
          cloud: true,
          ai: true,
          storage: true,
          forms: true,
          wallet: true,
        },
      },
      publish: defaultPublish(),
    });
    setCreateOpen(false);
    router.push(`/p/${meta.id}`);
  }

  function handleRename(meta: ProjectMeta) {
    const name = window.prompt("项目名称", meta.name);
    if (name && name.trim()) {
      renameProject(meta.id, name);
      refresh();
    }
  }

  function handleDuplicate(id: string) {
    duplicateProject(id);
    refresh();
  }

  function handleDelete(meta: ProjectMeta) {
    if (window.confirm(`确定删除「${meta.name}」吗？该项目的方案与所有版本都会被删除，无法恢复。`)) {
      deleteProject(meta.id);
      refresh();
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.meta.name.toLowerCase().includes(q) ||
        it.meta.tagline.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="dash">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span> 造物工坊
          <span className="brand-sub">把想法直接变成产品</span>
        </div>
        <div className="dash-topbar-right">
          {items.length > 0 && (
            <input
              className="dash-search"
              placeholder="搜索项目…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          <button className="btn ghost" onClick={() => setSettingsOpen(true)}>
            ⚙ 设置
          </button>
          <button className="btn primary" onClick={() => setCreateOpen(true)}>
            ＋ 新建项目
          </button>
        </div>
      </header>

      <main className="dash-main">
        {loaded && items.length === 0 && (
          <div className="dash-hero">
            <div className="dash-hero-art">🏗️</div>
            <h1>你的产品工作台</h1>
            <p>
              每个想法都是一个项目：与 AI 产品经理对话出方案，挑选视觉，坐等成品，随时回来继续迭代。
              <br />
              全部保存在你自己的浏览器里。
            </p>
            <div className="dash-hero-actions">
              <button className="btn primary big" onClick={() => setCreateOpen(true)}>
                ＋ 创建第一个项目
              </button>
              <button className="btn ghost big" onClick={handleCreateDemo}>
                ▶ 先看示例项目（无需 API Key）
              </button>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="dash-head">
              <h1>我的项目</h1>
              <span className="dash-count">{items.length} 个项目</span>
            </div>
            <div className="dash-grid">
              {/* 新建卡片 */}
              <button className="proj-card new-card" onClick={() => setCreateOpen(true)}>
                <span className="new-plus">＋</span>
                <span>新建项目</span>
              </button>

              {filtered.map(({ meta, html, live, visits }) => {
                const stage = live
                  ? { text: "● 已上线", cls: "s-live" }
                  : STAGE_LABEL[meta.stage] || STAGE_LABEL.discover;
                return (
                  <div
                    key={meta.id}
                    className="proj-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/p/${meta.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/p/${meta.id}`);
                    }}
                  >
                    <div className="proj-thumb">
                      {html ? (
                        <iframe
                          className="thumb-iframe"
                          srcDoc={html}
                          sandbox="allow-scripts"
                          tabIndex={-1}
                          title={meta.name}
                        />
                      ) : (
                        <div className="thumb-placeholder">
                          {meta.stage === "discover" ? "💬" : meta.stage === "style" ? "🎨" : "🛠️"}
                          <span>
                            {meta.stage === "discover"
                              ? "正在和产品经理聊需求"
                              : meta.stage === "style"
                                ? "正在挑选视觉方向"
                                : "制作中"}
                          </span>
                        </div>
                      )}
                      <span className={`stage-badge ${stage.cls}`}>{stage.text}</span>
                    </div>
                    <div className="proj-body">
                      <div className="proj-name">{meta.name}</div>
                      <div className="proj-tagline">{meta.tagline || "尚未产出方案"}</div>
                      <div className="proj-foot">
                        <span className="proj-time">
                          {timeAgo(meta.updatedAt)}
                          {live && <span className="proj-visits"> · {visits} 次访问</span>}
                        </span>
                        <span className="proj-actions" onClick={(e) => e.stopPropagation()}>
                          <button title="重命名" onClick={() => handleRename(meta)}>
                            ✎
                          </button>
                          <button title="创建副本" onClick={() => handleDuplicate(meta.id)}>
                            ⧉
                          </button>
                          <button title="删除" className="danger" onClick={() => handleDelete(meta)}>
                            🗑
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <p className="dash-nohit">没有匹配「{search}」的项目</p>
            )}
          </>
        )}
      </main>

      {/* 新建项目弹窗 */}
      {createOpen && (
        <div className="modal-mask" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>新建项目</h3>
              <button className="close-x" onClick={() => setCreateOpen(false)}>
                ×
              </button>
            </div>
            <label className="field">
              <span>用一句话描述你的想法（可留空）</span>
              <textarea
                className="idea-input"
                rows={3}
                autoFocus
                placeholder="比如：我想做一个帮我记录每天喝水的小工具"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <small>填写后进入项目会自动开始和产品经理对话；留空则进入后再聊。</small>
            </label>
            <div className="modal-foot">
              <button className="btn ghost" onClick={handleCreateDemo}>
                ▶ 创建示例项目
              </button>
              <button className="btn primary" onClick={handleCreate}>
                创建并进入 →
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsDrawer settings={settings} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
