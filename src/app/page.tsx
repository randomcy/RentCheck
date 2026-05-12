import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Brain,
  MessagesSquare,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative">
      {/* ===== Hero + 三入口 ===== */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-red-pale via-brand-red-pale/40 to-background" />
        <div className="absolute top-20 right-[10%] -z-10 h-72 w-72 rounded-full bg-brand-red/10 blur-3xl" />
        <div className="absolute top-40 left-[5%] -z-10 h-56 w-56 rounded-full bg-rose-200/30 blur-3xl" />

        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8 shadow-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              北京 · 内测中
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-[1.05]">
              租房,不是
              <br />
              <span className="bg-gradient-to-r from-brand-red to-rose-500 bg-clip-text text-transparent">
                信息搜集大赛。
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              90% 的痛点不是"找不到房源",而是
              <span className="text-foreground font-medium">不知道自己要什么</span>、
              <span className="text-foreground font-medium">不知道通勤多久能忍</span>、
              <span className="text-foreground font-medium">看不到真实居住体验</span>。
            </p>
          </div>

          {/* ===== 三个功能入口 ===== */}
          <div className="mt-14 grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* 功能一 · 偏好测试 */}
            <Link
              href="/quiz"
              className="group relative rounded-2xl bg-brand-red text-white p-6 text-left shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/80 mb-3">
                  <Brain className="h-3.5 w-3.5" />
                  功能一 · 弄清自己
                </div>
                <div className="text-xl font-bold mb-1.5">2 分钟租房偏好测试</div>
                <div className="text-sm text-white/85 leading-relaxed mb-4">
                  8 道虚构房源选择题,反推你说不清的隐性偏好。
                </div>
                <div className="inline-flex items-center gap-1 text-sm font-medium">
                  开始测试 <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* 功能二 · 通勤地图 */}
            <Link
              href="/map"
              className="group relative rounded-2xl bg-foreground text-background p-6 text-left shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-400/30 blur-2xl group-hover:bg-sky-400/40 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-sky-300 mb-3">
                  <Compass className="h-3.5 w-3.5" />
                  功能二 · 圈定范围
                </div>
                <div className="text-xl font-bold mb-1.5">还原你的通勤地图</div>
                <div className="text-sm text-background/75 leading-relaxed mb-4">
                  搜公司 → 反推等时圈内的全部地铁站,支持双人通勤平衡。
                </div>
                <div className="inline-flex items-center gap-1 text-sm font-medium">
                  查看地图 <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* 功能三 · 小区体检 */}
            <Link
              href="/community"
              className="group relative rounded-2xl bg-white border border-emerald-200 text-foreground p-6 text-left shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-100 blur-2xl group-hover:bg-emerald-200/60 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-700 mb-3">
                  <MessagesSquare className="h-3.5 w-3.5" />
                  功能三 · 看清真相
                </div>
                <div className="text-xl font-bold mb-1.5">小区体检报告</div>
                <div className="text-sm text-muted-foreground leading-relaxed mb-4">
                  聚合真实居住体验,输出优缺点 TOP3、分项评分、引用原文。
                </div>
                <div className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  浏览全部小区 <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            数据底座:真实北京小区 · 高德地图 · 真实居住口碑
          </div>
        </div>
      </section>
    </div>
  );
}
