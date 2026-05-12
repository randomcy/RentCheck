"use client";

import { useEffect, useRef, useState } from "react";
import { loadAMap } from "@/lib/amap-loader";
import type {
  SubwayStation,
  Company,
} from "@/lib/commute";
import type { Apartment } from "@/types";

interface CommuteMapProps {
  company: Company;
  stationsInRange: Array<SubwayStation & { commuteMinutes: number }>;
  /** 所有地铁站（即使不在等时圈内也画出来，作为对比） */
  allStations: SubwayStation[];
  apartments: Array<Apartment & { distanceToStation: number }>;
  maxMinutes: number;
  onApartmentClick?: (apt: Apartment) => void;
  activeApartmentId?: string | null;
}

declare global {
  interface Window {
    _AMapKey?: string;
  }
}

export function CommuteMap({
  company,
  stationsInRange,
  allStations,
  apartments,
  maxMinutes,
  onApartmentClick,
  activeApartmentId,
}: CommuteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== 初始化地图（只初始化一次）=====
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    loadAMap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        // 防止 Strict Mode 双 mount 时重复 new Map
        if (mapRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: 11,
          center: [company.lng, company.lat],
          mapStyle: "amap://styles/whitesmoke",
          viewMode: "2D",
        });
        mapRef.current = map;
        map.on("complete", () => {
          if (!cancelled) setMapReady(true);
        });
        // 兜底：1.5s 内 complete 没触发也强制就绪
        setTimeout(() => {
          if (!cancelled) setMapReady(true);
        }, 1500);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("AMap load failed:", e);
        setError("地图加载失败：" + (e?.message || "未知错误"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch {}
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 重新画 overlays（公司/地铁/房源/等时圈）=====
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 清掉旧的
    overlaysRef.current.forEach((o) => map.remove(o));
    overlaysRef.current = [];

    const AMap = (window as any).AMap;
    if (!AMap) return;

    // ---- 1. 等时圈范围内的地铁站 highlight（红色） ----
    const inRangeIds = new Set(stationsInRange.map((s) => s.id));

    // ---- 2. 所有地铁站 marker ----
    allStations.forEach((s) => {
      const inRange = inRangeIds.has(s.id);
      const dotColor = inRange ? "#FF2442" : "#cbd5e1";
      const html = `
        <div style="
          width:${inRange ? 14 : 9}px;
          height:${inRange ? 14 : 9}px;
          background:${dotColor};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 1px 3px rgba(0,0,0,0.2);
        "></div>`;
      const m = new AMap.Marker({
        position: [s.lng, s.lat],
        offset: new AMap.Pixel(inRange ? -9 : -7, inRange ? -9 : -7),
        content: html,
        title: s.name,
        zIndex: inRange ? 110 : 100,
      });
      const station = stationsInRange.find((x) => x.id === s.id);
      m.on("mouseover", () => {
        const label = station
          ? `${s.name}（${s.line}）· 通勤 ${station.commuteMinutes} 分钟`
          : `${s.name}（${s.line}）· 超出 ${maxMinutes} 分钟`;
        m.setLabel({ content: label, direction: "top", offset: new AMap.Pixel(0, -6) });
      });
      m.on("mouseout", () => m.setLabel(null));
      map.add(m);
      overlaysRef.current.push(m);
    });

    // ---- 3. 公司 marker ----
    const companyHtml = `
      <div style="
        display:flex;align-items:center;gap:6px;
        background:#1e293b;color:white;
        padding:6px 10px;border-radius:8px;
        font-size:12px;font-weight:600;
        box-shadow:0 4px 12px rgba(0,0,0,0.25);
        white-space:nowrap;
      ">
        <span style="width:8px;height:8px;background:#10b981;border-radius:50%;display:inline-block"></span>
        🏢 ${company.name.split("·")[0].trim()}
      </div>`;
    const companyMarker = new AMap.Marker({
      position: [company.lng, company.lat],
      offset: new AMap.Pixel(-60, -34),
      content: companyHtml,
      zIndex: 200,
    });
    map.add(companyMarker);
    overlaysRef.current.push(companyMarker);

    // ---- 4. 房源 marker ----
    apartments.forEach((apt) => {
      const active = activeApartmentId === apt.id;
      const html = `
        <div style="
          display:flex;align-items:center;
          background:${active ? "#FF2442" : "white"};
          color:${active ? "white" : "#1e293b"};
          border:1.5px solid ${active ? "#FF2442" : "#FF244266"};
          padding:3px 8px;border-radius:999px;
          font-size:11px;font-weight:600;
          box-shadow:0 2px 6px rgba(0,0,0,${active ? 0.3 : 0.15});
          cursor:pointer;
          white-space:nowrap;
        ">
          ¥${(apt.price / 1000).toFixed(1)}k
        </div>`;
      const m = new AMap.Marker({
        position: [apt.coordinates.lng, apt.coordinates.lat],
        offset: new AMap.Pixel(-22, -12),
        content: html,
        zIndex: active ? 150 : 120,
      });
      m.on("click", () => onApartmentClick?.(apt));
      map.add(m);
      overlaysRef.current.push(m);
    });

    // ---- 5. 自适应视野 ----
    // 只括入：公司 + 等时圈内地铁站 + 符合房源
    const focusPoints: Array<[number, number]> = [[company.lng, company.lat]];
    stationsInRange.forEach((s) => focusPoints.push([s.lng, s.lat]));
    apartments.forEach((a) =>
      focusPoints.push([a.coordinates.lng, a.coordinates.lat])
    );
    if (focusPoints.length > 1) {
      const lngs = focusPoints.map((p) => p[0]);
      const lats = focusPoints.map((p) => p[1]);
      const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
      const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
      try {
        const bounds = new AMap.Bounds(sw, ne);
        map.setBounds(bounds, false, [80, 80, 80, 80]);
      } catch (e) {
        map.setCenter([company.lng, company.lat]);
        map.setZoom(11);
      }
    } else {
      map.setCenter([company.lng, company.lat]);
      map.setZoom(12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapReady,
    company.id,
    stationsInRange.map((s) => s.id).join(","),
    apartments.map((a) => a.id).join(","),
    activeApartmentId,
  ]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-secondary border border-border">
      <div ref={containerRef} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-brand-red border-t-transparent animate-spin" />
            地图加载中…
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-rose-700 bg-rose-50">
          {error}
        </div>
      )}
      {/* 图例 */}
      {!loading && !error && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-card text-[11px] space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>公司位置</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-red" />
            <span>通勤 ≤ {maxMinutes} 分钟地铁站</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>其他地铁站</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-1.5 py-0.5 bg-white border border-brand-red/50 rounded-full text-[9px] text-brand-red-deep">
              ¥k
            </span>
            <span>房源（点击查看）</span>
          </div>
        </div>
      )}
    </div>
  );
}
