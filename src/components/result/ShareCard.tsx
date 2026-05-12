"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Share2, ChevronUp, ChevronDown } from "lucide-react";
import type { PreferenceResult } from "@/types";

interface Props {
  result: PreferenceResult;
}

/**
 * 9:16 分享海报卡
 * 用户截屏即可分享；样式专为竖屏视觉优化
 */
export function ShareCard({ result }: Props) {
  const [open, setOpen] = useState(false);
  const top3 = result.sortedWeights.slice(0, 3);
  const t1 = result.sortedWeights[0];
  const t2 = result.sortedWeights[1];

  return (
    <Card className="mt-6 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-rose-500 text-white">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">生成我的「租房人格」分享卡</div>
            <div className="text-xs text-muted-foreground">9:16 竖版海报 · 截屏即可分享</div>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t bg-gradient-to-b from-secondary/30 to-secondary/10 p-6">
          <div className="flex flex-col items-center">
            {/* 9:16 海报 */}
            <div
              className="w-[300px] aspect-[9/16] rounded-3xl overflow-hidden relative shadow-2xl"
              style={{
                background: "linear-gradient(160deg, #FF2442 0%, #ff5470 35%, #ffeaee 100%)",
              }}
            >
              {/* 背景装饰圆 */}
              <div className="absolute top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />

              {/* 顶部 logo */}
              <div className="relative px-6 pt-8">
                <div className="flex items-center gap-2 text-white/90">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                    <span className="text-base">🎯</span>
                  </div>
                  <div className="text-[11px] font-semibold tracking-widest">RENT RADAR</div>
                </div>
                <div className="text-[10px] text-white/70 mt-1">租房雷达 · 偏好画像报告</div>
              </div>

              {/* 大标签 */}
              <div className="relative px-6 mt-10 text-white">
                <div className="text-[11px] uppercase tracking-widest text-white/70 mb-2">你的租房人格</div>
                <div className="text-[28px] font-black leading-tight tracking-tight">
                  #{result.personalityTag}
                </div>
                {result.subTags.slice(0, 2).map((tag) => (
                  <div key={tag} className="text-[13px] font-medium text-white/80 mt-0.5">
                    #{tag}
                  </div>
                ))}
              </div>

              {/* TOP 3 维度 */}
              <div className="relative px-6 mt-6 space-y-2.5">
                {top3.map((w, i) => (
                  <div
                    key={w.attributeId}
                    className="bg-white/85 backdrop-blur rounded-xl px-3 py-2 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${
                          i === 0 ? "bg-brand-red" : i === 1 ? "bg-rose-400" : "bg-amber-400"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="text-base">{w.icon}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{w.name}</span>
                    </div>
                    <span className="text-sm font-bold text-brand-red-deep tabular-nums shrink-0">
                      {(w.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* 一句话总结 */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
                <div className="bg-foreground/85 backdrop-blur rounded-2xl px-4 py-3 text-white">
                  <div className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">一句话总结</div>
                  <div className="text-[13px] font-semibold leading-snug">
                    最在乎{t1?.name}、{t2?.name}
                  </div>
                  <div className="text-[10px] text-white/60 mt-1">
                    扫码生成你自己的画像 · zufang-radar
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <Camera className="h-3.5 w-3.5" />
              <span>截屏保存这张图，发到朋友圈，就能让朋友也来测</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
