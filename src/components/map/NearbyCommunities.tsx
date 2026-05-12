/**
 * 「站 → 附近小区」面板 — 闭环通勤地图与小区点评
 *
 * 解决产品反思 §2.2 的核心痛点：通勤地图找到站之后用户没有下游动作。
 * 用户点击地铁站后，立即看到步行可达的小区列表，可直接跳转详情页。
 */
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Star, Train } from "lucide-react";
import { haversine, type SubwayStation } from "@/lib/commute";
import type { Community } from "@/types";

interface Props {
  station: SubwayStation | null;
  communities: Community[];
  /** 步行可达半径（米），默认 1500m ≈ 步行 15-18 分钟 */
  walkRadius?: number;
}

/** 步行速度：4.5 km/h = 75 m/min */
const WALK_SPEED_M_PER_MIN = 75;

export function NearbyCommunities({
  station,
  communities,
  walkRadius = 1500,
}: Props) {
  const nearby = useMemo(() => {
    if (!station) return [];
    return communities
      .map((c) => {
        const distM = haversine(
          { lng: station.lng, lat: station.lat },
          c.coordinates
        );
        return {
          community: c,
          distM,
          walkMin: Math.round(distM / WALK_SPEED_M_PER_MIN),
        };
      })
      .filter((x) => x.distM <= walkRadius)
      .sort((a, b) => a.distM - b.distM);
  }, [station, communities, walkRadius]);

  if (!station) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-brand-red-deep" />
          <h2 className="text-base font-bold">站 → 附近小区</h2>
        </div>
        <p className="text-xs text-muted-foreground py-6 text-center bg-secondary/30 rounded-lg">
          点击左上方地图上的地铁站，看这个站步行可达的小区
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-red-deep" />
            <span className="text-brand-red-deep">{station.name}</span>
            <span className="text-sm font-normal text-muted-foreground">
              附近小区
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            步行 {walkRadius / 1000} km 内（约 {Math.round(walkRadius / WALK_SPEED_M_PER_MIN)} 分钟）
          </p>
        </div>
        <Badge variant="soft">{nearby.length} 个候选</Badge>
      </div>

      {nearby.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground bg-secondary/30 rounded-lg">
          <Train className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
          点评库里没有这个站附近的小区
          <p className="text-[11px] mt-1.5 leading-relaxed">
            Demo 版仅含 10 个北京代表性小区作为样本；
            <br />
            完整版会接入更广的小区数据
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {nearby.slice(0, 5).map(({ community, distM, walkMin }) => {
            const hr = community.hiddenRisks;
            const hasBad =
              hr && (hr.utility === "commercial" || hr.heating === "none");
            return (
              <Link
                key={community.id}
                href={`/community/${community.id}`}
                className="block group"
              >
                <div className="p-3 rounded-lg border border-border hover:border-brand-red/40 hover:bg-brand-red-pale/10 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate group-hover:text-brand-red-deep transition-colors">
                        {community.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {community.district} · {community.area} ·{" "}
                        {community.buildingType}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-3 w-3 fill-brand-red text-brand-red" />
                      <span className="text-xs font-semibold tabular-nums">
                        {community.totalRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground tabular-nums">
                        {(distM / 1000).toFixed(1)} km
                      </span>
                      <span>·</span>
                      <span>步行约 {walkMin} 分钟</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {hr?.utility === "commercial" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 border-rose-200 text-rose-600"
                        >
                          ⚠ 商电
                        </Badge>
                      )}
                      {hr?.isRelocation && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 border-amber-200 text-amber-700"
                        >
                          ⚠ 回迁
                        </Badge>
                      )}
                      {!hasBad &&
                        hr?.utility === "residential" &&
                        hr.heating === "central" && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 border-emerald-200 text-emerald-700"
                          >
                            ✓ 集中暖
                          </Badge>
                        )}
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-brand-red-deep group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {nearby.length > 5 && (
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              还有 {nearby.length - 5} 个，去
              <Link href="/community" className="text-brand-red-deep hover:underline ml-0.5">
                完整小区库
              </Link>
              查看
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
