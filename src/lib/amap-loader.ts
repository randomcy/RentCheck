/**
 * 统一的高德 SDK 加载器
 *
 * 为什么需要这个？
 * - 多个组件（CommuteMap / PlaceSearch）都需要 AMap，如果各自调 AMapLoader.load
 *   会触发 SDK 内部状态冲突，导致 "U.Module.DomRender is not a constructor" 报错。
 * - React Strict Mode 下组件会双次 mount，更容易触发并发加载。
 *
 * 方案：用一个全局 Promise 缓存加载结果，所有组件共享同一个 AMap 实例和插件集。
 */
import AMapLoaderRaw from "@amap/amap-jsapi-loader";
import { AMAP_KEY, AMAP_SECURITY_CODE } from "./amap-config";

// 所有需要的插件一次性加载好
const REQUIRED_PLUGINS = [
  "AMap.Scale",
  "AMap.ToolBar",
  "AMap.AutoComplete",
  "AMap.PlaceSearch",
];

let amapPromise: Promise<any> | null = null;

export function loadAMap(): Promise<any> {
  // 客户端才能加载
  if (typeof window === "undefined") {
    return Promise.reject(new Error("AMap 只能在浏览器加载"));
  }

  // 已经加载过就直接复用
  if (amapPromise) return amapPromise;

  // 如果 AMap 已经挂在 window 上（热重载场景），直接复用
  if ((window as any).AMap) {
    amapPromise = Promise.resolve((window as any).AMap);
    return amapPromise;
  }

  // 安全密钥必须在 load 之前设置
  (window as any)._AMapSecurityConfig = {
    securityJsCode: AMAP_SECURITY_CODE,
  };

  amapPromise = AMapLoaderRaw.load({
    key: AMAP_KEY,
    version: "2.0",
    plugins: REQUIRED_PLUGINS,
  }).catch((err) => {
    // 加载失败时清掉 promise，下次重试可以重新加载
    amapPromise = null;
    throw err;
  });

  return amapPromise;
}
