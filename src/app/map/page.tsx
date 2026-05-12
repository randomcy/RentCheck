"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft,
  Building,
  Train,
  Clock,
  Sparkles,
  Heart,
  Search,
  AlertTriangle,
  MapPin,
} from "lucide-react";

import stationsData from "../../../data/subway-stations.json";
import apartmentsData from "../../../data/apartments.json";

import {
  stationsWithinCommuteTime,
  apartmentsNearStations,
  type SubwayStation,
  type Company,
} from "@/lib/commute";
import { usePreferenceStore } from "@/store/preference";
import type { Apartment } from "@/types";
const PlaceSearch = dynamic(
  () => import("@/components/map/PlaceSearch").then((m) => m.PlaceSearch),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 bg-secondary/40 rounded-xl animate-pulse" />
    ),
  }
);

const CommuteMap = dynamic(
  () => import("@/components/map/CommuteMap").then((m) => m.CommuteMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-2xl bg-secondary border border-border flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 rounded-full border-2 border-brand-red border-t-transparent animate-spin" />
          地图加载中…
        </div>
      </div>
    ),
  }
);

const ALL_STATIONS = stationsData as SubwayStation[];
const ALL_APARTMENTS = apartmentsData as Apartment[];

// 一个示例公司兜底，让首次进来就能看到地图
const DEFAULT_COMPANY: Company = {
  id: "default",
  name: "示例 · 国贸 CBD",
  lng: 116.4602,
  lat: 39.9085,
};

