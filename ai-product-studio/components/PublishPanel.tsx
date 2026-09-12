"use client";

import { useEffect, useRef, useState } from "react";
import {
  AI_SERVICE_MODELS,
  BYO_CLOUDS,
  CHANNELS,
  PLATFORM_SERVICES,
  type PlatformServiceDef,
} from "@/lib/constants";
import { mockVisits } from "@/lib/projects";
import type {
  ChannelId,
  PublishState,
  ServicesState,
  Version,
} from "@/lib/types";

const CORE_SVCS = PLATFORM_SERVICES.filter((s) => s.group === "core");
const MORE_SVCS = PLATFORM_SERVICES.filter((s) => s.group === "more");

/**
 * 阶段⑤ 发布上线（产品原型：交互完整，发布/打包为流程演示，
 * 真实部署与构建由研发接入后端服务，见 docs/shipping.md）。
 */
export default function PublishPanel({
  projectId,
  productName,
  versions,
  currentVersion,
  publish,
  services,
  onPublishChange,
  onServiceToggle,
  onAiModelChange,
  onBack,
  onToast,
}: {
  projectId: string;
  productName: string;
  versions: Version[];
  currentVersion: number;
  publish: PublishState;
  services: ServicesState;
  onPublishChange: (next: PublishState | ((prev: PublishState) => PublishState)) => void;
  onServiceToggle: (id: string) => void;
  onAiModelChange: (model: string) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState("");
  const [miniOpen, setMiniOpen] = useState(false);
  const [byoOpen, setByoOpen] = useState<string | null>(null);
  // 「更多能力」默认折叠；里面有已开项时默认展开
  const [moreOpen, setMoreOpen] = useState(() =>
    MORE_SVCS.some((s) => services.enabled[s.id])
  );
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const draft = versions[currentVersion];
  const isLive = publish.status === "live";
  const liveOutdated =
    isLive && draft && publish.liveVersionTs !== null && draft.ts !== publish.liveVersionTs;
  const visits = mockVisits(publish.publishedAt);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  // ---------- 发布 / 更新线上版本（演示：本地模拟部署过程） ----------

  function doPublish() {
    if (!draft || publishing) return;
    setPublishing(true);
    const steps = ["正在检查产品完整性…", "正在分配访问域名…", "正在部署到云端…"];
    steps.forEach((s, i) => later(() => setPublishStep(s), i * 800));
    later(() => {
      const now = Date.now();
      onPublishChange((prev) => {
        const url = prev.url || `https://app-${projectId.slice(0, 6)}.zaowu.app`;
        const aiKey =
          services.enabled.ai && !prev.aiKey
            ? `aps_live_${projectId.slice(0, 4)}${now.toString(36)}`
            : prev.aiKey;
        return {
          ...prev,
          status: "live",
          url,
          aiKey,
          liveVersionTs: draft.ts,
          liveVersionLabel: draft.label,
          publishedAt: prev.publishedAt || now,
          updatedAt: now,
          channels: {
            ...prev.channels,
            web: { status: "done", detail: url, updatedAt: now },
            h5: { status: "done", detail: "已随 Web 版上线，扫码即用", updatedAt: now },
          },
        };
      });
      setPublishing(false);
      setPublishStep("");
      onToast(isLive ? "线上版本已更新 🎉" : "发布成功！你的产品已经在线上了 🎉");
    }, steps.length * 800 + 600);
  }

  function rollbackLive(v: Version) {
    const now = Date.now();
    onPublishChange({
      ...publish,
      liveVersionTs: v.ts,
      liveVersionLabel: v.label,
      updatedAt: now,
    });
    onToast(`线上已回退到「${v.label}」`);
  }

  // ---------- 渠道动作 ----------

  function buildApk() {
    if (publish.channels.apk.status === "working") return;
    onPublishChange((prev) => ({
      ...prev,
      channels: { ...prev.channels, apk: { status: "working" } },
    }));
    later(() => {
      onPublishChange((prev) => ({
        ...prev,
        channels: {
          ...prev.channels,
          apk: {
            status: "done",
            detail: `${productName || "app"}-v${currentVersion + 1}.apk · 12.6 MB`,
            updatedAt: Date.now(),
          },
        },
      }));
      onToast("安卓安装包构建完成");
    }, 2600);
  }

  function copyUrl() {
    if (!publish.url) return;
    navigator.clipboard?.writeText(publish.url).then(
      () => onToast("链接已复制"),
      () => onToast(publish.url!)
    );
  }

  function copyAiKey() {
    if (!publish.aiKey) return;
    navigator.clipboard?.writeText(publish.aiKey).then(
      () => onToast("专属 API Key 已复制"),
      () => {}
    );
  }

  const moreOnCount = MORE_SVCS.filter((s) => services.enabled[s.id]).length;

  function renderService(s: PlatformServiceDef) {
    const on = !!services.enabled[s.id];
    return (
      <div key={s.id} className={`svc-row ${on ? "on" : ""}`}>
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
        <div className="svc-body">
          <div className="svc-name">
            {s.icon} {s.label}
            {s.note && <span className="svc-note">{s.note}</span>}
          </div>
          <div className="svc-desc">{s.desc}</div>

          {on && s.id === "auth" && (
            <div className="svc-detail">
              已集成登录方式：<span className="svc-chip">微信</span>
              <span className="svc-chip">Google</span>
              <span className="svc-chip">手机号</span>
            </div>
          )}
          {on && s.id === "ai" && (
            <div className="svc-detail svc-ai">
              <label>
                模型：
                <select value={services.aiModel} onChange={(e) => onAiModelChange(e.target.value)}>
                  {AI_SERVICE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              {publish.aiKey ? (
                <span className="svc-key">
                  专属 Key：<code>{publish.aiKey}</code>
                  <button className="btn sm ghost" onClick={copyAiKey}>
                    复制
                  </button>
                </span>
              ) : (
                <span className="svc-key muted">发布上线后自动签发专属 API Key</span>
              )}
            </div>
          )}
          {on && s.id === "storage" && isLive && (
            <div className="svc-detail">
              已用 0.2 GB / 1 GB <em className="demo-mark">演示数据</em>
            </div>
          )}
          {on && s.id === "forms" && isLive && (
            <div className="svc-detail">
              累计收到 <b>{Math.floor(visits / 7)}</b> 条访客提交{" "}
              <em className="demo-mark">演示数据</em>
            </div>
          )}
          {on && s.id === "access" && (
            <div className="svc-detail">
              当前：<span className="svc-chip">公开链接</span>
              可切换：<span className="svc-chip">密码保护</span>
              <span className="svc-chip">仅邀请</span>
              <em className="demo-mark">演示</em>
            </div>
          )}
          {on && s.id === "wallet" && (
            <div className="svc-detail">
              积分体系已内置：发放、消费、余额明细。真实收款将以「服务商模式」接入（规划中）。
            </div>
          )}
          {on && s.id === "analytics" && isLive && (
            <div className="svc-detail">
              累计访问 <b>{visits}</b> 次 <em className="demo-mark">演示数据</em>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="publish-pane">
      {/* 标题行 */}
      <div className="publish-head">
        <div>
          <h2>
            发布上线
            <span className={`live-pill ${isLive ? "on" : ""}`}>
              {isLive ? "● 已上线" : "○ 未发布"}
            </span>
          </h2>
          <p className="publish-sub">
            {isLive
              ? "产品已经在线上。继续迭代不会影响线上版本，改好后一键更新。"
              : "把产品从预览变成真正可访问的线上产品。所有能力当前免费开放。"}
          </p>
        </div>
        <button className="btn ghost" onClick={onBack}>
          ← 回到体验与迭代
        </button>
      </div>

      {/* 线上状态卡 */}
      {isLive && publish.url && (
        <div className="live-card">
          <div className="live-main">
            <div className="live-url-row">
              <a className="live-url" href={publish.url} target="_blank" rel="noreferrer">
                {publish.url}
              </a>
              <button className="btn sm ghost" onClick={copyUrl}>
                复制链接
              </button>
            </div>
            <div className="live-meta">
              <span>
                线上版本：<b>{publish.liveVersionLabel || "—"}</b>
              </span>
              {services.enabled.analytics && (
                <span>
                  累计访问：<b>{visits}</b>
                  <em className="demo-mark">演示数据</em>
                </span>
              )}
              <span>
                更新于{" "}
                {publish.updatedAt
                  ? new Date(publish.updatedAt).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
            {liveOutdated && (
              <div className="live-outdated">
                当前草稿（v{currentVersion + 1} · {draft?.label}）比线上更新。
                <button className="btn primary sm" disabled={publishing} onClick={doPublish}>
                  {publishing ? publishStep || "更新中…" : "⤴ 更新线上版本"}
                </button>
              </div>
            )}
            {isLive && !liveOutdated && versions.length > 1 && (
              <details className="rollback">
                <summary>回退线上版本</summary>
                <div className="rollback-list">
                  {versions.map((v, i) => (
                    <button
                      key={v.ts}
                      disabled={v.ts === publish.liveVersionTs}
                      onClick={() => rollbackLive(v)}
                    >
                      v{i + 1} · {v.label}
                      {v.ts === publish.liveVersionTs ? "（当前线上）" : ""}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
          <PseudoQr seed={publish.url} caption="手机扫码打开（演示二维码）" />
        </div>
      )}

      {/* 渠道出口 */}
      <section className="publish-section">
        <h3>产品出口 · 你想让大家在哪里用到它？</h3>
        <div className="channel-grid">
          {CHANNELS.map((ch) => {
            const st = publish.channels[ch.id as ChannelId];
            return (
              <div key={ch.id} className={`channel-card ${st.status}`}>
                <div className="channel-top">
                  <span className="channel-icon">{ch.icon}</span>
                  <span className="channel-name">{ch.label}</span>
                  {ch.tag && <span className="channel-tag">{ch.tag}</span>}
                  {st.status === "done" && <span className="channel-ok">✓</span>}
                </div>
                <p className="channel-desc">{ch.desc}</p>
                <div className="channel-action">
                  {ch.id === "web" &&
                    (st.status === "done" ? (
                      <button className="btn sm ghost" onClick={copyUrl}>
                        已上线 · 复制链接
                      </button>
                    ) : (
                      <button className="btn primary sm" disabled={publishing} onClick={doPublish}>
                        {publishing ? publishStep || "发布中…" : "🚀 一键发布"}
                      </button>
                    ))}
                  {ch.id === "h5" &&
                    (st.status === "done" ? (
                      <span className="channel-detail">{st.detail}</span>
                    ) : (
                      <span className="channel-detail">发布 Web 版后自动可用</span>
                    ))}
                  {ch.id === "apk" &&
                    (st.status === "done" ? (
                      <button
                        className="btn sm ghost"
                        onClick={() =>
                          onToast("演示环境：真实安装包由云端构建服务生成，此处为流程演示")
                        }
                      >
                        ⬇ {st.detail}
                      </button>
                    ) : (
                      <button
                        className="btn sm"
                        disabled={st.status === "working" || !draft}
                        onClick={buildApk}
                      >
                        {st.status === "working" ? "打包中…" : "📦 打包安装包"}
                      </button>
                    ))}
                  {ch.id === "mini" && (
                    <button className="btn sm" onClick={() => setMiniOpen(true)}>
                      查看接入说明
                    </button>
                  )}
                  {ch.id === "ios" && (
                    <button
                      className="btn sm ghost"
                      onClick={() => onToast("iOS 上架流程规划中：将提供打包与 App Store 提审代办")}
                    >
                      了解规划
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 平台能力：需求阶段确认为主，这里随时补开/关闭（补开会触发一次产品改造） */}
      <section className="publish-section">
        <h3>
          平台能力
          <span className="section-note">
            建议在「① 需求与方案」阶段尽早确认；这里也可以随时补开——补开的能力需要对产品做一次改造来集成
          </span>
        </h3>
        <div className="svc-list">{CORE_SVCS.map(renderService)}</div>
        <button type="button" className="svc-more-toggle" onClick={() => setMoreOpen(!moreOpen)}>
          {moreOpen ? "▾" : "▸"} 更多能力（{MORE_SVCS.length} 项
          {moreOnCount > 0 ? ` · 已开 ${moreOnCount} 项` : ""}
          ）：钱包、通知、权限、协作、分享、地图、统计
        </button>
        {moreOpen && <div className="svc-list">{MORE_SVCS.map(renderService)}</div>}
      </section>

      {/* 进阶：自有云 */}
      <section className="publish-section byo">
        <h3>
          进阶 · 使用自己的云服务
          <span className="section-note">默认由平台托管；已有云服务器的用户可以接入自己的账户</span>
        </h3>
        <div className="byo-row">
          {BYO_CLOUDS.map((c) => (
            <button key={c.id} className="byo-card" onClick={() => setByoOpen(c.id)}>
              <span className="byo-name">{c.label}</span>
              <span className="byo-hint">{c.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 小程序接入说明 */}
      {miniOpen && (
        <div className="modal-mask" onClick={() => setMiniOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h3>💬 微信小程序 · 接入说明</h3>
              <button className="close-x" onClick={() => setMiniOpen(false)}>
                ×
              </button>
            </div>
            <ol className="mini-steps">
              <li>
                <b>准备小程序账号</b>
                <p>在微信公众平台注册小程序，完成主体认证，拿到 AppID（个人主体约 1~2 天）。</p>
              </li>
              <li>
                <b>绑定到造物工坊</b>
                <p>在这里填入 AppID 并扫码授权，平台获得代开发权限。</p>
              </li>
              <li>
                <b>自动生成小程序版</b>
                <p>平台把你的产品转换成小程序代码包（Web 底座 + 小程序容器适配），无需你操作。</p>
              </li>
              <li>
                <b>提交微信审核</b>
                <p>平台代为上传并提交审核，审核通常 1~7 天；进度会在这里实时显示，需要你本人操作的环节（如类目资质）会给出图文指引。</p>
              </li>
            </ol>
            <p className="mini-note">
              当前版本为流程说明，绑定与自动提审功能开发中。完整技术方案见项目内
              <code>docs/miniprogram.md</code>（已提供给研发团队）。
            </p>
            <div className="modal-foot">
              <button
                className="btn primary"
                onClick={() => {
                  setMiniOpen(false);
                  onToast("已登记你的小程序意向，功能上线后第一时间通知你");
                }}
              >
                我有兴趣，通知我
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自有云指引 */}
      {byoOpen && (
        <div className="modal-mask" onClick={() => setByoOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>接入{BYO_CLOUDS.find((c) => c.id === byoOpen)?.label}</h3>
              <button className="close-x" onClick={() => setByoOpen(null)}>
                ×
              </button>
            </div>
            <ol className="mini-steps">
              <li>
                <b>获取访问密钥</b>
                <p>登录你的云服务商控制台，创建一个 API 密钥（我们只申请部署所需的最小权限）。</p>
              </li>
              <li>
                <b>粘贴到这里完成连接</b>
                <p>连接后体验与一键发布完全一致，只是产品部署在你自己的服务器上、账单走你自己的云账户。</p>
              </li>
              <li>
                <b>随时搬家</b>
                <p>平台托管与自有云可以互相迁移，你的产品和数据随时可导出，不会被锁定。</p>
              </li>
            </ol>
            <p className="mini-note">此功能开发中，当前为方案展示。</p>
            <div className="modal-foot">
              <button className="btn primary" onClick={() => setByoOpen(null)}>
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 演示用伪二维码：从 seed 确定性生成，仅作视觉占位，不可真实扫码。 */
function PseudoQr({ seed, caption }: { seed: string; caption: string }) {
  const N = 21;
  // 简单确定性哈希，避免每次渲染闪变
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const cells: boolean[] = [];
  let x = h >>> 0;
  for (let i = 0; i < N * N; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    cells.push((x & 0xff) > 128);
  }
  const finder = (r: number, c: number, rr: number, cc: number) =>
    (rr >= r && rr < r + 7 && cc >= c && cc < c + 7 &&
      (rr === r || rr === r + 6 || cc === c || cc === c + 6)) ||
    (rr >= r + 2 && rr < r + 5 && cc >= c + 2 && cc < c + 5);
  return (
    <div className="qr-wrap">
      <svg viewBox={`0 0 ${N} ${N}`} className="qr" aria-hidden>
        {Array.from({ length: N * N }, (_, i) => {
          const rr = Math.floor(i / N);
          const cc = i % N;
          const inFinder =
            finder(0, 0, rr, cc) || finder(0, N - 7, rr, cc) || finder(N - 7, 0, rr, cc);
          const isFinderZone =
            (rr < 7 && (cc < 7 || cc >= N - 7)) || (rr >= N - 7 && cc < 7);
          const on = isFinderZone ? inFinder : cells[i];
          return on ? <rect key={i} x={cc} y={rr} width={1} height={1} /> : null;
        })}
      </svg>
      <span className="qr-caption">{caption}</span>
    </div>
  );
}
