"use client";

import { useEffect, useState } from "react";

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
}: {
  charCount: number;
  productName: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 3500);
    return () => clearInterval(t);
  }, []);

  // 假进度：随生成字符数增长，封顶 96%
  const pct = Math.min(96, Math.round(charCount / 450));
  const lines = Math.round(charCount / 40);
  const phase = PHASES[Math.min(PHASES.length - 1, Math.floor(pct / (100 / PHASES.length)) || tick % 2)];

  return (
    <div className="build-progress">
      <div className="build-orb">
        <div className="spinner big" />
      </div>
      <h2>正在为你制作「{productName}」</h2>
      <p className="build-phase">{phase}</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
      <p className="build-note">
        {lines > 0 ? `工程团队已写下约 ${lines} 行代码 —— 你不需要看懂它们 :)` : "工程团队正在开工…"}
      </p>
    </div>
  );
}
