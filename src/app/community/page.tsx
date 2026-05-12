"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Sparkles,
  Star,
  ArrowRight,
  MapPin,
  Building2,
  Heart,
} from "lucide-react";
import { usePreferenceStore } from "@/store/preference";
import { rankCommunities, matchLevelMeta } from "@/lib/matching";

import communitiesData from "../../../data/communities.json";
import type { Community } from "@/types";

const communities = communitiesData as Community[];

export default function CommunityIndexPage() {
  const pref = usePreferenceStore((s) => s.result);

  // 如果做过 quiz → 按匹配度排序；否则按总评分排序
  const ranked = useMemo(() => {
    if (!pref) {
      return communities
        .map((c) => ({ ...c, match: null }))
        .sort((a, b) => b.totalRating - a.totalRating);
    }
    return rankCommunities(communities, pref);
  }, [pref]);

  return (
    <div className="container py-10 md:py-14 max-w-6xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        返回首页
      </Link>

      {/* ===== 头部 ===== */}
      <div className="mb-8">
        <div className="text-xs text-brand-red-deep font-semibold uppercase tracking-widest mb-2">
          功能三 · 小区体检
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {pref ? "为你筛选的北京小区" : "热门小区一览"}
        </h1>
        <p className="text-muted-foreground">
          {pref
            ? `根据你的偏好画像「${pref.personalityTag}」，从 ${communities.length} 个小区中按匹配度排序`
            : "做完租房偏好测试后，这里将按你的偏好重新排序"}
        </p>
      </div>

      {/* ===== 未做 quiz 的横幅 ===== */}
      {!pref && (
        <Card className="p-5 mb-8 bg-gradient-to-r from-brand-red-pale/40 to-rose-50 border-brand-red/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">
                  让小区按你的偏好排序
                </h3>
                <p className="text-sm text-muted-foreground">
                  2 分钟做完租房偏好测试，AI 会给每个小区算"和你的匹配度"
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/quiz">
                开始测试 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* ===== 偏好画像迷你卡（已做 quiz） ===== */}
      {pref && (
        <Card className="p-4 mb-6 border-brand-red/20 bg-brand-red-pale/20">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
              <Heart className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-0.5">
                你的偏好画像
              </div>
              <div className="text-sm font-semibold">
                {pref.personalityTag}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/result">查看完整结果</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* ===== 小区列表 ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ranked.map((c, idx) => {
          const isTop = pref && idx < 3;
          return (
            <Link
              key={c.id}
              href={`/community/${c.id}`}
              className="group block"
            >
              <Card className="h-full overflow-hidden hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5">
                {/* 顶部色带 */}
                <div
                  className={`relative h-20 ${
                    isTop
                      ? "bg-gradient-to-r from-brand-red via-rose-500 to-pink-500"
                      : "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500"
                  }`}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:20px_20px]" />
                  {pref && c.match && (
                    <div className="absolute top-3 right-3 bg-white/95 rounded-lg px-2 py-1 shadow-sm">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-brand-red-deep tabular-nums">
                          {c.match.score}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          / 100
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground -mt-0.5">
                        匹配度
                      </div>
                    </div>
                  )}
                  {pref && idx === 0 && (
                    <Badge
                      variant="soft"
                      className="absolute top-3 left-3 bg-white/95 text-brand-red-deep border-none text-[10px]"
                    >
                      最匹配
                    </Badge>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-base mb-1 group-hover:text-brand-red transition-colors line-clamp-1">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {c.district} · {c.area}
                    </span>
                  </div>

                  {/* 匹配理由 / 推荐人群 */}
                  {pref && c.match ? (
                    <div className="space-y-2 mb-3">
                      {c.match.reasons.length > 0 ? (
                        c.match.reasons.slice(0, 1).map((r, i) => (
                          <div
                            key={i}
                            className="text-xs text-emerald-700 bg-emerald-50/60 rounded-md px-2 py-1.5 line-clamp-2"
                          >
                            <span className="font-semibold">
                              {r.label} {r.score.toFixed(1)}
                            </span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {r.reason}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-2 py-1.5 line-clamp-2">
                          {c.suitableFor.slice(0, 2).join(" · ")}
                        </div>
                      )}
                      {c.match.risks.length > 0 && (
                        <div className="text-xs text-amber-700 bg-amber-50/60 rounded-md px-2 py-1.5 line-clamp-2">
                          <span className="font-semibold">
                            注意 {c.match.risks[0].label}
                          </span>
                          <span className="text-muted-foreground">
                            {" · "}
                            {c.match.risks[0].reason}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {c.suitableFor.slice(0, 2).map((s) => (
                        <Badge key={s} variant="soft" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-brand-red text-brand-red" />
                      <span className="text-sm font-semibold tabular-nums">
                        {c.totalRating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {c.buildYear} · {c.buildingType}
                    </div>
                  </div>

                  {/* 隐形硬伤提示（仅在有负面信号时显示） */}
                  {c.hiddenRisks && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.hiddenRisks.utility === "commercial" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-rose-200 text-rose-600 bg-rose-50/40"
                        >
                          ⚠ 商水商电
                        </Badge>
                      )}
                      {c.hiddenRisks.heating === "self" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-200 text-amber-700 bg-amber-50/40"
                        >
                          ⚠ 自采暖
                        </Badge>
                      )}
                      {c.hiddenRisks.heating === "none" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-rose-200 text-rose-600 bg-rose-50/40"
                        >
                          ⚠ 无供暖
                        </Badge>
                      )}
                      {c.hiddenRisks.isRelocation && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-200 text-amber-700 bg-amber-50/40"
                        >
                          ⚠ 含回迁房
                        </Badge>
                      )}
                      {c.hiddenRisks.utility === "residential" &&
                        c.hiddenRisks.heating === "central" &&
                        !c.hiddenRisks.isRelocation && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50/40"
                          >
                            ✓ 集中供暖 · 民电
                          </Badge>
                        )}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
