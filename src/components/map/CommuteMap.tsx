"use client";

import { useEffect, useRef, useState } from "react";
import { loadAMap, prefetchAMap } from "@/lib/amap-loader";
import type {
  SubwayStation,
  Company,
  DualCommuteStation,
} from "@/lib/commute";
import { pickLineColor, expandLines } from "@/lib/subway-colors";

// 模块加载时立即预热 SDK（不等 useEffect）
if (typeof window !== "undefined") prefetchAMap();

export interface SingleStation extends SubwayStation {
  commuteMinutes: number;
}

interface CommuteMapProps {
  /** 主公司位置 */
  companyA: Company;
  /** 第二个公司位置（双人模式） */
  companyB?: Company | null;
  /** 单人模式：等时圈内地铁站 */
  singleStations?: SingleStation[];
  /** 双人模式：两人都满足的地铁站 */
  dualStations?: DualCommuteStation[];
  /** 所有地铁站（作为灰底） */
  allStations: SubwayStation[];
  maxMinutes: number;
  activeStationId?: string | null;
  onStationClick?: (s: SubwayStation) => void;
}

export function CommuteMap({
  companyA,
  companyB,
  singleStations,
  dualStations,
  allStations,
  maxMinutes,
  activeStationId,
  onStationClick,
}: CommuteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDual = !!companyB;

  // ===== 初始化地图（只初始化一次）=====
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    loadAMap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        if (mapRef.current) return; // 防 Strict Mode 双 mount

        const map = new AMap.Map(containerRef.current, {
          zoom: 11,
          center: [companyA.lng, companyA.lat],
          mapStyle: "amap://styles/whitesmoke",
          viewMode: "2D",
        });
        mapRef.current = map;
        map.on("complete", () => {
          if (!cancelled) setMapReady(true);
        });
        setTimeout(() => {
          if (!cancelled) setMapReady(true);
        }, 1500);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("AMap load failed:", e);
        setError("地图加载失败:" + (e?.message || "未知错误"));
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

  // ===== 重新画 overlays（公司 + 站点）=====
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    // 清掉旧的（批量 remove 比逐个快）
    if (overlaysRef.current.length > 0) {
      map.remove(overlaysRef.current);
      overlaysRef.current = [];
    }

    const newOverlays: any[] = [];

    // 等时圈内站点 id 集合
    const inRangeIds = new Set<string>();
    const stationMetaMap: Record<string, {
      minutesA: number;
      minutesB?: number;
      diffMinutes?: number;
    }> = {};

    if (isDual && dualStations) {
      dualStations.forEach((s) => {
        inRangeIds.add(s.id);
        stationMetaMap[s.id] = {
          minutesA: s.minutesA,
          minutesB: s.minutesB,
          diffMinutes: s.diffMinutes,
        };
      });
    } else if (singleStations) {
      singleStations.forEach((s) => {
        inRangeIds.add(s.id);
        stationMetaMap[s.id] = { minutesA: s.commuteMinutes };
      });
    }

    // ---- 1) 所有地铁站 marker ----
    allStations.forEach((s) => {
      const inRange = inRangeIds.has(s.id);
      const active = activeStationId === s.id;
      const lineColor = pickLineColor(s.line);

      let html: string;
      if (inRange) {
        const meta = stationMetaMap[s.id];
        const labelText = isDual && meta.minutesB !== undefined
          ? `${meta.minutesA}/${meta.minutesB}min`
          : `${meta.minutesA}min`;
        const ringSize = active ? 16 : 13;
        html = `
          <div style="
            display:flex; align-items:center; gap:4px;
            transform: translate(-50%, -50%);
            cursor: pointer;
            ${active ? 'z-index:200;' : ''}
          ">
            <div style="
              width:${ringSize}px; height:${ringSize}px;
              background:${lineColor};
              border:2.5px solid white;
              border-radius:50%;
              box-shadow:0 2px 6px rgba(0,0,0,0.25);
              flex-shrink:0;
            "></div>
            <div style="
              background:${active ? lineColor : 'white'};
              color:${active ? 'white' : '#1e293b'};
              border:1px solid ${active ? lineColor : '#e2e8f0'};
              padding:1px 6px;
              border-radius:6px;
              font-size:10px;
              font-weight:600;
              font-family:ui-monospace,monospace;
              white-space:nowrap;
              box-shadow:0 1px 3px rgba(0,0,0,0.12);
            ">
              ${labelText}
            </div>
          </div>`;
      } else {
        // 等时圈外的灰色小点（仅做底图参考）
        html = `
          <div style="
            width:6px; height:6px;
            background:#cbd5e1;
            border:1.5px solid white;
            border-radius:50%;
            transform: translate(-50%, -50%);
          "></div>`;
      }

      const m = new AMap.Marker({
        position: [s.lng, s.lat],
        content: html,
        offset: new AMap.Pixel(0, 0),
        anchor: "center",
        zIndex: inRange ? (active ? 200 : 120) : 80,
      });

      if (inRange) {
        m.on("click", () => onStationClick?.(s));
        m.on("mouseover", () => {
          const lines = expandLines(s.line).join(" · ");
          const meta = stationMetaMap[s.id];
          let label = `${s.name}（${lines}）`;
          if (isDual && meta.minutesB !== undefined) {
            label += ` · A:${meta.minutesA}min B:${meta.minutesB}min · 差${meta.diffMinutes}min`;
          } else {
            label += ` · 通勤${meta.minutesA}分钟`;
          }
          m.setLabel({
            content: label,
            direction: "top",
            offset: new AMap.Pixel(0, -10),
          });
        });
        m.on("mouseout", () => m.setLabel(null));
      }

      newOverlays.push(m);
    });

    // ---- 2) 公司 markers ----
    const buildCompanyMarker = (
      company: Company,
      color: string,
      label: string
    ) => {
      const html = `
        <div style="
          display:flex; align-items:center; gap:5px;
          background:#1e293b; color:white;
          padding:5px 9px;
          border-radius:8px;
          font-size:11px; font-weight:600;
          box-shadow:0 4px 12px rgba(0,0,0,0.3);
          white-space:nowrap;
          transform: translate(-50%, -110%);
          border-bottom: 3px solid ${color};
        ">
          <span style="width:7px;height:7px;background:${color};border-radius:50%;display:inline-block"></span>
          ${label} · ${company.name.split("·")[0].trim()}
        </div>`;
      return new AMap.Marker({
        position: [company.lng, company.lat],
        content: html,
        offset: new AMap.Pixel(0, 0),
        anchor: "center",
        zIndex: 300,
      });
    };

    const markerA = buildCompanyMarker(companyA, "#10b981", isDual ? "A" : "公司");
    newOverlays.push(markerA);

    if (isDual && companyB) {
      const markerB = buildCompanyMarker(companyB, "#f59e0b", "B");
      newOverlays.push(markerB);
    }

    // 批量一次性 add
    map.add(newOverlays);
    overlaysRef.current = newOverlays;

    // ---- 3) 自适应视野 ----
    const focusPoints: Array<[number, number]> = [[companyA.lng, companyA.lat]];
    if (isDual && companyB) focusPoints.push([companyB.lng, companyB.lat]);
    inRangeIds.forEach((id) => {
      const s = allStations.find((x) => x.id === id);
      if (s) focusPoints.push([s.lng, s.lat]);
    });

    if (focusPoints.length > 1) {
      const lngs = focusPoints.map((p) => p[0]);
      const lats = focusPoints.map((p) => p[1]);
      try {
        const bounds = new AMap.Bounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        );
        map.setBounds(bounds, false, [80, 80, 80, 80]);
      } catch {
        map.setCenter([companyA.lng, companyA.lat]);
        map.setZoom(11);
      }
    } else {
      map.setCenter([companyA.lng, companyA.lat]);
      map.setZoom(12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapReady,
    companyA.id,
    companyA.lng,
    companyA.lat,
    companyB?.id,
    companyB?.lng,
    companyB?.lat,
    isDual,
    singleStations?.map((s) => s.id).join(","),
    dualStations?.map((s) => s.id).join(","),
    activeStationId,
  ]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-secondary border border-border">
      {/* 骨架屏占位：地图加载时显示模拟轮廓，不再用转圈 */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 animate-pulse">
          <div className="absolute inset-0 opacity-50" style={{
            backgroundImage:
              "linear-gradient(0deg, transparent 24%, rgba(148, 163, 184, 0.08) 25%, rgba(148, 163, 184, 0.08) 26%, transparent 27%, transparent 74%, rgba(148, 163, 184, 0.08) 75%, rgba(148, 163, 184, 0.08) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(148, 163, 184, 0.08) 25%, rgba(148, 163, 184, 0.08) 26%, transparent 27%, transparent 74%, rgba(148, 163, 184, 0.08) 75%, rgba(148, 163, 184, 0.08) 76%, transparent 77%, transparent)",
            backgroundSize: "60px 60px",
          }} />
          <div className="absolute bottom-4 left-4 text-[11px] text-slate-400 font-medium">
            正在加载北京地图…
          </div>
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-rose-700 bg-rose-50">
          {error}
        </div>
      )}

      {/* 图例 */}
      {!loading && !error && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-card text-[11px] space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-slate-800 border-b-2 border-emerald-500" />
            <span>{isDual ? "A 公司" : "公司位置"}</span>
          </div>
          {isDual && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-slate-800 border-b-2 border-amber-500" />
              <span>B 公司</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white" />
            <span>{isDual ? "两人都≤" : "通勤≤"}{maxMinutes}分钟的站</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>其他地铁站</span>
          </div>
        </div>
      )}
    </div>
  );
}