export default function MapPage() {
  const [company, setCompany] = useState<Company>(DEFAULT_COMPANY);

  const [maxMinutes, setMaxMinutes] = useState<number>(40);
  const [budgetMax, setBudgetMax] = useState<number>(10000);
  const [activeAptId, setActiveAptId] = useState<string | null>(null);
  const [usePref, setUsePref] = useState<boolean>(true);

  const pref = usePreferenceStore((s) => s.result);
  const binaryPrefs = usePreferenceStore((s) => s.binaryPreferences);

  // ===== 等时圈内的地铁站 =====
  const stationsInRange = useMemo(
    () => stationsWithinCommuteTime(ALL_STATIONS, company, maxMinutes),
    [company, maxMinutes]
  );

  // ===== 等时圈附近的房源（基础筛选） =====
  const aptsBase = useMemo(() => {
    const near = apartmentsNearStations(ALL_APARTMENTS, stationsInRange, 1000);
    return near.filter((apt) => apt.price <= budgetMax);
  }, [stationsInRange, budgetMax]);

  // ===== 叠加硬筛选偏好 =====
  const aptsAfterBinary = useMemo(() => {
    if (!usePref || !binaryPrefs || Object.keys(binaryPrefs).length === 0) {
      return aptsBase;
    }
    return aptsBase.filter((apt) => {
      for (const [key, val] of Object.entries(binaryPrefs)) {
        if (!val) continue;
        const tagMap: Record<string, string> = {
          independent_bathroom: "独卫",
          pet_friendly: "可养宠",
          balcony: "有阳台",
          elevator: "有电梯",
          near_subway: "近地铁",
        };
        const tag = tagMap[key];
        if (tag && !apt.tags.includes(tag)) return false;
      }
      return true;
    });
  }, [aptsBase, binaryPrefs, usePref]);

  const filteredApts = aptsAfterBinary;

  return (
    <div className="container py-8 md:py-10 max-w-7xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        返回首页
      </Link>

      <div className="mb-6">
        <div className="text-xs text-sky-700 font-semibold uppercase tracking-widest mb-2">
          功能二 · 通勤地图
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          先有"通勤可接受"，再有"房源选择"
        </h1>
        <p className="text-muted-foreground">
          搜索你公司或学校的真实地点，AI 反推通勤等时圈内的地铁站，叠加预算和偏好筛选房源。
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        {/* ===== 左侧控制面板 ===== */}
        <div className="space-y-4">
          {/* 1) 搜公司 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-sm">第 1 步 · 搜你的公司位置</h3>
            </div>
            <PlaceSearch
              onPick={(p) =>
                setCompany({
                  id: p.id,
                  name: p.name,
                  lng: p.location.lng,
                  lat: p.location.lat,
                })
              }
              placeholder="搜小红书 / 字节跳动 / 你家小区…"
            />
            <div className="mt-2.5 flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/40 rounded-lg p-2">
              <MapPin className="h-3 w-3 mt-0.5 text-sky-600 shrink-0" />
              <div className="leading-relaxed">
                当前地点：
                <span className="font-medium text-foreground">
                  {company.name}
                </span>
              </div>
            </div>
          </Card>

          {/* 2) 通勤时间 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-sm">
                第 2 步 · 你能忍受的通勤
              </h3>
            </div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">每天单程</span>
              <span className="text-2xl font-bold text-sky-700 tabular-nums">
                ≤ {maxMinutes}
                <span className="text-sm text-muted-foreground font-normal ml-1">
                  分钟
                </span>
              </span>
            </div>
            <Slider
              value={[maxMinutes]}
              min={20}
              max={75}
              step={5}
              onValueChange={(v) => setMaxMinutes(v[0])}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>20 分钟</span>
              <span>75 分钟</span>
            </div>
          </Card>

          {/* 3) 预算 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-sm">第 3 步 · 月租预算上限</h3>
            </div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">每月</span>
              <span className="text-2xl font-bold text-sky-700 tabular-nums">
                ¥{(budgetMax / 1000).toFixed(1)}k
              </span>
            </div>
            <Slider
              value={[budgetMax]}
              min={3000}
              max={20000}
              step={500}
              onValueChange={(v) => setBudgetMax(v[0])}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>¥3k</span>
              <span>¥20k</span>
            </div>
          </Card>

          {/* 4) 偏好画像 */}
          {pref && Object.values(binaryPrefs || {}).some(Boolean) && (
            <Card className="p-4 border-brand-red/20 bg-brand-red-pale/10">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red shrink-0">
                  <Heart className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">叠加你的硬筛选偏好</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    来自人格测试 · 「{pref.personalityTag}」
                  </p>
                </div>
                <button
                  onClick={() => setUsePref((v) => !v)}
                  className={`shrink-0 inline-flex items-center h-5 w-9 rounded-full transition-colors ${
                    usePref ? "bg-brand-red" : "bg-secondary"
                  }`}
                  aria-label="开关"
                >
                  <span
                    className={`block h-4 w-4 bg-white rounded-full transition-transform shadow ${
                      usePref ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(binaryPrefs)
                  .filter(([, v]) => v)
                  .map(([k]) => {
                    const labels: Record<string, string> = {
                      independent_bathroom: "独卫",
                      pet_friendly: "可养宠",
                      balcony: "阳台",
                      elevator: "电梯",
                      near_subway: "近地铁",
                    };
                    return (
                      <Badge
                        key={k}
                        variant={usePref ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {labels[k] ?? k}
                      </Badge>
                    );
                  })}
              </div>
            </Card>
          )}

          {!pref && (
            <Card className="p-4 bg-gradient-to-br from-brand-red-pale/30 to-rose-50 border-brand-red/10">
              <h3 className="font-semibold text-sm mb-1">还没做过人格测试？</h3>
              <p className="text-xs text-muted-foreground mb-3">
                做完后可以把"必须有独卫/阳台"这些硬条件叠加到地图筛选。
              </p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/quiz">2 分钟做一次测试</Link>
              </Button>
            </Card>
          )}

          {/* 5) 结果汇总 */}
          <Card className="p-4 bg-secondary/30">
            <div className="text-xs text-muted-foreground mb-1">筛选结果</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>等时圈内地铁站</span>
                <span className="font-mono font-semibold tabular-nums">
                  {stationsInRange.length} 个
                </span>
              </div>
              <div className="flex justify-between">
                <span>符合条件的房源</span>
                <span className="font-mono font-semibold tabular-nums text-brand-red-deep">
                  {filteredApts.length} 套
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ===== 右侧地图 + 房源列表 ===== */}
        <div className="space-y-4">
          <div className="h-[440px] md:h-[520px]">
            <CommuteMap
              company={company}
              stationsInRange={stationsInRange}
              allStations={ALL_STATIONS}
              apartments={filteredApts}
              maxMinutes={maxMinutes}
              onApartmentClick={(apt) => setActiveAptId(apt.id)}
              activeApartmentId={activeAptId}
            />
          </div>

          {/* 房源列表 */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold">符合的房源</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  按"地铁通勤总时长"从短到长排序
                </p>
              </div>
              <Badge variant="soft">{filteredApts.length} 套</Badge>
            </div>

            {filteredApts.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground bg-secondary/30 rounded-xl">
                <Search className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                没有匹配的房源，试试放宽通勤时间或预算
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredApts.slice(0, 8).map((apt) => {
                  const active = activeAptId === apt.id;
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setActiveAptId(apt.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        active
                          ? "border-brand-red bg-brand-red-pale/30 shadow-sm"
                          : "border-border bg-white hover:border-brand-red/40 hover:bg-brand-red-pale/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-1 flex-1">
                          {apt.title}
                        </h3>
                        <span className="text-sm font-bold text-brand-red-deep tabular-nums shrink-0">
                          ¥{(apt.price / 1000).toFixed(1)}k
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                        <span>{apt.roomType}</span>
                        <span>·</span>
                        <span>{apt.area}</span>
                        <span>·</span>
                        <span>{apt.decoration}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Train className="h-3 w-3 text-sky-600" />
                        <span className="text-sky-700 font-medium">
                          {apt.nearestStation.name}
                        </span>
                        <span className="text-muted-foreground">
                          · 步行 {Math.round(apt.distanceToStation / 80)} 分钟
                          · 通勤约{" "}
                          <span className="font-semibold text-foreground">
                            {Math.round(
                              apt.nearestStation.commuteMinutes +
                                apt.distanceToStation / 80
                            )}
                          </span>{" "}
                          分钟
                        </span>
                      </div>
                      {active && (apt as any).hidden_cons && (apt as any).hidden_cons.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-amber-200/60">
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            中介不会告诉你的
                          </div>
                          <ul className="space-y-0.5">
                            {((apt as any).hidden_cons as string[]).map((hc, hi) => (
                              <li key={hi} className="text-[11px] text-amber-900/85 leading-snug flex gap-1">
                                <span className="text-amber-500">•</span>
                                <span>{hc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredApts.length > 8 && (
              <div className="text-center mt-3 text-xs text-muted-foreground">
                还有 {filteredApts.length - 8} 套，地图上可点击查看
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
