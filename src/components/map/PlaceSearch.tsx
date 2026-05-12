"use client";

/**
 * 真实地点搜索框 —— 调用高德 AutoComplete + PlaceSearch
 * 用户输入公司名 / 我家小区 / 建外 soho 都能搜到真实经纬度
 */
import { useEffect, useRef, useState } from "react";
import { loadAMap, prefetchAMap } from "@/lib/amap-loader";
import { Search, X, Loader2 } from "lucide-react";

// 模块加载时即预热 AMap SDK
if (typeof window !== "undefined") prefetchAMap();

interface Tip {
  id: string;
  name: string;
  address: string;
  district: string;
  location: { lng: number; lat: number };
}

interface PlaceSearchProps {
  onPick: (place: Tip) => void;
  placeholder?: string;
  /** 限定城市，默认北京 */
  city?: string;
}

export function PlaceSearch({
  onPick,
  placeholder = "搜公司、地铁站或小区名…",
  city = "010", // 北京
}: PlaceSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRef = useRef<any>(null);
  const debounceRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ===== 初始化 AutoComplete =====
  useEffect(() => {
    let cancelled = false;
    setError(null);

    loadAMap()
      .then((AMap) => {
        if (cancelled) return;
        autoRef.current = new AMap.AutoComplete({ city, citylimit: true });
      })
      .catch((e) => {
        if (cancelled) return;
        setError("加载失败：" + (e?.message || "请检查 key 和安全密钥"));
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  // ===== 搜索（防抖）=====
  useEffect(() => {
    if (!keyword || !autoRef.current) {
      setTips([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      autoRef.current.search(keyword, (status: string, result: any) => {
        setLoading(false);
        if (status === "complete" && result?.tips) {
          const list: Tip[] = (result.tips as any[])
            .filter((t) => t.location) // 必须有坐标
            .slice(0, 10)
            .map((t, i) => ({
              id: `${t.id || i}_${t.adcode || ""}_${i}`,
              name: t.name,
              address: t.district + (t.address || ""),
              district: t.district,
              location: { lng: +t.location.lng, lat: +t.location.lat },
            }));
          setTips(list);
          setOpen(true);
        } else {
          setTips([]);
        }
      });
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [keyword]);

  // ===== 点击外部收起 =====
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => tips.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {keyword && !loading && (
          <button
            onClick={() => {
              setKeyword("");
              setTips([]);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && <div className="mt-1.5 text-[11px] text-rose-600">{error}</div>}

      {open && tips.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-lg max-h-72 overflow-auto">
          {tips.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onPick(t);
                setKeyword(t.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-sky-50/60 border-b border-border/40 last:border-0 transition-colors"
            >
              <div className="text-sm font-medium leading-tight">{t.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {t.address}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
