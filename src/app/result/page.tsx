"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  ChevronLeft,
  Trophy,
  Crown,
  Medal,
  RotateCcw,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  useConjointV2Store,
  DEFAULT_HARD_CONSTRAINTS,
  type ConjointV2Result,
} from "@/store/conjointV2";
import { findAttr } from "@/lib/conjoint-v2/attributes";
import { AntiBrokerWidget } from "@/components/result/AntiBrokerWidget";
import { ChecklistCard } from "@/components/result/ChecklistCard";

// ============================================================
// CompareResult 还是 mock（Phase 2 实现）
// ============================================================
const MOCK_COMPARE_RANK = [
  {
    rank: 1,
    title: "望京·阿里西溪一居",
    price: 6500,
    score: 0.42,
    matchRate: 89,
    why: "通勤 18 分钟，房型 + 价格双满足，且小区物业评分高",
  },
  {
    rank: 2,
    title: "十里堡·泛海国际",
    price: 7200,
    score: 0.28,
    matchRate: 78,
    why: "通勤略远但精装优势明显，性价比突出",
  },
  {
    rank: 3,
    title: "三里屯 SOHO 网红开间",
    price: 6800,
    score: 0.18,
    matchRate: 64,
    why: "颜值在线，但开间面积偏小，性价比一般",
  },
  {
    rank: 4,
    title: "回龙观龙泽一居",
    price: 4500,
    score: 0.07,
    matchRate: 41,
    why: "价格优势显著，但通勤时间不符合你的偏好",
  },
  {
    rank: 5,
    title: "国贸三期旁高层一居",
    price: 11500,
    score: 0.05,
    matchRate: 28,
    why: "通勤极短，但价格远超你愿意承受的区间",
  },
];

function ResultInner() {
  const params = useSearchParams();
  const from = params.get("from") ?? "quiz";

  return (
    <div className="container py-10 md:py-14 max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        返回首页
      </Link>

      {from === "compare" ? <CompareResult /> : <QuizResult />}

      {/* 底部 CTA */}
      <div className="mt-12 flex flex-col sm:flex-row gap-3">
        <Button asChild size="lg">
          <Link href="/community">
            看看为你推荐的小区
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/map">或者，看看符合偏好的房源</Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Quiz Result v2 — Conjoint Analysis 硬核版
// ============================================================
function QuizResult() {
  const { result } = useConjointV2Store();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="py-20 flex items-center justify-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-brand-red border-t-transparent animate-spin" />
          加载中…
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-3">还没有偏好画像</h2>
        <p className="text-muted-foreground mb-6">
          完成 12 道租房选择题，我们就能告诉你最在乎什么
        </p>
        <Button asChild size="lg">
          <Link href="/quiz">开始租房偏好测试</Link>
        </Button>
      </div>
    );
  }

  return <ConjointReport result={result} />;
}

