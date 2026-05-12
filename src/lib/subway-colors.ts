/**
 * 北京地铁线路配色（参考北京地铁官方）
 * 用于地图 marker 渲染时给每条线赋一个真实视觉色
 */
export const LINE_COLORS: Record<string, string> = {
  "1号线": "#A60932",
  "2号线": "#004D9F",
  "4号线": "#009A50",
  "5号线": "#A0408F",
  "6号线": "#C28D26",
  "7号线": "#F0B048",
  "8号线": "#008C5F",
  "10号线": "#0098CC",
  "13号线": "#FFEC18",
  "14号线": "#7F6F45",
  "15号线": "#7F3F97",
  "昌平线": "#E4007F",
  "金融街换乘": "#A60932",
};

/**
 * 给一个站点（line 字段可能是 "1/10号线" 或 "2号线"）取第一条线作为代表色
 */
export function pickLineColor(lineField: string): string {
  // 拆分 "1/10号线" → ["1", "10号线"]，加 "号线" 还原
  const parts = lineField.split("/");
  for (const p of parts) {
    const candidate = p.endsWith("号线") || p === "昌平线" || p === "金融街换乘"
      ? p
      : p + "号线";
    if (LINE_COLORS[candidate]) return LINE_COLORS[candidate];
  }
  return "#FF2442";
}

/**
 * 给一个站的所有线路返回简短列表（用于 hover 标签）
 */
export function expandLines(lineField: string): string[] {
  return lineField.split("/").map((p) => {
    if (p.endsWith("号线") || p === "昌平线" || p === "金融街换乘") return p;
    return p + "号线";
  });
}
