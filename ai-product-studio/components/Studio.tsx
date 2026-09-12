"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import SpecCard from "@/components/SpecCard";
import StylePicker from "@/components/StylePicker";
import BuildProgress from "@/components/BuildProgress";
import PreviewPane from "@/components/PreviewPane";
import PublishPanel from "@/components/PublishPanel";
import SettingsDrawer from "@/components/SettingsDrawer";
import {
  extractHtml,
  parseProposal,
  postJson,
  replaceTextOnce,
  streamText,
} from "@/lib/client";
import {
  DEFAULT_MODEL,
  PLATFORM_SERVICES,
  PLATFORM_SIDE_SERVICES,
  SETTINGS_KEY,
} from "@/lib/constants";
import {
  DEMO_HTML,
  DEMO_MESSAGES,
  DEMO_SPEC,
  DEMO_STYLES,
  DEMO_STYLE_ID,
  DEMO_SUGGESTIONS,
} from "@/lib/demo";
import {
  defaultPublish,
  defaultServices,
  getMeta,
  loadProjectData,
  saveProject,
} from "@/lib/projects";
import type {
  ChatMessage,
  PublishState,
  SelectedElement,
  ServicesState,
  Settings,
  Spec,
  Stage,
  StyleOption,
  Suggestion,
  Version,
} from "@/lib/types";

const STEPS: { key: Stage; label: string }[] = [
  { key: "discover", label: "① 需求与方案" },
  { key: "style", label: "② 视觉设计" },
  { key: "building", label: "③ 制作中" },
  { key: "preview", label: "④ 体验与迭代" },
  { key: "publish", label: "⑤ 发布上线" },
];

const MAX_VERSIONS = 12;

