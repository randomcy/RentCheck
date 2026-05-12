/**
 * 看房避坑清单 UI — 展示从 importance + hard constraints 生成的个性化清单
 *
 * 让 Conjoint 测试不再止步于 importance%，而是产出 actionable 的下游：
 * 「测完偏好 → 拿这份清单去看房 → 真的少踩坑」
 */
"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListChecks, Download, Copy, Check } from "lucide-react";
import {
  generateChecklist,
  type ChecklistItem,
  type ChecklistCategory,
} from "@/lib/conjoint-v2/checklist-generator";
import type { Importance } from "@/lib/conjoint-v2/core";
import type { HardConstraints } from "@/store/conjointV2";

const CATEGORY_COLOR: Record<ChecklistCategory, string> = {
  证件: "bg-violet-100 text-violet-800 border-violet-200",
  现场: "bg-sky-100 text-sky-800 border-sky-200",
  合同: "bg-amber-100 text-amber-800 border-amber-200",
  隐形成本: "bg-rose-100 text-rose-800 border-rose-200",
};

interface Props {
  importance: Importance[];
  hardConstraints: HardConstraints;
}

export function ChecklistCard({ importance, hardConstraints }: Props) {
  const checklist = useMemo(
    () =>
      generateChecklist({
        importance,
        hardConstraints,
        minItems: 10,
        maxItems: 14,
      }),
    [importance, hardConstraints]
  );

  // 分类聚合（按 category 分组展示）
  const byCategory = useMemo(() => {
    const groups: Record<ChecklistCategory, ChecklistItem[]> = {
      证件: [],
      现场: [],
      合同: [],
      隐形成本: [],
    };
    for (const it of checklist) groups[it.category].push(it);
    return groups;
  }, [checklist]);

  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    const text = checklist
      .map((it, i) => `${i + 1}. [${it.category}] ${it.title}\n   ${it.detail}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
            <ListChecks className="h-5 w-5 text-brand-red-deep" />
            为你定制的看房避坑清单
            <Badge variant="default" className="text-[10px]">
              {checklist.length} 条
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            基于你的偏好权重 + 硬筛选条件，结合 30+ 北京年轻人真实租房踩坑案例生成。
            <span className="font-medium text-foreground ml-1">
              带去看房 = 把信息不对称扳回来。
            </span>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={copyToClipboard}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              复制清单
            </>
          )}
        </Button>
      </div>

      <div className="space-y-5 mt-5">
        {(["证件", "现场", "隐形成本", "合同"] as ChecklistCategory[]).map(
          (cat) => {
            const items = byCategory[cat];
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${CATEGORY_COLOR[cat]}`}
                  >
                    {cat}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} 条
                  </span>
                </div>
                <div className="space-y-2 pl-1">
                  {items.map((it, i) => (
                    <div
                      key={it.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/70 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="text-lg shrink-0 mt-0.5">{it.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {i + 1}.
                          </span>
                          <h4 className="font-semibold text-sm">{it.title}</h4>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                          {it.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t leading-relaxed">
        生成依据：你的 importance 权重 × 优先级 + 硬筛选触发项。条目来源：
        北京年轻人租房真实踩坑案例（牛客/小宇宙/掘金/界面新闻 2020-2025）。
      </p>
    </Card>
  );
}
