import Link from "next/link";
import { Radar } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft transition-transform group-hover:scale-105">
            <Radar className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">租房雷达</span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">Rent Radar · 北京</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/quiz"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            租房偏好测试
          </Link>
          <Link
            href="/map"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            通勤地图
          </Link>
          <Link
            href="/community"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            小区体检
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center rounded-full bg-brand-red-pale px-3 py-1 text-xs font-medium text-brand-red-deep">
            Beta · 0.1
          </span>
        </div>
      </div>
    </header>
  );
}
