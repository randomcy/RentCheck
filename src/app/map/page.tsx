"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft,
  Train,
  Clock,
  MapPin,
  Users,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";

import fallbackStations from "../../../data/subway-stations.json";
import communitiesData from "../../../data/communities.json";
import type { Community } from "@/types";
import { NearbyCommunities } from "@/components/map/NearbyCommunities";

import {
  stationsWithinCommuteTime,
  stationsForTwoPeople,
  type SubwayStation,
  type Company,
} from "@/lib/commute";

import { pickLineColor, expandLines } from "@/lib/subway-colors";

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
      <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 animate-pulse" />
    ),
  }
);

const FALLBACK_STATIONS = fallbackStations as SubwayStation[];

const DEFAULT_COMPANY_A: Company = {
  id: "default_a",
  name: "示例 · 国贸 CBD",
  lng: 116.4602,
  lat: 39.9085,
};

const DEFAULT_COMPANY_B: Company = {
  id: "default_b",
  name: "示例 · 望京 SOHO",
  lng: 116.4770,
  lat: 39.9970,
};

const LIST_PAGE_SIZE = 24;

export default function MapPage() {
  const [allStations, setAllStations] = useState<SubwayStation[]>(FALLBACK_STATIONS);
  const [loadingStations, setLoadingStations] = useState(true);
  const [stationSource, setStationSource] = useState<"cache" | "amap" | "fallback">(
    "fallback"
  );

  const [companyA, setCompanyA] = useState<Company>(DEFAULT_COMPANY_A);
  const [companyB, setCompanyB] = useState<Company | null>(null);
  const [maxMinutesA, setMaxMinutesA] = useState<number>(40);
  const [maxMinutesB, setMaxMinutesB] = useState<number>(40);
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);

  const isDual = companyB !== null;

  // ===== 进入页面时拉取全量地铁站（动态 import，避免 SSR 加载高德 SDK）=====
  useEffect(() => {
    let cancelled = false;
    import("@/lib/subway-fetcher")
      .then((mod) => mod.fetchAllBeijingStations(FALLBACK_STATIONS))
      .then(({ stations, source }) => {
        if (cancelled) return;
        setAllStations(stations);
        setStationSource(source);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingStations(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== 单人模式：等时圈内地铁站 =====
  const singleStations = useMemo(
    () => stationsWithinCommuteTime(allStations, companyA, maxMinutesA),
    [allStations, companyA, maxMinutesA]
  );

  // ===== 双人模式：A/B 各自上限内 =====
  const dualStations = useMemo(() => {
    if (!companyB) return [];
    return stationsForTwoPeople(
      allStations,
      companyA,
      companyB,
      maxMinutesA,
      maxMinutesB
    );
  }, [allStations, companyA, companyB, maxMinutesA, maxMinutesB]);

  const matchedStations = isDual ? dualStations : singleStations;
  const totalMatched = matchedStations.length;
  const visibleStations = matchedStations.slice(0, listPage * LIST_PAGE_SIZE);
  const activeStation = useMemo(
    () =>
      activeStationId
        ? allStations.find((s) => s.id === activeStationId) ?? null
        : null,
    [activeStationId, allStations]
  );
  const allCommunities = communitiesData as Community[];
  const hasMore = totalMatched > visibleStations.length;

  // 切换模式或筛选条件变了，重置分页
  useEffect(() => {
    setListPage(1);
  }, [isDual, maxMinutesA, maxMinutesB, companyA.id, companyB?.id]);

  const handleEnableDual = () => {
    setCompanyB(DEFAULT_COMPANY_B);
  };

  const handleDisableDual = () => {
    setCompanyB(null);
  };

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
        <div className="text-xs text-sky-700 font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
          功能二 · 通勤地图
          {loadingStations ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
              <Loader2 className="h-3 w-3 animate-spin" />
              正在加载全量地铁站…
            </span>
          ) : (
            <span className="text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
              已加载 {allStations.length} 站
              {stationSource === "cache" && " · 缓存"}
              {stationSource === "fallback" && " · 离线兜底"}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          先有"通勤可接受"，再去看房
        </h1>
        <p className="text-muted-foreground">
          {isDual
            ? "情侣 / 室友模式：两人各自设定能忍受的通勤时长，找出双方都满意的地铁站。"
            : "搜索你公司的位置，AI 反推通勤等时圈内的所有地铁站。"}
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        {/* ===== 左侧控制面板 ===== */}
        <div className="space-y-4">
          {/* 模式切换 */}
          <Card className="p-3 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-semibold">双人通勤模式</span>
              </div>
              <button
                onClick={isDual ? handleDisableDual : handleEnableDual}
                className={`inline-flex items-center h-5 w-9 rounded-full transition-colors ${
                  isDual ? "bg-brand-red" : "bg-slate-200"
                }`}
                aria-label="切换双人模式"
              >
                <span
                  className={`block h-4 w-4 bg-white rounded-full transition-transform shadow ${
                    isDual ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            {isDual && (
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                A、B 各自独立设定通勤上限，按「两人时长差小、总时长短」排序。
              </p>
            )}
          </Card>

          {/* 公司 A */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                {isDual ? "A" : "1"}
              </span>
              <h3 className="font-semibold text-sm">
                {isDual ? "A 的公司位置" : "你的公司位置"}
              </h3>
            </div>
            <PlaceSearch
              onPick={(p) =>
                setCompanyA({
                  id: p.id,
                  name: p.name,
                  lng: p.location.lng,
                  lat: p.location.lat,
                })
              }
              placeholder="搜公司 / 字节跳动 / 你家小区…"
            />
            <div className="mt-2.5 flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/40 rounded-lg p-2">
              <MapPin className="h-3 w-3 mt-0.5 text-emerald-600 shrink-0" />
              <div className="leading-relaxed">
                当前地点：
                <span className="font-medium text-foreground">
                  {companyA.name}
                </span>
              </div>
            </div>

            {/* A 通勤 slider —— 单人模式时也用 */}
            <div className="mt-4 pt-3 border-t border-border/60">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-emerald-600" />
                  {isDual ? "A 能忍受的通勤" : "你能忍受的通勤"}
                </span>
                <span className="text-lg font-bold text-emerald-700 tabular-nums">
                  ≤ {maxMinutesA}
                  <span className="text-xs text-muted-foreground font-normal ml-0.5">
                    分钟
                  </span>
                </span>
              </div>
              <Slider
                value={[maxMinutesA]}
                min={15}
                max={90}
                step={5}
                onValueChange={(v) => setMaxMinutesA(v[0])}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>15</span>
                <span>90 分钟</span>
              </div>
            </div>
          </Card>

          {/* 公司 B（双人模式才显示）*/}
          {isDual && companyB && (
            <Card className="p-4 border-amber-300/40 bg-amber-50/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    B
                  </span>
                  <h3 className="font-semibold text-sm">B 的公司位置</h3>
                </div>
                <button
                  onClick={handleDisableDual}
                  className="text-muted-foreground hover:text-foreground"
                  title="关闭双人模式"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <PlaceSearch
                onPick={(p) =>
                  setCompanyB({
                    id: p.id,
                    name: p.name,
                    lng: p.location.lng,
                    lat: p.location.lat,
                  })
                }
                placeholder="搜对方的公司或学校…"
              />
              <div className="mt-2.5 flex items-start gap-2 text-[11px] text-muted-foreground bg-white/60 rounded-lg p-2">
                <MapPin className="h-3 w-3 mt-0.5 text-amber-600 shrink-0" />
                <div className="leading-relaxed">
                  当前地点：
                  <span className="font-medium text-foreground">
                    {companyB.name}
                  </span>
                </div>
              </div>

              {/* B 通勤 slider */}
              <div className="mt-4 pt-3 border-t border-amber-200/60">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-amber-600" />
                    B 能忍受的通勤
                  </span>
                  <span className="text-lg font-bold text-amber-700 tabular-nums">
                    ≤ {maxMinutesB}
                    <span className="text-xs text-muted-foreground font-normal ml-0.5">
                      分钟
                    </span>
                  </span>
                </div>
                <Slider
                  value={[maxMinutesB]}
                  min={15}
                  max={90}
                  step={5}
                  onValueChange={(v) => setMaxMinutesB(v[0])}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>15</span>
                  <span>90 分钟</span>
                </div>
              </div>
            </Card>
          )}

          {/* 结果汇总 */}
          <Card className="p-4 bg-secondary/30">
            <div className="text-xs text-muted-foreground mb-2">筛选结果</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-brand-red-deep">
                {totalMatched}
              </span>
              <span className="text-sm text-muted-foreground">
                个{isDual ? "双方都满意的" : "可达"}地铁站
              </span>
            </div>
            {isDual && dualStations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                最公平：
                <span className="font-medium text-foreground ml-1">
                  {dualStations[0].name}
                </span>
                <span className="ml-1.5 font-mono">
                  ({dualStations[0].minutesA}/{dualStations[0].minutesB}min)
                </span>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground leading-relaxed">
              候选池：{allStations.length} 站
              {stationSource === "amap" && "（高德实时）"}
              {stationSource === "cache" && "（本地缓存 24h）"}
              {stationSource === "fallback" && "（离线兜底，约 30 站）"}
            </div>
          </Card>
        </div>

        {/* ===== 右侧地图 + 站点列表 ===== */}
        <div className="space-y-4">
          <div className="h-[440px] md:h-[520px]">
            <CommuteMap
              companyA={companyA}
              companyB={companyB}
              singleStations={isDual ? undefined : singleStations}
              dualStations={isDual ? dualStations : undefined}
              allStations={allStations}
              maxMinutes={maxMinutesA}
              maxMinutesA={maxMinutesA}
              maxMinutesB={maxMinutesB}
              activeStationId={activeStationId}
              onStationClick={(s) => setActiveStationId(s.id)}
            />
          </div>

          {/* 站点列表 */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Train className="h-4 w-4 text-sky-700" />
                  {isDual ? "两人都满意的地铁站" : "符合通勤的地铁站"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isDual
                    ? "按「两人时长差」升序，差越小代表越「公平」"
                    : "按 通勤分钟数 升序"}
                </p>
              </div>
              <Badge variant="soft">
                {visibleStations.length} / {totalMatched}
              </Badge>
            </div>

            {totalMatched === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground bg-secondary/30 rounded-xl">
                <Train className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                {isDual
                  ? "没有两人都满足的站，试试放宽某一方的通勤时间"
                  : "没有符合条件的站，试试放宽通勤时间"}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {visibleStations.map((s: any) => {
                  const active = activeStationId === s.id;
                  const color = pickLineColor(s.line);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveStationId(s.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        active
                          ? "border-brand-red bg-brand-red-pale/30 shadow-sm"
                          : "border-border bg-white hover:border-brand-red/40 hover:bg-brand-red-pale/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <h3 className="font-semibold text-sm leading-snug truncate">
                            {s.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {expandLines(s.line).slice(0, 3).map((line) => (
                          <span
                            key={line}
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: pickLineColor(line) + "15",
                              color: pickLineColor(line),
                            }}
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                      {isDual ? (
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-emerald-700 font-mono font-semibold">
                              {s.minutesA}
                            </span>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-amber-700 font-mono font-semibold">
                              {s.minutesB}
                            </span>
                            <span className="text-muted-foreground">min</span>
                          </div>
                          <span className="text-muted-foreground">
                            差{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {s.diffMinutes}
                            </span>
                            min
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            <span>
                              通勤约{" "}
                              <span className="font-semibold text-foreground tabular-nums">
                                {s.commuteMinutes}
                              </span>{" "}
                              分钟
                            </span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setListPage((p) => p + 1)}
                  className="text-xs font-medium px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors"
                >
                  再加载 {Math.min(LIST_PAGE_SIZE, totalMatched - visibleStations.length)} 个
                  <span className="text-muted-foreground ml-1">
                    （还剩 {totalMatched - visibleStations.length}）
                  </span>
                </button>
              </div>
            )}
          </Card>

          {/* 站 → 附近小区闭环（修复产品反思 §2.2 「找到站之后没下文」） */}
          <NearbyCommunities
            station={activeStation}
            communities={allCommunities}
          />
        </div>
      </div>
    </div>
  );
}
