/**
 * 租房 Conjoint v2 · 属性定义
 *
 * 设计原则（详见 notes/conjoint-method.md §6）：
 * - 12 个候选维度，用户从中勾选 5-7 个最关心的（个性化出题）
 * - 每个维度统一 3 levels，避免 Number-of-Levels Effect
 * - 连续型变量用 linear coding（租金、通勤、地铁步行），其余用 part-worth dummy
 * - levels 顺序：从"差"到"好"（基准 level 是第一项，β 解释更直观）
 */

/** 编码方式 */
export type Encoding = "linear" | "partWorth";

/** 偏好方向：linear coded 变量需要它来推断 β 的预期符号 */
export type Preference = "lower" | "higher" | "nominal";

export interface AttrLevel {
  /** 显示文案 */
  label: string;
  /** 数值（linear coding 用） */
  value: number;
  /** 简短描述（出题卡片里展示） */
  desc?: string;
}

export interface ConjointAttribute {
  id: string;
  name: string;
  icon: string;
  /** 一句话说明：用户勾选时悬停可看 */
  hint: string;
  encoding: Encoding;
  preference: Preference;
  levels: AttrLevel[];
  /** 是否默认勾选（核心维度）—— 用户进入勾选页时已勾上，可取消 */
  defaultSelected?: boolean;
  /** 单位（卡片显示用，如 元/月、分钟、㎡） */
  unit?: string;
}

/**
 * 12 个候选维度。levels 顺序：差 → 好。
 * defaultSelected: true 表示进入勾选页默认已勾，用户可取消（核心维度）。
 */
export const ATTRIBUTES_V2: ConjointAttribute[] = [
  {
    id: "price",
    name: "月租金",
    icon: "💰",
    hint: "每月房租预算，越低越好",
    encoding: "linear",
    preference: "lower",
    unit: "元/月",
    defaultSelected: true,
    levels: [
      { label: "6000 元", value: 6000 },
      { label: "4500 元", value: 4500 },
      { label: "3000 元", value: 3000 },
    ],
  },
  {
    id: "commute",
    name: "通勤时间",
    icon: "🚇",
    hint: "单程通勤时长，越短越好",
    encoding: "linear",
    preference: "lower",
    unit: "分钟",
    defaultSelected: true,
    levels: [
      { label: "45 分钟", value: 45 },
      { label: "30 分钟", value: 30 },
      { label: "15 分钟", value: 15 },
    ],
  },
  {
    id: "area",
    name: "房屋面积",
    icon: "📐",
    hint: "套内面积",
    encoding: "partWorth",
    preference: "higher",
    unit: "㎡",
    defaultSelected: true,
    levels: [
      { label: "35 ㎡", value: 35, desc: "紧凑" },
      { label: "55 ㎡", value: 55, desc: "适中" },
      { label: "75 ㎡", value: 75, desc: "宽敞" },
    ],
  },
  {
    id: "elevator",
    name: "电梯",
    icon: "🛗",
    hint: "楼栋是否有电梯",
    encoding: "partWorth",
    preference: "higher",
    levels: [
      { label: "无电梯", value: 0 },
      { label: "有电梯", value: 1 },
      // 二分变量人为补一个"新电梯"使其也是 3 levels（统一处理）
      { label: "新装电梯", value: 2, desc: "近 3 年" },
    ],
  },
  {
    id: "privateBath",
    name: "独立卫浴",
    icon: "🛁",
    hint: "卫生间归属",
    encoding: "partWorth",
    preference: "higher",
    levels: [
      { label: "合用卫浴", value: 0 },
      { label: "半独立", value: 1, desc: "与 1 人共用" },
      { label: "完全独立", value: 2 },
    ],
  },
  {
    id: "decoration",
    name: "装修档次",
    icon: "✨",
    hint: "屋内装修水平",
    encoding: "partWorth",
    preference: "higher",
    levels: [
      { label: "普通装修", value: 0, desc: "可住" },
      { label: "精装", value: 1, desc: "舒服" },
      { label: "豪装/网红", value: 2, desc: "出片" },
    ],
  },
  {
    id: "subwayWalk",
    name: "地铁步行",
    icon: "🚶",
    hint: "走到最近地铁站的时间",
    encoding: "linear",
    preference: "lower",
    unit: "分钟",
    levels: [
      { label: "30 分钟", value: 30 },
      { label: "15 分钟", value: 15 },
      { label: "5 分钟", value: 5 },
    ],
  },
  {
    id: "rentType",
    name: "整租/合租",
    icon: "🏠",
    hint: "居住方式",
    encoding: "partWorth",
    preference: "nominal",
    levels: [
      { label: "三人合租", value: 0 },
      { label: "两人合租", value: 1 },
      { label: "整租独居", value: 2 },
    ],
  },
  {
    id: "lighting",
    name: "采光朝向",
    icon: "☀️",
    hint: "屋内自然光线",
    encoding: "partWorth",
    preference: "higher",
    levels: [
      { label: "北向昏暗", value: 0 },
      { label: "东/西向", value: 1 },
      { label: "南向通透", value: 2 },
    ],
  },
  {
    id: "buildingAge",
    name: "楼龄",
    icon: "🏗️",
    hint: "建筑年限",
    encoding: "partWorth",
    preference: "higher",
    levels: [
      { label: "20+ 年老楼", value: 0 },
      { label: "10-20 年", value: 1 },
      { label: "5 年内新楼", value: 2 },
    ],
  },
  {
    id: "petFriendly",
    name: "宠物友好",
    icon: "🐱",
    hint: "是否允许养宠物",
    encoding: "partWorth",
    preference: "higher",
    levels: [
      { label: "禁止养宠", value: 0 },
      { label: "可养小型", value: 1, desc: "猫 / 小狗" },
      { label: "完全友好", value: 2 },
    ],
  },
  {
    id: "balcony",
    name: "阳台",
    icon: "🌿",
    hint: "是否有独立阳台",
    encoding: "partWorth",
    preference: "higher",
    levels: [
      { label: "无阳台", value: 0 },
      { label: "封闭阳台", value: 1 },
      { label: "开放大阳台", value: 2 },
    ],
  },
];

/** 用户最少必须勾选的维度数（保证统计有效） */
export const MIN_SELECTED = 5;
/** 用户最多可勾选的维度数（控制题目认知负荷） */
export const MAX_SELECTED = 7;

/** 查找一个属性 */
export function findAttr(id: string): ConjointAttribute | undefined {
  return ATTRIBUTES_V2.find((a) => a.id === id);
}

/**
 * 一个 Profile：每个属性对应一个 level 索引（0/1/2）
 * 例如 { price: 1, commute: 2, area: 0 } 表示租金中、通勤短、面积小
 */
export type Profile = Record<string, number>;
