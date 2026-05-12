/**
 * 偏好 ↔ 小区匹配度算法
 *
 * 思路：
 * 1. Conjoint 给出 6 个【租房属性】的权重（price / roomType / commute / decoration / community / building）
 * 2. 小区有 6 个【居住体验子分】（noise / soundproof / property / safety / amenity / valueForMoney）
 * 3. 两者不是 1:1，需要建立映射关系：用户在意"装修"→意味着对"物业服务、隔音"敏感
 * 4. 加权聚合得到一个 0-100 的匹配度分数 + 一句"为什么推荐"的自然语言解释
 *
 * 我们用一个【映射矩阵】把 attribute → subscores 联系起来，
 * 然后 score = Σ (attrWeight × Σ(mapping[attr][sub] × subscore))
 */

import type {
  Community,
  CommunitySubScores,
  PreferenceResult,
} from "@/types";

/**
 * 映射矩阵：每个 conjoint attribute → 多个 community subscore 的权重
 * 列加起来不必为 1，最终会被归一化
 */
const ATTR_TO_SUBSCORE: Record<
  string,
  Partial<Record<keyof CommunitySubScores, number>>
> = {
  // 看重价格 → 性价比 + 配套（同样价钱配套更好更值）
  price: { valueForMoney: 1.0, amenity: 0.3 },
  // 看重户型 → 隔音（户型大也要安静）+ 物业
  roomType: { soundproof: 0.6, property: 0.4 },
  // 看重通勤 → 配套（地铁/公交近就是配套好）
  commute: { amenity: 0.9, valueForMoney: 0.2 },
  // 看重装修 → 物业服务 + 隔音
  decoration: { property: 0.7, soundproof: 0.5 },
  // 看重小区氛围 → 治安 + 周边静谧 + 物业
  community: { safety: 0.8, noise: 0.6, property: 0.4 },
  // 看重楼栋类型 → 隔音 + 治安
  building: { soundproof: 0.7, safety: 0.4 },
};

/** 子分维度的中文标签 */
export const SUBSCORE_LABELS: Record<keyof CommunitySubScores, string> = {
  noise: "周边静谧",
  soundproof: "隔音表现",
  property: "物业服务",
  safety: "治安安全",
  amenity: "生活配套",
  valueForMoney: "性价比",
};

export interface MatchResult {
  /** 0-100 的匹配度 */
  score: number;
  /** 匹配度等级 */
  level: "perfect" | "good" | "fair" | "low";
  /** 推荐这个小区的核心理由（1-2 条最匹配的子分） */
  reasons: Array<{ label: string; score: number; reason: string }>;
  /** 主要不匹配的点（0-1 条最低分） */
  risks: Array<{ label: string; score: number; reason: string }>;
  /** 解释每个用户在意属性 → 小区表现 */
  breakdown: Array<{
    attributeName: string;
    attributeWeight: number; // 用户在意度 0-1
    subscoreContribution: number; // 该属性下小区得分 0-5
  }>;
}

/**
 * 主函数：计算一个小区与用户偏好的匹配度
 */