export default function Studio({ projectId }: { projectId: string }) {
  // 全局
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [projectName, setProjectName] = useState("未命名项目");
  const [stage, setStage] = useState<Stage>("discover");
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    chatModel: DEFAULT_MODEL,
    buildModel: DEFAULT_MODEL,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const initialIdeaRef = useRef<string | null>(null);

  // 阶段一：需求
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [pendingSpec, setPendingSpec] = useState<Spec | null>(null);
  const [checklistOn, setChecklistOn] = useState<Record<string, boolean>>({});
  const [spec, setSpec] = useState<Spec | null>(null);
  const [specReviewOpen, setSpecReviewOpen] = useState(false);

  // 阶段二：视觉
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesError, setStylesError] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<string | null>(null);

  // 阶段三/四：制作与迭代
  const [buildChars, setBuildChars] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [patching, setPatching] = useState(false);
  const [patchLabel, setPatchLabel] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // 阶段五：平台服务与发布
  const [services, setServices] = useState<ServicesState>(defaultServices);
  const [publish, setPublish] = useState<PublishState>(defaultPublish);

  const style = styles.find((s) => s.id === styleId) || null;
  const html = versions[currentVersion]?.html || "";

  // ---------- 项目载入与自动保存 ----------

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    const meta = getMeta(projectId);
    const data = loadProjectData(projectId);
    if (!meta || !data) {
      setNotFound(true);
      return;
    }
    setProjectName(meta.name);
    setMessages(data.messages);
    setSpec(data.spec);
    setPendingSpec(data.pendingSpec);
    setChecklistOn(data.checklistOn || {});
    setStyles(data.styles);
    setStyleId(data.styleId);
    setVersions(data.versions);
    setCurrentVersion(data.currentVersion);
    setSuggestions(data.suggestions);
    setServices(data.services);
    setPublish(data.publish);
    setStage(data.stage);
    if (data.initialIdea && data.messages.length === 0) {
      initialIdeaRef.current = data.initialIdea;
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // 新建项目附带的一句话想法：载入后自动发给产品经理
  useEffect(() => {
    if (loaded && initialIdeaRef.current) {
      const idea = initialIdeaRef.current;
      initialIdeaRef.current = null;
      sendToPM(idea);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // 自动保存（防抖）
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveProject(projectId, {
        messages,
        spec,
        pendingSpec,
        checklistOn,
        styles,
        styleId,
        versions,
        currentVersion,
        suggestions,
        stage,
        services,
        publish,
      });
      const meta = getMeta(projectId);
      if (meta) setProjectName(meta.name);
    }, 600);
    return () => clearTimeout(t);
  }, [
    loaded,
    projectId,
    messages,
    spec,
    pendingSpec,
    checklistOn,
    styles,
    styleId,
    versions,
    currentVersion,
    suggestions,
    stage,
    services,
    publish,
  ]);

  // ---------- 基础工具 ----------

  function saveSettings(s: Settings) {
    setSettings(s);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }

  const headers = useCallback((): Record<string, string> => {
    return settings.apiKey ? { "x-aps-key": settings.apiKey } : {};
  }, [settings.apiKey]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function toggleService(id: string) {
    setServices((s) => {
      const next = { ...s, enabled: { ...s.enabled, [id]: !s.enabled[id] } };
      // 依赖关系：账号体系需要云端数据；多人协作需要账号 + 云端数据
      if (id === "auth" && next.enabled.auth) next.enabled.cloud = true;
      if (id === "collab" && next.enabled.collab) {
        next.enabled.auth = true;
        next.enabled.cloud = true;
      }
      return next;
    });
  }

  function pushVersion(newHtml: string, label: string) {
    setVersions((prev) => {
      let next = [...prev, { html: newHtml, label, ts: Date.now() }];
      if (next.length > MAX_VERSIONS) next = next.slice(next.length - MAX_VERSIONS);
      setCurrentVersion(next.length - 1);
      return next;
    });
  }

  // ---------- 阶段一：与产品经理对话 ----------

  async function sendToPM(text: string) {
    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setChatBusy(true);
    try {
      const full = await streamText(
        "/api/pm",
        { messages: history, spec, model: settings.chatModel },
        headers(),
        (sofar) => {
          setMessages([...history, { role: "assistant", content: sofar }]);
        }
      );
      setMessages([...history, { role: "assistant", content: full }]);
      const proposal = parseProposal(full);
      if (proposal) {
        setPendingSpec(proposal);
        const on: Record<string, boolean> = {};
        proposal.checklist.forEach((c) => (on[c.id] = c.defaultOn));
        setChecklistOn(on);
        if (stage === "preview") setSpecReviewOpen(true);
      }
    } catch (e: any) {
      setMessages([
        ...history,
        { role: "assistant", content: `😥 出了点问题：${e.message}` },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  function confirmSpec() {
    if (!pendingSpec) return;
    const finalSpec: Spec = {
      ...pendingSpec,
      checklist: pendingSpec.checklist.map((c) => ({
        ...c,
        enabled: checklistOn[c.id] ?? c.defaultOn,
      })),
    };
    setSpec(finalSpec);
    setPendingSpec(null);
    // 已有成品时确认新方案 = 在现有产品上改造，而不是从视觉阶段重来
    if (versions.length && style) {
      runBuild("revise", finalSpec, style, html, "按更新后的产品方案调整", null, "方案更新");
    } else {
      setStage("style");
      fetchStyles(finalSpec, "");
    }
  }

  /** 回看已确认方案时，直接切换清单项（写回 spec，下次改造产品时生效） */
  function toggleConfirmedChecklist(id: string) {
    setSpec((s) =>
      s
        ? {
            ...s,
            checklist: s.checklist.map((c) =>
              c.id === id ? { ...c, enabled: !(c.enabled ?? c.defaultOn) } : c
            ),
          }
        : s
    );
  }

  function confirmRevisedSpec() {
    if (!pendingSpec) return;
    const finalSpec: Spec = {
      ...pendingSpec,
      checklist: pendingSpec.checklist.map((c) => ({
        ...c,
        enabled: checklistOn[c.id] ?? c.defaultOn,
      })),
    };
    setSpec(finalSpec);
    setPendingSpec(null);
    setSpecReviewOpen(false);
    runBuild("revise", finalSpec, style!, html, "按更新后的产品方案调整", null, "方案更新");
  }

  // ---------- 阶段二：视觉方向 ----------

  async function fetchStyles(forSpec: Spec, tweak: string) {
    setStylesLoading(true);
    setStylesError(null);
    setStyleId(null);
    try {
      const data = await postJson<{ styles: StyleOption[] }>(
        "/api/styles",
        { spec: forSpec, tweak, model: settings.chatModel },
        headers()
      );
      setStyles(data.styles || []);
    } catch (e: any) {
      setStylesError(e.message);
    } finally {
      setStylesLoading(false);
    }
  }

  function confirmStyle() {
    if (!spec || !style) return;
    runBuild("build", spec, style, "", "", null, versions.length ? "更换视觉方向" : "首个版本");
  }

  // ---------- 步骤条导航：已完成的步骤随时可以回看 ----------

  const canGo: Record<Stage, boolean> = {
    discover: true,
    style: !!spec,
    building: false, // 瞬态阶段，不可作为目标
    preview: versions.length > 0,
    publish: versions.length > 0,
  };

  function gotoStage(k: Stage) {
    if (stage === "building" || k === stage || !canGo[k]) return;
    if (k === "style" && spec && !styles.length) fetchStyles(spec, "");
    setStage(k);
  }

  // ---------- 阶段三/四：构建与修改 ----------

  async function runBuild(
    mode: "build" | "revise" | "patch",
    forSpec: Spec,
    forStyle: StyleOption,
    baseHtml: string,
    instruction: string,
    element: SelectedElement | null,
    label: string
  ) {
    const isFullBuild = mode !== "patch";
    if (isFullBuild) {
      setStage("building");
      setBuildChars(0);
    } else {
      setPatching(true);
      setPatchLabel(`正在修改：${label}`);
    }
    try {
      const full = await streamText(
        "/api/build",
        {
          mode,
          spec: forSpec,
          style: forStyle,
          html: baseHtml || undefined,
          instruction: instruction || undefined,
          element: element || undefined,
          services,
          model: settings.buildModel,
        },
        headers(),
        (sofar) => {
          if (isFullBuild) setBuildChars(sofar.length);
        }
      );
      const newHtml = extractHtml(full);
      if (!newHtml) throw new Error("生成结果不完整，请重试");
      pushVersion(newHtml, label);
      setStage("preview");
      fetchSuggestions(forSpec, label);
    } catch (e: any) {
      showToast(`制作失败：${e.message}`);
      if (isFullBuild) setStage(versions.length ? "preview" : "style");
    } finally {
      setPatching(false);
      setPatchLabel("");
    }
  }

  async function fetchSuggestions(forSpec: Spec, latestLabel: string) {
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const historyLabels = [...versions.map((v) => v.label), latestLabel];
      const data = await postJson<{ suggestions: Suggestion[] }>(
        "/api/suggest",
        { spec: forSpec, history: historyLabels, model: settings.chatModel },
        headers()
      );
      setSuggestions((data.suggestions || []).slice(0, 4));
    } catch {
      /* 建议失败不打扰用户 */
    } finally {
      setSuggestLoading(false);
    }
  }

  function handleLocalTextEdit(el: SelectedElement, newText: string): boolean {
    const replaced = replaceTextOnce(html, el.text, newText);
    if (replaced === null) return false;
    pushVersion(replaced, `改文字：${newText.slice(0, 12)}`);
    return true;
  }

  function handleAIEdit(el: SelectedElement | null, instruction: string) {
    if (!spec || !style) return;
    runBuild("patch", spec, style, html, instruction, el, instruction.slice(0, 18));
  }

  function handleSuggestion(s: Suggestion) {
    if (!spec || !style) return;
    runBuild("patch", spec, style, html, s.instruction, null, s.label);
  }

  /** 发布阶段的能力开关：晚开通需要对产品做一次改造把能力集成进去；关闭则提示下次移除 */
  function handlePublishServiceToggle(id: string) {
    const def = PLATFORM_SERVICES.find((s) => s.id === id);
    if (!def) return;
    if (services.enabled[id]) {
      toggleService(id);
      showToast(`已关闭「${def.label}」；下次修改产品时会移除对应功能`);
      return;
    }
    // 平台侧承载的服务（访问统计/访问权限），开通无需改造产品
    if (PLATFORM_SIDE_SERVICES.includes(id)) {
      toggleService(id);
      showToast(`已开通「${def.label}」，上线后自动生效`);
      return;
    }
    if (spec && style && html) {
      const go = window.confirm(
        `开通「${def.label}」需要对产品做一次改造，把这项能力集成进去（约 1~2 分钟）。现在进行吗？`
      );
      if (!go) return;
      toggleService(id);
      setStage("preview");
      const extra = id === "auth" ? "（已同时开启云端数据，界面上加上「已同步」状态标识）" : "";
      runBuild(
        "patch",
        spec,
        style,
        html,
        `用户补开了平台服务「${def.label}」${extra}，请把这项能力集成进产品，按系统提示词中「平台服务」一节的本地模拟规范实现，其余部分保持不变。`,
        null,
        `接入${def.label}`
      );
    } else {
      toggleService(id);
      showToast(`已开通「${def.label}」`);
    }
  }

  // ---------- 演示模式 ----------

  function loadDemo() {
    setMessages(DEMO_MESSAGES);
    setSpec(DEMO_SPEC);
    // 演示：预先勾选几项平台服务，便于展示发布阶段的完整形态
    setServices((s) => ({
      ...s,
      enabled: {
        ...s.enabled,
        auth: true,
        cloud: true,
        ai: true,
        storage: true,
        forms: true,
        wallet: true,
      },
    }));
    setStyles(DEMO_STYLES);
    setStyleId(DEMO_STYLE_ID);
    setVersions([{ html: DEMO_HTML, label: "演示版本", ts: Date.now() }]);
    setCurrentVersion(0);
    setSuggestions(DEMO_SUGGESTIONS);
    setSuggestLoading(false);
    setStage("preview");
    showToast("已载入演示成品：试试「✎ 编辑模式」点击页面改文字，或切换手机视图");
  }

  // ---------- 快捷键 ----------

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "k") {
        e.preventDefault();
        chatInputRef.current?.focus();
        return;
      }
      if (stage !== "preview" || patching) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= suggestions.length) {
        e.preventDefault();
        handleSuggestion(suggestions[n - 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, suggestions, patching, html, spec, style]);

  // ---------- 渲染 ----------

  if (notFound) {
    return (
      <div className="shell">
        <div className="right-empty" style={{ margin: "auto" }}>
          <div className="right-empty-art">🫥</div>
          <h2>找不到这个项目</h2>
          <p>它可能已被删除。</p>
          <Link className="btn primary big demo-btn" href="/">
            ← 回到工作台
          </Link>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="shell">
        <div className="stage-loading" style={{ margin: "auto" }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const chatDisabled = stage === "building" || stage === "style" || stage === "publish";
  const chatPlaceholder =
    stage === "preview"
      ? "想调整功能或流程？告诉产品经理（⌘K 聚焦这里）"
      : stage === "publish"
        ? "想继续修改产品？先回到「④ 体验与迭代」"
        : "描述你的想法，按 Enter 发送";

  const stepIndex = STEPS.findIndex((s) => s.key === stage);

  return (
    <div className="shell">
      {/* 顶栏 */}
      <header className="topbar">
        <div className="brand">
          <Link href="/" className="back-link" title="回到工作台">
            ←
          </Link>
          <span className="brand-mark">◆</span>
          <span className="topbar-project">{projectName}</span>
        </div>
        <nav className="steps">
          {STEPS.map((s, i) => {
            const clickable = stage !== "building" && s.key !== stage && canGo[s.key];
            return (
              <button
                key={s.key}
                type="button"
                className={`step ${i === stepIndex ? "current" : ""} ${i < stepIndex ? "done" : ""}`}
                disabled={!clickable}
                title={clickable ? "点击回到这一步查看或调整" : undefined}
                onClick={() => gotoStage(s.key)}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
        <button className="btn ghost" onClick={() => setSettingsOpen(true)}>
          ⚙ 设置
        </button>
      </header>

      {/* 主体 */}
      <main className="main">
        <aside className="left">
          <ChatPanel
            messages={messages}
            busy={chatBusy}
            disabled={chatDisabled}
            placeholder={chatPlaceholder}
            onSend={sendToPM}
            inputRef={chatInputRef}
          />
        </aside>

        <section className="right">
          {stage === "discover" && (
            <>
              {pendingSpec ? (
                <SpecCard
                  spec={pendingSpec}
                  checklistOn={checklistOn}
                  onToggle={(id) => setChecklistOn((s) => ({ ...s, [id]: !(s[id] ?? true) }))}
                  onConfirm={confirmSpec}
                  confirmLabel={versions.length ? "按新方案更新产品 →" : "确认方案，进入视觉设计 →"}
                  services={services}
                  onServiceToggle={toggleService}
                  onAiModelChange={(m) => setServices((s) => ({ ...s, aiModel: m }))}
                />
              ) : spec ? (
                // 回看已确认的方案：清单与平台能力随时可调，改动在下次改造产品时生效
                <SpecCard
                  spec={spec}
                  checklistOn={Object.fromEntries(
                    spec.checklist.map((c) => [c.id, c.enabled ?? c.defaultOn])
                  )}
                  onToggle={toggleConfirmedChecklist}
                  onConfirm={() => setStage(versions.length ? "preview" : "style")}
                  confirmLabel={versions.length ? "返回体验与迭代 →" : "继续：进入视觉设计 →"}
                  hint="这里的调整会在下次修改产品时一并生效。想调整功能或流程，直接在左侧告诉产品经理。"
                  services={services}
                  onServiceToggle={toggleService}
                  onAiModelChange={(m) => setServices((s) => ({ ...s, aiModel: m }))}
                />
              ) : (
                <div className="right-empty">
                  <div className="right-empty-art">🏗️</div>
                  <h2>方案会出现在这里</h2>
                  <p>
                    在左侧和产品经理聊聊你的想法。
                    <br />
                    TA 会帮你明确目标用户、核心价值和功能，产出一份可确认的产品方案。
                  </p>
                  <ol className="how-steps">
                    <li>对话明确需求，确认产品方案</li>
                    <li>挑选喜欢的视觉方向</li>
                    <li>等 1~2 分钟，产品自动做好</li>
                    <li>点击页面直接改，或继续对话迭代</li>
                  </ol>
                  <button className="btn primary big demo-btn" onClick={loadDemo}>
                    ▶ 先看一个演示成品（无需 API Key）
                  </button>
                </div>
              )}
            </>
          )}

          {stage === "style" && spec && (
            <StylePicker
              styles={styles}
              loading={stylesLoading}
              error={stylesError}
              selectedId={styleId}
              onSelect={setStyleId}
              onConfirm={confirmStyle}
              onRegenerate={(tweak) => fetchStyles(spec, tweak)}
            />
          )}

          {stage === "building" && spec && (
            <BuildProgress charCount={buildChars} productName={spec.productName} />
          )}

          {stage === "preview" && spec && html && (
            <PreviewPane
              html={html}
              productName={spec.productName}
              versions={versions}
              currentVersion={currentVersion}
              onRevert={setCurrentVersion}
              patching={patching}
              patchLabel={patchLabel}
              suggestions={suggestions}
              suggestLoading={suggestLoading}
              onSuggestion={handleSuggestion}
              onLocalTextEdit={handleLocalTextEdit}
              onAIEdit={handleAIEdit}
              live={publish.status === "live"}
              onOpenPublish={() => setStage("publish")}
            />
          )}

          {stage === "publish" && spec && (
            <PublishPanel
              projectId={projectId}
              productName={spec.productName}
              versions={versions}
              currentVersion={currentVersion}
              publish={publish}
              services={services}
              onPublishChange={setPublish}
              onServiceToggle={handlePublishServiceToggle}
              onAiModelChange={(m) => setServices((s) => ({ ...s, aiModel: m }))}
              onBack={() => setStage("preview")}
              onToast={showToast}
            />
          )}
        </section>
      </main>

      {/* 迭代期：方案更新确认弹层 */}
      {specReviewOpen && pendingSpec && (
        <div className="modal-mask" onClick={() => setSpecReviewOpen(false)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <SpecCard
              spec={pendingSpec}
              checklistOn={checklistOn}
              onToggle={(id) => setChecklistOn((s) => ({ ...s, [id]: !(s[id] ?? true) }))}
              onConfirm={confirmRevisedSpec}
              confirmLabel="按新方案更新产品 →"
              hint="确认后工程团队会在现有产品基础上按新方案调整，你的数据不会丢。"
              services={services}
              onServiceToggle={toggleService}
              onAiModelChange={(m) => setServices((s) => ({ ...s, aiModel: m }))}
            />
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsDrawer
          settings={settings}
          onSave={saveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
