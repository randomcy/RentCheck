import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "租房雷达 · 帮年轻人租到真正适合自己的房子",
  description:
    "用 Conjoint Analysis 反推你的隐性偏好，结合通勤地图和真实居住声音，告诉你哪个小区才是你的菜。",
  keywords: ["北京租房", "租房偏好测试", "通勤地图", "小区评价"],
};

export const viewport: Viewport = {
  themeColor: "#FF2442",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 高德地图预连接：提前打通 DNS + TLS，减少地图首帧加载时间 */}
        <link rel="preconnect" href="https://webapi.amap.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://restapi.amap.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://webrd01.is.autonavi.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://webrd02.is.autonavi.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://webrd03.is.autonavi.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://webrd04.is.autonavi.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://vdata.amap.com" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-border/60 bg-background py-8 mt-16">
          <div className="container text-center text-xs text-muted-foreground">
            <p>租房雷达 · 演示版本 · 数据均为虚构</p>
            <p className="mt-1">© 2025 zufang-radar</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
