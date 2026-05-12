"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Radar as RadarChart2,
  ResponsiveContainer,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadarChart,
} from "recharts";
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
} from "lucide-react";
import { usePreferenceStore } from "@/store/preference";
import conjointConfig from "../../../data/conjoint-config.json";
import type { ConjointConfig, PreferenceResult } from "@/types";
import { AntiBrokerWidget } from "@/components/result/AntiBrokerWidget";
import { ShareCard } from "@/components/result/ShareCard";

// ============================================================
// 工具：把 PreferenceResult 转为雷达图数据
// ============================================================
function buildRadarData(result: PreferenceResult) {
  // 雷达图用 0-100 的相对值（最大权重映射到 100）
  const max = Math.max(...result.weights.map((w) => w.weight), 0.001);
  return result.weights.map((w) => ({
    axis: w.name,
    value: Math.round((w.weight / max) * 100),
    actualWeight: Math.round(w.weight * 100),
    fullMark: 100,
  }));
}

// 权重条颜色映射
const BAR_COLORS = [
  "bg-brand-red",
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
];

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
          <Link href="/map">
            或者，看看符合偏好的房源
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 场景 A 结果展示（真实数据）
// ============================================================
function QuizResult() {
  const { result, binaryPreferences } = usePreferenceStore();
  const config = conjointConfig as ConjointConfig;

  // 避免 SSR/CSR 不一致 → 只在客户端 mount 后渲染
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

  // 没有结果（直接打开 /result）→ 引导回去做测试
  if (!result) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-3">还没有偏好画像</h2>
        <p className="text-muted-foreground mb-6">
          完成 8 道偏好题，我们就能告诉你最在乎什么
        </p>
        <Button asChild size="lg">
          <Link href="/quiz">开始租房偏好测试</Link>
        </Button>
      </div>
    );
  }

  const radarData = buildRadarData(result);
  const sortedWeights = result.sortedWeights;
  const maxWeight = sortedWeights[0]?.weight ?? 0.001;
  const top1 = sortedWeights[0];
  const top2 = sortedWeights[1];
  const bottom1 = sortedWeights[sortedWeights.length - 1];

  // binary preferences 的标签
  const filterLabels = config.binaryFilters
    .filter((f) => binaryPreferences[f.id])
    .map((f) => `${f.icon} ${f.label}`);

  return (
    <div>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-red-deep mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          你的偏好画像（场景 A · 10 题完成）
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
          选房时你最看重
          <span className="bg-gradient-to-r from-brand-red to-rose-500 bg-clip-text text-transparent">
            {" "}{top1?.icon}{top1?.name}{" "}
          </span>
          和
          <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
            {" "}{top2?.icon}{top2?.name}{" "}
          </span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mt-3">
          愿意为它们在「{bottom1?.icon} {bottom1?.name}」上做出妥协。
          <span className="block mt-2 text-sm">
            这是基于你 10 道题选择的 Conjoint Analysis 结果。{result.description}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">租房人格：</span>
          <Badge variant="soft">#{result.personalityTag}</Badge>
          {result.subTags.map((tag) => (
            <Badge key={tag} variant="outline">#{tag}</Badge>
          ))}
        </div>

        {/* 硬筛选条件 */}
        {filterLabels.length > 0 && (
          <div className="mt-4 flex items-start gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0 mt-1">
              另外你要求：
            </span>
            <div className="flex flex-wrap gap-2">
              {filterLabels.map((label) => (
                <Badge key={label} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 雷达图 */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-1">偏好雷达图</h2>
          <p className="text-xs text-muted-foreground mb-4">
            数值越高，说明你越看重这个维度（最大值映射到 100）
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <RadarChart2
                  name="你的偏好"
                  dataKey="value"
                  stroke="#FF2442"
                  fill="#FF2442"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 权重排序 */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-1">维度权重排序</h2>
          <p className="text-xs text-muted-foreground mb-4">
            这是你选房时各维度的相对重要性（合计 100%）
          </p>
          <div className="space-y-4 mt-6">
            {sortedWeights.map((w, i) => (
              <div key={w.attributeId}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums w-4">
                      #{i + 1}
                    </span>
                    <span className="text-base">{w.icon}</span>
                    <span className="font-medium">{w.name}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-brand-red-deep">
                    {(w.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full ${BAR_COLORS[i] ?? "bg-gray-300"} rounded-full transition-all duration-700`}
                    style={{
                      width: `${(w.weight / maxWeight) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 解读卡片 */}
      <Card className="mt-6 p-6 bg-brand-red-pale/40 border-brand-red/10">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-red-deep" />
          我们的解读
        </h3>
        <div className="space-y-2 text-sm text-foreground/80 leading-relaxed">
          <p>
            你是典型的<strong className="text-brand-red-deep">{result.personalityTag}</strong>租客。
            你最在乎 <strong>{top1?.name}</strong>（{(top1?.weight * 100).toFixed(0)}%）和
            <strong> {top2?.name}</strong>（{(top2?.weight * 100).toFixed(0)}%），
            这两项加起来占了你决策权重的 {((top1.weight + top2.weight) * 100).toFixed(0)}%。
          </p>
          <p>
            相反，你愿意在 <strong>{bottom1?.name}</strong>（仅 {(bottom1?.weight * 100).toFixed(0)}%）
            上做出妥协——这意味着那些主打"优质{bottom1?.name}"但其他维度一般的房源，可以从你的候选里过滤掉。
          </p>
          <p>
            接下来，我们会根据这个画像帮你筛选房源——把预算和注意力都集中在你真正在乎的事上。
          </p>
        </div>
      </Card>

      {/* 分享卡 9:16 海报 */}
      <ShareCard result={result} />

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
    <Suspense fallback={<div className="container py-20 text-muted-foreground">加载中...</div>}>
      <ResultInner />
    </Suspense>
  );
}
