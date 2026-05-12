/**
 * 「隐形硬伤」三标签卡片 — 产品差异化核心
 *
 * 现有租房平台（贝壳/链家/自如）普遍缺失这三个维度，
 * 但它们恰好是用户调研中频率最高、严重度最高的踩坑来源。
 */
"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import type { HiddenRisks } from "@/types";

const HEATING_LABEL = {
  central: { label: "集中供暖", tone: "good" as const, hint: "市政统一供暖，省心" },
  self: { label: "自采暖", tone: "warn" as const, hint: "燃气/电费冬季月增 300-800 元" },
  none: { label: "无供暖", tone: "bad" as const, hint: "北方过冬高风险，不建议" },
};

const UTILITY_LABEL = {
  residential: {
    label: "民水民电",
    tone: "good" as const,
    hint: "水电按居民价计，月开销正常",
  },
  commercial: {
    label: "商水商电",
    tone: "bad" as const,
    hint: "水电费是民用 2-3 倍，月增 300-800 元隐性成本",
  },
};

function toneClasses(tone: "good" | "warn" | "bad") {
  switch (tone) {
    case "good":
      return "border-emerald-200/60 bg-emerald-50/40 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300";
    case "warn":
      return "border-amber-200/60 bg-amber-50/40 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300";
    case "bad":
      return "border-rose-200/60 bg-rose-50/40 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300";
  }
}

function ToneIcon({ tone }: { tone: "good" | "warn" | "bad" }) {
  if (tone === "good") return <ShieldCheck className="h-4 w-4 shrink-0" />;
  if (tone === "warn") return <AlertTriangle className="h-4 w-4 shrink-0" />;
  return <ShieldAlert className="h-4 w-4 shrink-0" />;
}

export function HiddenRisksCard({ risks }: { risks: HiddenRisks }) {
  const heating = HEATING_LABEL[risks.heating];
  const utility = UTILITY_LABEL[risks.utility];
  const relocation = risks.isRelocation
    ? { label: "含回迁安置", tone: "warn" as const, hint: "邻居素质参差，是噪音/纠纷投诉高发场景" }
    : { label: "纯商品房", tone: "good" as const, hint: "邻居以业主和长租客为主" };

  const hasAnyBad = risks.heating === "none" || risks.utility === "commercial";

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-brand-red-deep" />
            隐形硬伤识别
          </h2>
          <Badge variant="outline" className="text-[10px]">
            其他平台没有的差异化维度
          </Badge>
        </div>
        {hasAnyBad && (
          <span className="text-xs text-rose-600 font-medium">⚠ 注意隐性成本</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        这三项是北京年轻人最容易踩坑的「看不见的硬伤」 —
        月费用差距、过冬体验、邻里纠纷的核心来源，签约前必须确认。
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        {/* 供暖方式 */}
        <div
          className={`rounded-lg border px-3 py-3 ${toneClasses(heating.tone)}`}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 mb-1.5">
            🔥 供暖方式
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-sm mb-1.5">
            <ToneIcon tone={heating.tone} />
            {heating.label}
          </div>
          <p className="text-[11px] leading-snug opacity-80">{heating.hint}</p>
        </div>

        {/* 水电类型 */}
        <div
          className={`rounded-lg border px-3 py-3 ${toneClasses(utility.tone)}`}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 mb-1.5">
            💧 水电类型
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-sm mb-1.5">
            <ToneIcon tone={utility.tone} />
            {utility.label}
          </div>
          <p className="text-[11px] leading-snug opacity-80">{utility.hint}</p>
        </div>

        {/* 回迁房 */}
        <div
          className={`rounded-lg border px-3 py-3 ${toneClasses(relocation.tone)}`}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 mb-1.5">
            🏘️ 建筑性质
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-sm mb-1.5">
            <ToneIcon tone={relocation.tone} />
            {relocation.label}
          </div>
          <p className="text-[11px] leading-snug opacity-80">{relocation.hint}</p>
        </div>
      </div>

      {risks.note && (
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{risks.note}</span>
        </div>
      )}
    </Card>
  );
}
