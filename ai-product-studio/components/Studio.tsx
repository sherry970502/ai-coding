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
import CreditsDrawer from "@/components/CreditsDrawer";
import {
  chargeCredits,
  COST_ESTIMATE,
  estimateDuration,
  formatDuration,
  loadCredits,
  recordDuration,
  recordFailure,
  seedDemoLedger,
  topUpCredits,
  type CostKind,
  type CreditsState,
} from "@/lib/credits";
import { injectDemoChange } from "@/lib/demo";
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
  DEMO_QA,
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
  QaReport,
  SelectedElement,
  ServicesState,
  Settings,
  Spec,
  Stage,
  StyleOption,
  Suggestion,
  Version,
} from "@/lib/types";

/** 构建失败的现场：原因 + 完整参数，支持一键原样重试 */
interface BuildFailure {
  reason: string;
  mode: "build" | "revise" | "patch";
  spec: Spec;
  style: StyleOption;
  baseHtml: string;
  instruction: string;
  element: SelectedElement | null;
  label: string;
}

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
  const [buildEtaMs, setBuildEtaMs] = useState(90_000);
  const [buildCost, setBuildCost] = useState(COST_ESTIMATE.build);
  const [patchEtaMs, setPatchEtaMs] = useState(35_000);
  const [failure, setFailure] = useState<BuildFailure | null>(null);

  // 积分账本与体检
  const [credits, setCredits] = useState<CreditsState>({ balance: 0, entries: [] });
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [qaReport, setQaReport] = useState<QaReport | null>(null);
  const [qaLoading, setQaLoading] = useState(false);

  // 演示模式：所有 AI 环节本地模拟，无需 API Key 即可完整体验 v0.3 的改动点
  const [demoMode, setDemoMode] = useState(false);
  const demoFailedOnce = useRef(false); // 含「失败」的修改要求第一次模拟失败，重试即成功

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
    setCredits(loadCredits());
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
    setDemoMode(!!data.demo);
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
        demo: demoMode,
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
    demoMode,
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

  /** 把历史版本恢复为最新版本（免费，当前最新版仍保留在历史里） */
  function restoreVersion(index: number) {
    const v = versions[index];
    if (!v) return;
    pushVersion(v.html, `恢复自 v${index + 1}`);
    showToast(`已把 v${index + 1} 恢复为最新版本`);
  }

  /** 方案推荐的平台能力：确认方案时自动开通，并告知用户 */
  function applyRecommendedServices(forSpec: Spec) {
    const recs = (forSpec.recommendedServices || []).filter((r) =>
      PLATFORM_SERVICES.some((p) => p.id === r.id)
    );
    const newly = recs.filter((r) => !services.enabled[r.id]);
    if (!newly.length) return;
    setServices((s) => {
      const enabled = { ...s.enabled };
      newly.forEach((r) => {
        enabled[r.id] = true;
        // 依赖关系与手动开通保持一致
        if (r.id === "auth") enabled.cloud = true;
        if (r.id === "collab") {
          enabled.auth = true;
          enabled.cloud = true;
        }
      });
      return { ...s, enabled };
    });
    const names = newly
      .map((r) => PLATFORM_SERVICES.find((p) => p.id === r.id)?.label)
      .filter(Boolean)
      .join("、");
    showToast(`已按方案自动开通：${names}（原因见方案卡「平台能力」，可随时关闭）`);
  }

  // ---------- 阶段一：与产品经理对话 ----------

  async function sendToPM(text: string) {
    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setChatBusy(true);
    if (demoMode) {
      // 演示：模拟产品经理流式回复（附件消息会点明已读取）
      const attach = /【附件：(.+?)】/.exec(text);
      const reply = attach
        ? `收到！我看完了你附上的《${attach[1]}》，里面的要点我已经记下，会在下一版方案里融入。\n\n（演示模式：真实环境中我会据此更新产品方案；填入 API Key 即可体验完整对话。）`
        : `明白，你的需求我记下了：「${text.slice(0, 40)}」。\n\n（演示模式：真实环境中我会据此调整方案或触发产品改造；填入 API Key 即可体验完整对话。）`;
      let sofar = "";
      for (const ch of reply) {
        sofar += ch;
        setMessages([...history, { role: "assistant", content: sofar }]);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 12));
      }
      setChatBusy(false);
      return;
    }
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
    applyRecommendedServices(finalSpec);
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
    applyRecommendedServices(finalSpec);
    runBuild("revise", finalSpec, style!, html, "按更新后的产品方案调整", null, "方案更新");
  }

  // ---------- 阶段二：视觉方向 ----------

  async function fetchStyles(forSpec: Spec, tweak: string) {
    if (demoMode) {
      showToast("演示模式：视觉方向为预置示例，填入 API Key 后可真实生成");
      return;
    }
    setStylesLoading(true);
    setStylesError(null);
    setStyleId(null);
    const start = Date.now();
    try {
      const data = await postJson<{ styles: StyleOption[] }>(
        "/api/styles",
        { spec: forSpec, tweak, model: settings.chatModel },
        headers()
      );
      setStyles(data.styles || []);
      recordDuration("styles", Date.now() - start);
      setCredits(chargeCredits("styles", tweak ? `换一批：${tweak.slice(0, 12)}` : "三个视觉方向"));
    } catch (e: any) {
      setStylesError(e.message);
      setCredits(recordFailure("styles", "视觉方向生成失败"));
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
    const kind: CostKind = mode;
    const start = Date.now();

    if (demoMode) {
      // 演示：本地模拟整个构建过程（进度、计费、失败恢复都按真实逻辑走）
      const willFail = instruction.includes("失败") && !demoFailedOnce.current;
      setFailure(null);
      if (isFullBuild) {
        setStage("building");
        setBuildChars(0);
        setBuildEtaMs(6000);
        setBuildCost(COST_ESTIMATE[kind]);
      } else {
        setPatching(true);
        setPatchLabel(`正在修改：${label}`);
        setPatchEtaMs(4000);
      }
      const tick = setInterval(() => setBuildChars((c) => c + 2200), 300);
      await new Promise((r) => setTimeout(r, isFullBuild ? 6000 : 3800));
      clearInterval(tick);
      setPatching(false);
      setPatchLabel("");
      if (willFail) {
        demoFailedOnce.current = true;
        setCredits(recordFailure(kind, label));
        if (isFullBuild) setStage(versions.length ? "preview" : "style");
        setFailure({
          reason: "（演示）模拟一次生成中断：网络连接在输出途中断开",
          mode,
          spec: forSpec,
          style: forStyle,
          baseHtml,
          instruction,
          element,
          label,
        });
        return;
      }
      demoFailedOnce.current = false;
      pushVersion(injectDemoChange(baseHtml || html, label), label);
      setStage("preview");
      setCredits(chargeCredits(kind, label, 28000));
      return;
    }

    if (isFullBuild) {
      setStage("building");
      setBuildChars(0);
      setBuildEtaMs(estimateDuration(kind));
      setBuildCost(COST_ESTIMATE[kind]);
    } else {
      setPatching(true);
      setPatchLabel(`正在修改：${label}`);
      setPatchEtaMs(estimateDuration("patch"));
    }
    setFailure(null);
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
      if (!newHtml) throw new Error("生成结果不完整，可能是网络中断，可以直接重试");
      pushVersion(newHtml, label);
      setStage("preview");
      recordDuration(kind, Date.now() - start);
      setCredits(chargeCredits(kind, label, newHtml.length));
      fetchSuggestions(forSpec, label);
    } catch (e: any) {
      setCredits(recordFailure(kind, label));
      if (isFullBuild) setStage(versions.length ? "preview" : "style");
      // 保留完整现场：失败原因 + 原始修改要求，支持一键重试
      setFailure({
        reason: e.message || "未知原因",
        mode,
        spec: forSpec,
        style: forStyle,
        baseHtml,
        instruction,
        element,
        label,
      });
    } finally {
      setPatching(false);
      setPatchLabel("");
    }
  }

  function retryFailure() {
    if (!failure) return;
    const f = failure;
    setFailure(null);
    runBuild(f.mode, f.spec, f.style, f.baseHtml, f.instruction, f.element, f.label);
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

  /** 修改清单：多处小改合并成一次构建，只按一次计费 */
  function handleBatchEdit(instructions: string[]) {
    if (!spec || !style || !instructions.length) return;
    const joined = instructions.map((t, i) => `修改点 ${i + 1}：${t}`).join("\n");
    runBuild("patch", spec, style, html, joined, null, `一次修改 ${instructions.length} 处`);
  }

  // ---------- 产品体检 ----------

  async function runQa() {
    if (!spec || !html || qaLoading) return;
    if (demoMode) {
      setQaLoading(true);
      await new Promise((r) => setTimeout(r, 1600));
      setQaReport({ ...DEMO_QA, ts: Date.now() });
      setCredits(chargeCredits("qa", `体检 v${currentVersion + 1}`));
      setQaLoading(false);
      return;
    }
    setQaLoading(true);
    const start = Date.now();
    try {
      const data = await postJson<{ summary: string; issues: QaReport["issues"] }>(
        "/api/qa",
        { html, spec, model: settings.chatModel },
        headers()
      );
      setQaReport({ summary: data.summary, issues: data.issues || [], ts: Date.now() });
      recordDuration("qa", Date.now() - start);
      setCredits(chargeCredits("qa", `体检 v${currentVersion + 1}`));
    } catch (e: any) {
      setCredits(recordFailure("qa", `体检 v${currentVersion + 1}`));
      showToast(`体检失败：${e.message}`);
    } finally {
      setQaLoading(false);
    }
  }

  /** 修复体检问题：一条或多条合并成一次快速修改 */
  function fixQaIssues(fixes: string[]) {
    if (!spec || !style || !fixes.length) return;
    setQaReport(null);
    const joined =
      fixes.length === 1 ? fixes[0] : fixes.map((f, i) => `修改点 ${i + 1}：${f}`).join("\n");
    runBuild(
      "patch",
      spec,
      style,
      html,
      joined,
      null,
      fixes.length === 1 ? "体检修复" : `体检修复 ${fixes.length} 项`
    );
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
    setDemoMode(true);
    setCredits(seedDemoLedger());
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
    // 预置三个版本：方便体验「历史 → ⟲ 恢复」与旧版本横幅
    const now = Date.now();
    setVersions([
      { html: DEMO_HTML, label: "首个版本", ts: now - 40 * 60_000 },
      { html: injectDemoChange(DEMO_HTML, "加入连续达标徽章"), label: "加入连续达标徽章", ts: now - 15 * 60_000 },
      { html: injectDemoChange(DEMO_HTML, "优化手机端布局"), label: "优化手机端布局", ts: now },
    ]);
    setCurrentVersion(2);
    setSuggestions(DEMO_SUGGESTIONS);
    setSuggestLoading(false);
    setQaReport({ ...DEMO_QA, ts: now });
    setStage("preview");
    showToast("演示已就绪：⚡ 看积分明细、🩺 看体检报告、✎ 编辑模式攒「修改清单」；修改要求里写「失败」两个字可体验失败恢复");
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
        <div className="topbar-actions">
          <button
            className="btn ghost credits-btn"
            title="积分余额 · 点击查看计费规则与消耗明细"
            onClick={() => setCreditsOpen(true)}
          >
            ⚡ {credits.balance}
          </button>
          <button className="btn ghost" onClick={() => setSettingsOpen(true)}>
            ⚙ 设置
          </button>
        </div>
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
                  confirmNote={
                    versions.length
                      ? `预计消耗 ~${COST_ESTIMATE.revise} 积分 · 约 ${formatDuration(estimateDuration("revise"))} · 失败不扣`
                      : `视觉设计 ~${COST_ESTIMATE.styles} 积分；选定后整体制作 ~${COST_ESTIMATE.build} 积分 · 失败不扣`
                  }
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
            <BuildProgress
              charCount={buildChars}
              productName={spec.productName}
              estimatedMs={buildEtaMs}
              estimatedCost={buildCost}
            />
          )}

          {stage === "preview" && spec && html && (
            <PreviewPane
              html={html}
              productName={spec.productName}
              versions={versions}
              currentVersion={currentVersion}
              onRevert={setCurrentVersion}
              onRestore={restoreVersion}
              patching={patching}
              patchLabel={patchLabel}
              patchEtaMs={patchEtaMs}
              suggestions={suggestions}
              suggestLoading={suggestLoading}
              onSuggestion={handleSuggestion}
              onLocalTextEdit={handleLocalTextEdit}
              onAIEdit={handleAIEdit}
              onBatchEdit={handleBatchEdit}
              qaReport={qaReport}
              qaLoading={qaLoading}
              onRunQa={runQa}
              onFixIssues={fixQaIssues}
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
              confirmNote={`预计消耗 ~${COST_ESTIMATE.revise} 积分 · 约 ${formatDuration(estimateDuration("revise"))} · 失败不扣`}
              hint="确认后工程团队会在现有产品基础上按新方案调整，你的数据不会丢。"
              services={services}
              onServiceToggle={toggleService}
              onAiModelChange={(m) => setServices((s) => ({ ...s, aiModel: m }))}
            />
          </div>
        </div>
      )}

      {/* 制作失败：说明原因、保留要求、支持一键重试（不扣积分） */}
      {failure && (
        <div className="modal-mask" onClick={() => setFailure(null)}>
          <div className="modal fail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>😥 这次没做成</h3>
              <button className="close-x" onClick={() => setFailure(null)}>
                ×
              </button>
            </div>
            <p className="fail-reason">
              <b>原因：</b>
              {failure.reason}
            </p>
            {failure.instruction && (
              <p className="fail-kept">
                你的修改要求已经保留：<em>{failure.instruction.slice(0, 120)}</em>
              </p>
            )}
            <p className="fail-note">这次失败没有扣积分。点下面的按钮可以原样重试，不用重新输入。</p>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setFailure(null)}>
                先不重试
              </button>
              <button className="btn primary" onClick={retryFailure}>
                ↻ 原样重试
              </button>
            </div>
          </div>
        </div>
      )}

      {creditsOpen && (
        <CreditsDrawer
          credits={credits}
          onTopUp={() => {
            setCredits(topUpCredits());
            showToast("已到账 500 体验积分");
          }}
          onClose={() => setCreditsOpen(false)}
        />
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
