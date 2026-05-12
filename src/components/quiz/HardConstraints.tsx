/**
 * Hard Constraints 硬筛选模块 — 解决 CBC 方法论硬伤
 *
 * 来源：产品反思 §2.1 · CBC 假设所有属性都参与 trade-off，
 * 但北京租房中存在大量 hard constraint（民水民电、独卫、预算上限），
 * 它们根本不该出现在权衡题里——应该在测试开始前作为过滤器。
 */
"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import type { HardConstraints } from "@/store/conjointV2";

interface Props {
  value: HardConstraints;
  onChange: (next: HardConstraints) => void;
}

const TOGGLES: {
  key: keyof Omit<HardConstraints, "budgetMax">;
  icon: string;
  label: string;
  hint: string;
}[] = [
  {
    key: "requireResidentialUtility",
    icon: "💧",
    label: "必须民水民电",
    hint: "拒绝商水商电（月费用差 300-800 元）",
  },
  {
    key: "requireCentralHeating",
    icon: "🔥",
    label: "必须集中供暖",
    hint: "拒绝自采暖/无供暖（北方过冬关键）",
  },
  {
    key: "requirePrivateBath",
    icon: "🛁",
    label: "必须独立卫生间",
    hint: "拒绝合用卫浴（合租党核心痛点）",
  },
  {
    key: "rejectPartition",
    icon: "🚫",
    label: "拒绝隔断间",
    hint: "客厅打隔断、N+1 户型直接 pass",
  },
  {
    key: "rejectRelocation",
    icon: "🏘️",
    label: "拒绝回迁房",
    hint: "回迁安置楼栋邻里纠纷高发",
  },
];

export function HardConstraintsBlock({ value, onChange }: Props) {
  const toggle = (key: keyof Omit<HardConstraints, "budgetMax">) => {
    onChange({ ...value, [key]: !value[key] });
  };
  const setBudget = (v: number) => {
    onChange({ ...value, budgetMax: v });
  };

  const activeCount =
    TOGGLES.filter((t) => value[t.key]).length + (value.budgetMax > 0 ? 1 : 0);

  return (
    <Card className="p-5 mb-6 border-rose-200/40 bg-rose-50/20 dark:bg-rose-950/10">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-brand-red-deep" />
            硬筛选条件
            <Badge variant="outline" className="text-[10px] font-normal">
              不参与权衡 · 直接过滤
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            这些是你「绝对不让步」的条件，不进入下面的偏好权衡题。
            <span className="text-rose-600 font-medium ml-1">不满足 = 房源直接淘汰</span>
          </p>
        </div>
        {activeCount > 0 && (
          <Badge variant="soft" className="shrink-0">
            已设 {activeCount} 项
          </Badge>
        )}
      </div>

      {/* 预算上限 */}
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <span>💴</span> 月租金上限
        </label>
        <input
          type="number"
          min={0}
          step={500}
          placeholder="不限"
          value={value.budgetMax || ""}
          onChange={(e) => setBudget(Number(e.target.value) || 0)}
          className="w-28 px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-red/30 font-mono tabular-nums"
        />
        <span className="text-xs text-muted-foreground">元/月，超出直接淘汰</span>
      </div>

      {/* 5 个开关 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {TOGGLES.map((t) => {
          const on = value[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => toggle(t.key)}
              className={`text-left p-2.5 rounded-lg border transition-all ${
                on
                  ? "border-rose-300 bg-rose-100/60 dark:bg-rose-950/30 ring-1 ring-rose-300/50"
                  : "border-border bg-background hover:border-rose-200 hover:bg-rose-50/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm">{t.icon}</span>
                <span
                  className={`text-sm font-medium ${
                    on ? "text-rose-800 dark:text-rose-300" : ""
                  }`}
                >
                  {t.label}
                </span>
                {on && (
                  <span className="ml-auto text-[10px] text-rose-700 font-semibold">
                    ON
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {t.hint}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