export function calcMatch(
  community: Community,
  pref: PreferenceResult
): MatchResult {
  const subscores = community.subscores;

  // ===== 1. 按属性聚合 =====
  // 对每个用户在意的属性，计算它在这个小区的"实现度"（0-5）
  const breakdown = pref.weights.map((w) => {
    const mapping = ATTR_TO_SUBSCORE[w.attributeId] ?? {};
    const subEntries = Object.entries(mapping) as [
      keyof CommunitySubScores,
      number
    ][];

    if (subEntries.length === 0) {
      return {
        attributeName: w.name,
        attributeWeight: w.weight,
        subscoreContribution: 3.0, // 默认中性
      };
    }

    // 加权平均该属性对应的子分（用映射矩阵权重）
    const totalMapWeight = subEntries.reduce((s, [, mw]) => s + mw, 0);
    const weighted = subEntries.reduce(
      (s, [key, mw]) => s + subscores[key] * mw,
      0
    );
    return {
      attributeName: w.name,
      attributeWeight: w.weight,
      subscoreContribution: weighted / totalMapWeight,
    };
  });

  // ===== 2. 加权聚合到总分 =====
  const totalAttrWeight = breakdown.reduce(
    (s, b) => s + b.attributeWeight,
    0
  );
  const rawScore =
    totalAttrWeight > 0
      ? breakdown.reduce(
          (s, b) => s + b.attributeWeight * b.subscoreContribution,
          0
        ) / totalAttrWeight
      : 3.0;

  // rawScore 0-5 → 0-100，并轻微拉伸到能看出差距
  // 公式：50 + (rawScore - 3) * 22  → 3 分 = 50；4 分 = 72；5 分 = 94；2 分 = 28
  const score = Math.max(0, Math.min(100, Math.round(50 + (rawScore - 3) * 22)));

  // ===== 3. 找出最匹配 / 最不匹配的子分 =====
  // 只看用户最在意的 Top-3 属性涉及到的子分
  const top3Attrs = [...pref.sortedWeights].slice(0, 3);
  const relevantSubs = new Set<keyof CommunitySubScores>();
  top3Attrs.forEach((a) => {
    Object.keys(ATTR_TO_SUBSCORE[a.attributeId] ?? {}).forEach((s) =>
      relevantSubs.add(s as keyof CommunitySubScores)
    );
  });

  const subList = Array.from(relevantSubs).map((key) => ({
    key,
    label: SUBSCORE_LABELS[key],
    score: subscores[key],
  }));

  const sortedSub = [...subList].sort((a, b) => b.score - a.score);

  const reasons = sortedSub
    .filter((s) => s.score >= 4.0)
    .slice(0, 2)
    .map((s) => ({
      label: s.label,
      score: s.score,
      reason: buildReason(s.key, s.score, true),
    }));

  const risks = sortedSub
    .filter((s) => s.score < 3.5)
    .slice(-1)
    .map((s) => ({
      label: s.label,
      score: s.score,
      reason: buildReason(s.key, s.score, false),
    }));

  // ===== 4. 等级 =====
  let level: MatchResult["level"];
  if (score >= 80) level = "perfect";
  else if (score >= 65) level = "good";
  else if (score >= 50) level = "fair";
  else level = "low";

  return { score, level, reasons, risks, breakdown };
}

/** 计算并按匹配度排序 */
export function rankCommunities(
  communities: Community[],
  pref: PreferenceResult
): Array<Community & { match: MatchResult }> {
  return communities
    .map((c) => ({ ...c, match: calcMatch(c, pref) }))
    .sort((a, b) => b.match.score - a.match.score);
}

/** 等级 → 中文 + 颜色 token */
export function matchLevelMeta(level: MatchResult["level"]) {
  const map = {
    perfect: { label: "非常匹配", color: "text-emerald-700", bg: "bg-emerald-50" },
    good: { label: "比较匹配", color: "text-emerald-600", bg: "bg-emerald-50/60" },
    fair: { label: "一般", color: "text-amber-700", bg: "bg-amber-50" },
    low: { label: "不太合适", color: "text-rose-700", bg: "bg-rose-50" },
  };
  return map[level];
}

// ============================================================
// 内部 helper
// ============================================================

function buildReason(
  key: keyof CommunitySubScores,
  score: number,
  positive: boolean
): string {
  const positiveTemplate: Record<keyof CommunitySubScores, string> = {
    noise: "周边安静，开窗听不到马路声",
    soundproof: "隔音表现好，邻居噪音少",
    property: "物业响应快，问题处理到位",
    safety: "治安好，深夜回家也安心",
    amenity: "生活配套丰富，下楼就有地铁/商超",
    valueForMoney: "性价比高，同价位选择里很值",
  };
  const negativeTemplate: Record<keyof CommunitySubScores, string> = {
    noise: "周边偏吵，对噪音敏感的话需慎选",
    soundproof: "隔音一般，邻居声音可能影响",
    property: "物业评价一般，部分报修慢",
    safety: "治安评价偏低，独居女性请留意",
    amenity: "配套距离稍远，依赖外卖/打车",
    valueForMoney: "价格偏高，同区可能有更划算选择",
  };
  return positive ? positiveTemplate[key] : negativeTemplate[key];
}
