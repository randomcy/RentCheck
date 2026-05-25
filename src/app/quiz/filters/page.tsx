"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ArrowRight, Filter, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePreferenceStore } from "@/store/preference";
import conjointConfig from "../../../../data/conjoint-config.json";
import type { ConjointConfig } from "@/types";

export default function FiltersPage() {
  const router = useRouter();
  const config = conjointConfig as ConjointConfig;
  const { setBinaryPreferences, result } = usePreferenceStore();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function handleSubmit() {
    setBinaryPreferences(selected);
    router.push("/result?from=quiz");
  }

  function handleSkip() {
    setBinaryPreferences({});
    router.push("/result?from=quiz");
  }

  // 如果没有完成 quiz 直接来这里，提示一下
  if (!result) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">
          还没有完成偏好测试，先去做一下吧
        </p>
        <Button asChild>
          <Link href="/quiz">开始测试</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <Link
        href="/quiz"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        返回测试
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-red-deep mb-2">
          <Filter className="h-3.5 w-3.5" />
          最后一步 · 硬性要求
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          有没有"必须有"的条件？
        </h1>
        <p className="mt-2 text-muted-foreground">
          不同于上面的偏好排序，这里勾选的条件会作为<strong className="text-foreground">硬筛选</strong>用——不满足的房源直接排除。
          如果都不在意，可以直接跳过。
        </p>
      </div>

      {/* 进度提示 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            已完成 13 道偏好题 · 最后 1 步
          </span>
          <span className="text-xs text-muted-foreground">90%</span>
        </div>
        <Progress value={90} />
      </div>

      {/* 选项卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        {config.binaryFilters.map((filter) => {
          const isSelected = !!selected[filter.id];
          return (
            <motion.div
              key={filter.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                onClick={() => toggle(filter.id)}
                className={cn(
                  "cursor-pointer p-4 flex flex-col items-center justify-center text-center gap-2 transition-all h-full min-h-[120px]",
                  isSelected
                    ? "border-brand-red bg-brand-red-pale/30 shadow-card-hover"
                    : "hover:border-primary/30"
                )}
              >
                <div className="text-3xl">{filter.icon}</div>
                <div className="text-sm font-medium">{filter.label}</div>
                {isSelected && (
                  <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={handleSubmit} className="flex-1">
          看我的偏好画像
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={handleSkip}>
          都不在意，跳过
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        已选 <span className="font-semibold text-foreground">
          {Object.values(selected).filter(Boolean).length}
        </span> 项硬筛选条件
      </p>
    </div>
  );
}
