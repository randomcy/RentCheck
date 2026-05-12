import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommunityRadar } from "@/components/community/CommunityRadar";
import { MatchBanner } from "@/components/community/MatchBanner";
import { CommunityInteractive } from "@/components/community/CommunityInteractive";
import {
  Star,
  ChevronLeft,
  MessagesSquare,
  Building2,
  Calendar,
  Train,
  ArrowRight,
} from "lucide-react";

import communitiesData from "../../../../data/communities.json";
import postsData from "../../../../data/posts.json";
import type { Community, Post } from "@/types";

const communities = communitiesData as Community[];
const posts = postsData as Post[];

export function generateStaticParams() {
  return communities.map((c) => ({ id: c.id }));
}

export default function CommunityPage({ params }: { params: { id: string } }) {
  const community = communities.find((c) => c.id === params.id);
  if (!community) return notFound();

  const communityPosts = posts.filter((p) => p.communityId === community.id);

  const subscoreLabels: { key: keyof Community["subscores"]; label: string }[] = [
    { key: "noise", label: "周边静谧" },
    { key: "soundproof", label: "隔音表现" },
    { key: "property", label: "物业服务" },
    { key: "safety", label: "治安安全" },
    { key: "amenity", label: "生活配套" },
    { key: "valueForMoney", label: "性价比" },
  ];

  return (
    <div className="container py-10 md:py-14 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          返回首页
        </Link>
        <Link
          href="/community"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          查看全部小区 →
        </Link>
      </div>

      {/* ===== 头部信息 ===== */}
      <Card className="overflow-hidden mb-6">
        <div className="relative h-32 bg-gradient-to-r from-brand-red via-rose-500 to-pink-500">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:24px_24px]" />
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-white/80 mb-1 flex items-center gap-2">
                <MessagesSquare className="h-3 w-3" />
                功能三 · 小区体检报告
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {community.name}
              </h1>
              <div className="text-sm text-white/80 mt-1">
                {community.district} · {community.area}
              </div>
            </div>
            <Badge variant="soft" className="bg-white/95 text-brand-red-deep border-none shrink-0">
              基于 {communityPosts.length} 条真实点评
            </Badge>
          </div>
        </div>

        <div className="p-6 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>建于 {community.buildYear} 年</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{community.buildingType}</span>
            </div>
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4" />
              <span>地铁可达</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                综合评分
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-brand-red-deep tabular-nums">
                  {community.totalRating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5.0</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${
                    n <= Math.round(community.totalRating)
                      ? "fill-brand-red text-brand-red"
                      : "text-muted/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 适合 / 不适合标签 */}
        <div className="border-t border-border/60 px-6 py-4 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
              ✓ 适合
            </div>
            <div className="flex flex-wrap gap-1.5">
              {community.suitableFor.map((s) => (
                <Badge key={s} variant="success" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-700 mb-2 flex items-center gap-1">
              ✗ 不适合
            </div>
            <div className="flex flex-wrap gap-1.5">
              {community.notSuitableFor.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ===== 偏好匹配条幅（核心串联 Feature1 → Feature3）===== */}
      <MatchBanner community={community} />

      {/* ===== 优缺点 + 真实声音（client interactive） ===== */}
      <CommunityInteractive community={community} posts={communityPosts} />

      {/* ===== 分项雷达图 ===== */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold">六维分项评分</h2>
            <p className="text-xs text-muted-foreground mt-1">
              基于真实居住体验聚合，每项 0-5 分
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-[1fr_1fr] gap-6">
          <div className="h-72">
            <CommunityRadar subscores={community.subscores} />
          </div>
          <div className="space-y-3 self-center">
            {subscoreLabels.map(({ key, label }) => {
              const value = community.subscores[key];
              const percent = (value / 5) * 100;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-semibold text-sm tabular-nums">
                      {value.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-red rounded-full transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* CTA */}
      <Card className="p-6 bg-gradient-to-r from-brand-red-pale/40 to-rose-50 border-brand-red/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold mb-1">还想看看其他小区？</h3>
            <p className="text-sm text-muted-foreground">
              浏览全部 10 个小区的体检报告，按你的偏好排序。
            </p>
          </div>
          <Button asChild>
            <Link href="/community">
              查看全部小区 <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
