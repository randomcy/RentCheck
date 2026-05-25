import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "租房雷达 · 帮年轻人租到真正适合自己的房子",
  description:
    "用偏好测试反推你真正在意的事，结合通勤地图和真实居住声音，告诉你哪个小区才是你的菜。",
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
        {/* 高德地图域名只做 dns-prefetch（非阻塞）；TLS 预连接放到 /map 路由里按需建立，避免拖慢首页加载 */}
        <link rel="dns-prefetch" href="https://webapi.amap.com" />
        <link rel="dns-prefetch" href="https://restapi.amap.com" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-border/60 bg-background py-8 mt-16">
          <div className="container text-center text-xs text-muted-foreground">
            <p>租房雷达 · 演示版本 · 数据均为虚构</p>
            <p className="mt-1">© 2025 RentCheck</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