// ============================================================
// 真正的结果报告
// ============================================================
function ConjointReport({ result }: { result: ConjointV2Result }) {
  // Importance 按权重降序
  const sortedImportance = useMemo(
    () => [...result.importance].sort((a, b) => b.importance - a.importance),
    [result.importance]
  );

  const top1 = sortedImportance[0];
  const top2 = sortedImportance[1];
  const bottom = sortedImportance[sortedImportance.length - 1];

  const top1Attr = top1 ? findAttr(top1.attrId) : null;
  const top2Attr = top2 ? findAttr(top2.attrId) : null;
  const bottomAttr = bottom ? findAttr(bottom.attrId) : null;

  const top1Pct = top1 ? Math.round(top1.importance * 100) : 0;
  const top2Pct = top2 ? Math.round(top2.importance * 100) : 0;
  const bottomPct = bottom ? Math.round(bottom.importance * 100) : 0;

  const holdoutPct = Math.round(result.holdout.accuracy * 100);
  const beatBaseline = result.holdout.accuracy > 1 / 3;

  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-red-deep mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          你的偏好画像 · Conjoint Analysis
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
          选房时你最看重
          {top1Attr && (
            <span className="bg-gradient-to-r from-brand-red to-rose-500 bg-clip-text text-transparent">
              {" "}
              {top1Attr.icon}
              {top1Attr.name}{" "}
            </span>
          )}
          {top2Attr && (
            <>
              和
              <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                {" "}
                {top2Attr.icon}
                {top2Attr.name}{" "}
              </span>
            </>
          )}
        </h1>
        <p className="text-muted-foreground max-w-2xl mt-3 leading-relaxed">
          基于你 {result.tasks.length - 2} 道正式题的选择，用 MNL（Multinomial Logit）模型
          + L2 正则估计了你在 {result.selectedAttrIds.length} 个维度上的偏好。
          {bottomAttr &&
            ` 你愿意为前两项在「${bottomAttr.icon} ${bottomAttr.name}」上做出妥协。`}
        </p>

        {/* 模型质量指标 */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge variant={beatBaseline ? "default" : "outline"}>
            <Target className="h-3 w-3 mr-1" />
            Holdout 准确率 {holdoutPct}%（随机基准 33%）
          </Badge>
          <Badge variant="outline">
            {result.converged ? (
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1 text-amber-500" />
            )}
            {result.converged ? "模型已收敛" : "模型未完全收敛"}
          </Badge>
          <Badge variant="outline">
            β 参数 {result.beta.length} 维 · L2 损失 {result.loss.toFixed(3)}
          </Badge>
        </div>
      </div>

      {/* 1. Importance Score */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-red-deep" />
              维度重要性（Importance Score）
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              每个维度的 part-worth 极差 ÷ 总极差，合计 100%
            </p>
          </div>
        </div>
        <ImportanceBars importance={sortedImportance} />
      </Card>

      {/* 2. Part-Worth 分布 */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold mb-1">效用分布（Part-Worth Utilities）</h2>
        <p className="text-xs text-muted-foreground mb-5">
          每个 level 相对基准（utility = 0）的效用差。正值代表你更偏好，负值代表你更回避。
        </p>
        <div className="space-y-5">
          {sortedImportance.map((imp) => {
            const pw = result.partWorths.find((p) => p.attrId === imp.attrId);
            if (!pw) return null;
            return <PartWorthRow key={imp.attrId} pw={pw} />;
          })}
        </div>
      </Card>

      {/* 3. WTP */}
      {result.wtp.valid ? (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            💴 你的付费意愿（WTP）
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            从你的选择反推：你愿意每月多付多少钱，把基准 level 换成这个 level
          </p>
          <WTPTable items={result.wtp.items} />
        </Card>
      ) : (
        <Card className="p-6 mb-6 bg-amber-50/30 border-amber-200/40 dark:bg-amber-950/10">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            💴 付费意愿（WTP）
          </h2>
          <p className="text-sm text-muted-foreground">{result.wtp.reason}</p>
        </Card>
      )}

      {/* 4. 看房避坑清单（actionable 下游） */}
      <ChecklistCard
        importance={result.importance}
        hardConstraints={result.hardConstraints ?? DEFAULT_HARD_CONSTRAINTS}
      />

      {/* 5. 自然语言解读 */}
      <Card className="p-6 mb-6 bg-brand-red-pale/40 border-brand-red/10">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-red-deep" />
          我们的解读
        </h3>
        <div className="space-y-2 text-sm text-foreground/80 leading-relaxed">
          <p>
            你的偏好结构里，
            <strong className="text-brand-red-deep">
              {top1Attr?.icon} {top1?.attrName}
            </strong>
            占 <strong>{top1Pct}%</strong>
            {top2Attr && (
              <>
                ，
                <strong>
                  {top2Attr.icon} {top2.attrName}
                </strong>
                占 <strong>{top2Pct}%</strong>
              </>
            )}
            ，两项合计 <strong>{top1Pct + top2Pct}%</strong> 主导你的选房决策。
          </p>
          {bottomAttr && (
            <p>
              相反，
              <strong>
                {bottomAttr.icon} {bottom.attrName}
              </strong>
              （仅 {bottomPct}%）对你影响很小——主打这点但其他维度一般的房源，
              可以直接从你的候选池过滤掉。
            </p>
          )}
          <p>
            模型在 2 道 holdout 题上达到 <strong>{holdoutPct}%</strong> 的预测准确率，
            {beatBaseline
              ? "高于 33% 随机基准，说明你的偏好结构是稳定的。"
              : "略低于随机基准，说明你的偏好可能存在权衡和不一致，建议重测获得更稳定结果。"}
          </p>
          <p className="text-muted-foreground">
            方法学：12 道 CBC 选择题 → MNL 模型（softmax + L2 正则 λ=1.0）→
            Adam 优化器（lr=0.05, maxIter=300）反解 β → 计算 part-worth、importance、WTP。
          </p>
        </div>
      </Card>

      {/* 反中介话术 widget */}
      <AntiBrokerWidget />

      {/* 重测按钮 */}
      <div className="mt-6 flex justify-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/quiz">
            <RotateCcw className="h-3.5 w-3.5" />
            重新测试
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：Importance 条形图
// ============================================================
const BAR_COLORS = [
  "bg-brand-red",
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-indigo-400",
];

function ImportanceBars({
  importance,
}: {
  importance: { attrId: string; attrName: string; importance: number }[];
}) {
  const max = Math.max(...importance.map((i) => i.importance), 0.001);
  return (
    <div className="space-y-4">
      {importance.map((imp, i) => {
        const attr = findAttr(imp.attrId);
        const pct = imp.importance * 100;
        return (
          <div key={imp.attrId}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums w-5">
                  #{i + 1}
                </span>
                <span className="text-base">{attr?.icon ?? "📊"}</span>
                <span className="font-medium">{imp.attrName}</span>
              </div>
              <span className="text-sm font-mono font-semibold text-brand-red-deep tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full ${BAR_COLORS[i] ?? "bg-gray-300"} rounded-full transition-all duration-700`}
                style={{
                  width: `${(imp.importance / max) * 100}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 子组件：Part-Worth 单行（带正负效用条）
// ============================================================
type PartWorthRowProps = {
  pw: {
    attrId: string;
    attrName: string;
    encoding: "linear" | "partWorth";
    levels: { label: string; value: number; utility: number }[];
    range: number;
  };
};

function PartWorthRow({ pw }: PartWorthRowProps) {
  const attr = findAttr(pw.attrId);
  // 找到全局正负边界，对称居中
  const maxAbs = Math.max(...pw.levels.map((l) => Math.abs(l.utility)), 0.001);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
        <span className="text-base">{attr?.icon ?? "📊"}</span>
        <span>{pw.attrName}</span>
        <span className="text-xs text-muted-foreground font-normal ml-1">
          极差 {pw.range.toFixed(2)}
        </span>
      </div>
      <div className="space-y-1.5 pl-6">
        {pw.levels.map((lv) => {
          const isPos = lv.utility >= 0;
          const widthPct = (Math.abs(lv.utility) / maxAbs) * 50; // 最多占一半
          return (
            <div key={lv.label} className="flex items-center text-xs">
              <span className="w-32 shrink-0 text-muted-foreground truncate">
                {lv.label}
              </span>
              <div className="flex-1 relative h-5 bg-secondary/40 rounded overflow-hidden">
                {/* 中线 */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                {/* utility bar */}
                <div
                  className={`absolute top-0 bottom-0 ${
                    isPos ? "bg-emerald-400/70" : "bg-rose-400/70"
                  }`}
                  style={{
                    left: isPos ? "50%" : `${50 - widthPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              </div>
              <span
                className={`w-16 text-right tabular-nums font-mono shrink-0 ${
                  isPos ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"
                }`}
              >
                {lv.utility >= 0 ? "+" : ""}
                {lv.utility.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 子组件：WTP 表
// ============================================================
function WTPTable({
  items,
}: {
  items: { attrId: string; attrName: string; levels: { label: string; wtp: number }[] }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">维度</th>
            <th className="py-2 pr-3 font-medium">Level</th>
            <th className="py-2 pl-3 text-right font-medium">
              你愿意每月多付 / 少付
            </th>
          </tr>
        </thead>
        <tbody>
          {items.flatMap((it) => {
            const attr = findAttr(it.attrId);
            return it.levels.map((lv, idx) => {
              const isBase = Math.abs(lv.wtp) < 0.5;
              const sign = lv.wtp > 0 ? "+" : "";
              return (
                <tr
                  key={`${it.attrId}-${lv.label}`}
                  className="border-b last:border-0 text-sm"
                >
                  <td className="py-2 pr-3">
                    {idx === 0 && (
                      <span className="flex items-center gap-1.5">
                        <span>{attr?.icon ?? "📊"}</span>
                        <span className="font-medium">{it.attrName}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{lv.label}</td>
                  <td
                    className={`py-2 pl-3 text-right font-mono tabular-nums ${
                      isBase
                        ? "text-muted-foreground"
                        : lv.wtp > 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-600"
                    }`}
                  >
                    {isBase ? "基准" : `${sign}¥${Math.round(lv.wtp).toLocaleString()}`}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        计算公式：WTP = -part_worth / β_price。正值代表你愿意付钱获得这个 level，
        负值代表你需要被补贴才会接受。WTP 是相对基准 level 的等价金额，仅供参考。
      </p>
    </div>
  );
}

// ============================================================
// 场景 B 结果（暂时保持 mock，Phase 2 实现）
// ============================================================
function CompareResult() {
  const podium = [Crown, Trophy, Medal];
  return (
    <div>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-red-deep mb-2">
          <Trophy className="h-3.5 w-3.5" />
          决策报告（场景 B · 10 轮对决完成）
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          基于你的偏好，
          <br className="md:hidden" />
          这是 5 套候选的排序
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          通过 Bradley-Terry 模型分析你 10 轮两两比较的胜负数据，得到每套房源的"相对实力分"。
          下面是从最契合到最不契合的排名。
        </p>
      </div>

      <div className="space-y-3">
        {MOCK_COMPARE_RANK.map((item, i) => {
          const Icon = podium[i] ?? Medal;
          return (
            <Card
              key={item.title}
              className={`p-5 flex items-center gap-4 ${
                i === 0
                  ? "border-brand-red/30 bg-brand-red-pale/20 shadow-card-hover"
                  : ""
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
                  i === 0
                    ? "bg-brand-red text-primary-foreground"
                    : i === 1
                      ? "bg-amber-100 text-amber-700"
                      : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-secondary text-muted-foreground"
                }`}
              >
                {i < 3 ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <span className="font-bold text-lg">#{item.rank}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold truncate">{item.title}</span>
                  {i === 0 && (
                    <Badge variant="default" className="text-[10px]">
                      最契合
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {item.why}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground">契合度</div>
                <div
                  className={`text-xl font-bold tabular-nums ${
                    i === 0 ? "text-brand-red-deep" : "text-foreground"
                  }`}
                >
                  {item.matchRate}%
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  ¥{item.price.toLocaleString()}/月
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-20 text-muted-foreground">加载中...</div>
      }
    >
      <ResultInner />
    </Suspense>
  );
}
