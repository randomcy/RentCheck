// ===== Apartment =====
export interface Apartment {
  id: string;
  title: string;
  communityId: string;
  price: number;
  roomType: string;
  area: number;
  floor: string;
  buildingType: string;
  decoration: string;
  subwayStation: string;
  subwayDistance: number; // 米
  commuteToSampleCompany: number; // 分钟
  tags: string[];
  coordinates: { lng: number; lat: number };
  images: string[];
  description: string;
}

// ===== Community =====
export interface CommunitySubScores {
  noise: number;
  soundproof: number;
  property: number;
  safety: number;
  amenity: number;
  valueForMoney: number;
}

export interface ProsCons {
  title: string;
  summary: string;
  evidenceCount: number;
  evidence?: string[];
}

/**
 * 隐形硬伤标签（产品差异化核心 — 现有租房平台普遍缺失这三个维度）
 * 来源：北京年轻人租房真实痛点调研（牛客/小宇宙/掘金/界面新闻 2024-2025）
 */
export interface HiddenRisks {
  /** 供暖方式：集中（市政统一供暖）/ 自采暖（自己烧）/ 无供暖（南方做法，冬天危险） */
  heating: "central" | "self" | "none";
  /** 水电类型：民用价 / 商用价（月费用差 300-800 元） */
  utility: "residential" | "commercial";
  /** 回迁房风险：邻居素质参差，是噪音/纠纷投诉高发地 */
  isRelocation: boolean;
  /** 额外说明（可选） */
  note?: string;
}

export interface Community {
  id: string;
  name: string;
  district: string;
  area: string;
  coordinates: { lng: number; lat: number };
  buildYear: number;
  buildingType: string;
  totalRating: number;
  subscores: CommunitySubScores;
  pros: ProsCons[];
  cons: ProsCons[];
  suitableFor: string[];
  notSuitableFor: string[];
  postIds: string[];
  /** 隐形硬伤标签（可选 — 仅部分小区有数据） */
  hiddenRisks?: HiddenRisks;
}

// ===== Post =====
export interface Post {
  id: string;
  communityId: string;
  author: string;
  authorAvatar: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  tags: string[];
  publishDate: string;
}

// ===== Conjoint =====
export interface AttributeLevel {
  id: string;
  value: string;
  numericValue?: number;
}

export interface ConjointAttribute {
  id: string;
  name: string;
  icon: string;
  levels: AttributeLevel[];
}

export interface BinaryFilter {
  id: string;
  label: string;
  icon: string;
}

export interface ConjointConfig {
  attributes: ConjointAttribute[];
  binaryFilters: BinaryFilter[];
}

// ===== Quiz =====
export interface QuizOption {
  levels: Record<string, AttributeLevel>; // attributeId -> level
}

export interface QuizQuestion {
  id: number;
  optionA: QuizOption;
  optionB: QuizOption;
}

export interface QuizAnswer {
  questionId: number;
  chosen: "A" | "B";
  optionA: QuizOption;
  optionB: QuizOption;
}

// ===== Preference Result =====
export interface AttributeWeight {
  attributeId: string;
  name: string;
  icon: string;
  weight: number; // 0-1
}

export interface PreferenceResult {
  /** 按 config.attributes 原顺序的权重（用于雷达图轴顺序稳定）*/
  weights: AttributeWeight[];
  /** 按权重从大到小排序后的权重列表 */
  sortedWeights: AttributeWeight[];
  /** 主人格标签 */
  personalityTag: string;
  /** 副标签（top-2 in 意 + 可妥协）*/
  subTags: string[];
  /** 自动生成的解读文案 */
  description: string;
  topAttributeId: string;
  topAttributeName: string;
  bottomAttributeId: string;
  bottomAttributeName: string;
  /** levelId -> utility，调试用 */
  utilities: Record<string, number>;
  /** 用户的硬筛选偏好（yes/no），可选 */
  binaryPreferences?: Record<string, boolean>;
}
