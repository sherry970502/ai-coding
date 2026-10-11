"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/credits";

const PHASES = [
  "正在通读产品方案…",
  "搭建页面骨架…",
  "编写交互逻辑…",
  "接入数据保存…",
  "按视觉规范调校细节…",
  "做最后的打磨与自检…",
];

export default function BuildProgress({
  charCount,
  productName,
  estimatedMs,
  estimatedCost,
}: {
  charCount: number;
  productName: string;
  estimatedMs: number;
  estimatedCost: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(t);
  }, []);

  // 进度取「预估时长进度」与「生成字符数进度」中的较大者，封顶 96%
  const timePct = estimatedMs > 0 ? (elapsed / estimatedMs) * 92 : 0;
  const charPct = charCount / 450;
  const pct = Math.min(96, Math.round(Math.max(timePct, charPct, 4)));
  const lines = Math.round(charCount / 40);
  const phase = PHASES[Math.min(PHASES.length - 1, Math.floor((pct / 100) * PHASES.length))];
  const remaining = Math.max(0, estimatedMs - elapsed);

  return (
    <div className="build-progress">
      <div className="build-orb">
        <div className="spinner big" />
      </div>
      <h2>正在为你制作「{productName}」</h2>
      <p className="build-phase">{phase}</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="build-eta">
        {remaining > 0
          ? `预计还需 ${formatDuration(remaining)}（按你最近几次的实际用时估算）`
          : "比平时久一点，马上就好…"}
      </p>
      <p className="build-note">
        {lines > 0 ? `工程团队已写下约 ${lines} 行代码 —— 你不需要看懂它们 :)` : "工程团队正在开工…"}
      </p>
      <p className="build-cost-note">本次预计消耗 ~{estimatedCost} 积分 · 如果失败不会扣除</p>
    </div>
  );
}
