"use client";

import { COST_ESTIMATE, COST_LABEL, type CreditsState } from "@/lib/credits";

// 按消耗从高到低排列，免费项归在最后
const RULES: { label: string; cost: string; note?: string }[] = [
  { label: COST_LABEL.build, cost: `~${COST_ESTIMATE.build} 积分 / 次`, note: "首次制作、更换视觉方向" },
  { label: COST_LABEL.revise, cost: `~${COST_ESTIMATE.revise} 积分 / 次`, note: "按新方案在现有产品上改" },
  { label: COST_LABEL.patch, cost: `~${COST_ESTIMATE.patch} 积分 / 次`, note: "点选修改、小调整；多处小改可合并成一次" },
  { label: COST_LABEL.styles, cost: `~${COST_ESTIMATE.styles} 积分 / 次` },
  { label: COST_LABEL.qa, cost: `~${COST_ESTIMATE.qa} 积分 / 次` },
  { label: "与产品经理对话 / 迭代建议", cost: "免费" },
  { label: "直接改文字（点选后输入新文字）", cost: "免费" },
];

export default function CreditsDrawer({
  credits,
  onTopUp,
  onClose,
}: {
  credits: CreditsState;
  onTopUp: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal credits-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>积分与计费</h3>
          <button className="close-x" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="credits-balance-row">
          <div>
            <div className="credits-balance">{credits.balance}</div>
            <div className="credits-balance-label">当前积分余额</div>
          </div>
          <button className="btn sm" onClick={onTopUp}>
            ＋ 领取体验积分
          </button>
        </div>

        <div className="credits-promises">
          <span>✓ 每次操作执行前都能看到预估消耗</span>
          <span>✓ 生成失败、发布失败不扣积分</span>
          <span>✓ 实际消耗按产出规模计，与预估相差不超过 40%</span>
        </div>

        <h4 className="credits-h4">计费规则</h4>
        <div className="credits-rules">
          {RULES.map((r) => (
            <div key={r.label} className="credits-rule">
              <span className="credits-rule-label">
                {r.label}
                {r.note && <small>{r.note}</small>}
              </span>
              <span className={`credits-rule-cost ${r.cost === "免费" ? "free" : ""}`}>{r.cost}</span>
            </div>
          ))}
        </div>
        <p className="credits-note">
          选择更强的模型（⚙ 设置）成品质量更好，但单次产出更多、消耗也相应更高。当前为演示账本，正式计费以上线后的规则为准。
        </p>

        <h4 className="credits-h4">消耗明细</h4>
        {credits.entries.length === 0 ? (
          <p className="credits-empty">还没有消耗记录。</p>
        ) : (
          <div className="credits-entries">
            {credits.entries.map((e, i) => (
              <div key={i} className={`credits-entry ${e.status}`}>
                <span className="credits-entry-main">
                  <b>{COST_LABEL[e.kind]}</b>
                  <em>{e.label}</em>
                </span>
                <span className="credits-entry-side">
                  {e.status === "failed" ? (
                    <span className="credits-failed">失败 · 未扣除</span>
                  ) : (
                    <span className="credits-cost">−{e.cost}</span>
                  )}
                  <time>
                    {new Date(e.ts).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
