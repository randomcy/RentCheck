/**
 * Conjoint v2 · 核心估计与解释
 *
 * 实现的是工业标准 CBC：
 *   特征编码 → MNL 概率 → 负 log-likelihood + L2 → Adam → part-worth / importance / WTP
 *
 * 参考：notes/conjoint-method.md §3-§5
 *   - Train (2009) Discrete Choice Methods with Simulation
 *   - McFadden (1974) Conditional Logit
 *   - Sawtooth Software CBC Technical Paper
 */
import type { ConjointAttribute, Profile } from "./attributes";

// ============================================================
// 1. 特征向量构造（dummy + 标准化连续变量）
// ============================================================

/**
 * 把一个 Profile（每属性的 level 索引）转成特征向量 x。
 *
 * 编码规则：
 *   - linear 编码：1 个连续维度，对原始 level value 做 z-score 标准化
 *     （标准化让 β 的尺度可比，且 Adam 更易收敛）
 *   - part-worth 编码：(L-1) 个 dummy（基准 level=0 不出现，避免共线）
 *
 * 返回的 features 和 featureMeta 用同样的顺序，便于反解。
 */
export interface FeatureMeta {
  /** 用于人类阅读的特征名 e.g. "月租金 (元/月, 标准化)" "电梯=有" */
  label: string;
  /** 所属属性 id */
  attrId: string;
  /** 所属属性的人类名 */
  attrName: string;
  /** linear: undefined; partWorth: 对应的 level 索引（从 1 开始，0 是基准） */
  levelIndex?: number;
  /** linear: 标准化前的均值，用于反解 WTP 时使用 */
  mean?: number;
  /** linear: 标准化前的 std */
  std?: number;
  encoding: "linear" | "partWorth";
}

export interface DesignSpec {
  /** 选用的属性列表（用户勾选的 5-7 个） */
  attributes: ConjointAttribute[];
  /** 特征向量元数据 */
  featureMeta: FeatureMeta[];
  /** 把 Profile 编码成 x */
  encode: (p: Profile) => number[];
  /** 总特征维度 */
  K: number;
}

export function buildDesignSpec(attributes: ConjointAttribute[]): DesignSpec {
  const meta: FeatureMeta[] = [];

  // 为 linear 编码先算 mean/std（用所有 levels 的 value）
  const linearStats: Record<string, { mean: number; std: number }> = {};
  for (const attr of attributes) {
    if (attr.encoding === "linear") {
      const vals = attr.levels.map((l) => l.value);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance =
        vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length;
      const std = Math.sqrt(variance) || 1;
      linearStats[attr.id] = { mean, std };
    }
  }

  // 构建 featureMeta
  for (const attr of attributes) {
    if (attr.encoding === "linear") {
      meta.push({
        label: `${attr.name}${attr.unit ? `（${attr.unit}）` : ""}`,
        attrId: attr.id,
        attrName: attr.name,
        encoding: "linear",
        mean: linearStats[attr.id].mean,
        std: linearStats[attr.id].std,
      });
    } else {
      // part-worth：跳过 level 0（基准），为 level 1..L-1 各创建一个 dummy
      for (let i = 1; i < attr.levels.length; i++) {
        meta.push({
          label: `${attr.name} = ${attr.levels[i].label}`,
          attrId: attr.id,
          attrName: attr.name,
          encoding: "partWorth",
          levelIndex: i,
        });
      }
    }
  }

  const K = meta.length;

  const encode = (p: Profile): number[] => {
    const x = new Array(K).fill(0);
    for (let f = 0; f < meta.length; f++) {
      const m = meta[f];
      const attr = attributes.find((a) => a.id === m.attrId)!;
      const levelIdx = p[m.attrId] ?? 0;

      if (m.encoding === "linear") {
        const v = attr.levels[levelIdx].value;
        x[f] = (v - (m.mean ?? 0)) / (m.std ?? 1);
      } else {
        // part-worth: 仅当 profile 在该 level 时为 1
        x[f] = levelIdx === m.levelIndex ? 1 : 0;
      }
    }
    return x;
  };

  return { attributes, featureMeta: meta, encode, K };
}

// ============================================================
// 2. MNL 概率（log-sum-exp 防溢出）
// ============================================================

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function stableSoftmax(logits: number[]): number[] {
  const maxL = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - maxL));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map((e) => e / sum);
}

export function mnlProbs(beta: number[], altsX: number[][]): number[] {
  const logits = altsX.map((x) => dot(beta, x));
  return stableSoftmax(logits);
}

// ============================================================
// 3. 损失 + 梯度（负 log-likelihood + L2 正则）
// ============================================================

export interface ChoiceRecord {
  /** 题目编号 */
  taskId: number;
  /** 每个 alternative 的特征向量 */
  altsX: number[][];
  /** 用户选择的 alternative 索引 */
  chosen: number;
}

function computeLossAndGrad(
  beta: number[],
  records: ChoiceRecord[],
  lambda: number
): { loss: number; grad: number[] } {
  const K = beta.length;
  let loss = 0;
  const grad = new Array(K).fill(0);

  for (const r of records) {
    const probs = mnlProbs(beta, r.altsX);
    const chosenProb = Math.max(probs[r.chosen], 1e-15);
    loss -= Math.log(chosenProb);

    // grad_k = Σ_i p_i * x_ik - x_chosen_k
    for (let k = 0; k < K; k++) {
      let expected = 0;
      for (let i = 0; i < probs.length; i++) {
        expected += probs[i] * r.altsX[i][k];
      }
      grad[k] += expected - r.altsX[r.chosen][k];
    }
  }

  // L2 正则
  for (let k = 0; k < K; k++) {
    loss += 0.5 * lambda * beta[k] * beta[k];
    grad[k] += lambda * beta[k];
  }

  return { loss, grad };
}

// ============================================================
// 4. Adam 优化器
// ============================================================

export interface FitOptions {
  lambda?: number;
  lr?: number;
  maxIter?: number;
  tol?: number;
}

export interface FitResult {
  beta: number[];
  loss: number;
  iterations: number;
  converged: boolean;
}

export function fitMNL(
  records: ChoiceRecord[],
  K: number,
  opts: FitOptions = {}
): FitResult {
  const { lambda = 1.0, lr = 0.05, maxIter = 300, tol = 1e-6 } = opts;

  const beta = new Array(K).fill(0);
  const m = new Array(K).fill(0);
  const v = new Array(K).fill(0);
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;

  let prevLoss = Infinity;
  let converged = false;
  let lastLoss = 0;
  let iter = 0;

  for (iter = 1; iter <= maxIter; iter++) {
    const { loss, grad } = computeLossAndGrad(beta, records, lambda);
    lastLoss = loss;

    for (let k = 0; k < K; k++) {
      m[k] = b1 * m[k] + (1 - b1) * grad[k];
      v[k] = b2 * v[k] + (1 - b2) * grad[k] * grad[k];
      const mHat = m[k] / (1 - Math.pow(b1, iter));
      const vHat = v[k] / (1 - Math.pow(b2, iter));
      beta[k] -= (lr * mHat) / (Math.sqrt(vHat) + eps);
    }

    if (Math.abs(prevLoss - loss) < tol) {
      converged = true;
      break;
    }
    prevLoss = loss;
  }

  return { beta, loss: lastLoss, iterations: iter, converged };
}

// ============================================================
// 5. 结果解释：part-worth / importance / WTP
// ============================================================

/**
 * 一个 attribute 的 part-worth 表：每个 level 一个效用值（基准 level = 0）
 */
export interface PartWorth {
  attrId: string;
  attrName: string;
  encoding: "linear" | "partWorth";
  /** 每个 level 的效用（基准 level = 0） */
  levels: { label: string; value: number; utility: number }[];
  /** part-worth 极差，用于 importance 归一化 */
  range: number;
  /** linear 编码下的"斜率"（β 在原始尺度上的值，即每单位数值变化的效用） */
  slopePerUnit?: number;
}

/**
 * 把 β 反解为人类可读的 part-worth。
 * 对 linear 编码：基准 level 的效用 = 0，其他 level 的效用 = β * (value - mean) / std
 * 对 part-worth 编码：基准 level = 0，其他 level = 对应 β
 */
export function computePartWorths(
  beta: number[],
  spec: DesignSpec
): PartWorth[] {
  const result: PartWorth[] = [];

  for (const attr of spec.attributes) {
    if (attr.encoding === "linear") {
      const fIdx = spec.featureMeta.findIndex(
        (m) => m.attrId === attr.id && m.encoding === "linear"
      );
      const b = beta[fIdx];
      const mean = spec.featureMeta[fIdx].mean ?? 0;
      const std = spec.featureMeta[fIdx].std ?? 1;
      const levels = attr.levels.map((lv) => ({
        label: lv.label,
        value: lv.value,
        utility: (b * (lv.value - mean)) / std,
      }));
      const utils = levels.map((l) => l.utility);
      const range = Math.max(...utils) - Math.min(...utils);
      // slopePerUnit: 在原始单位（元、分钟）下 β 的实际值
      const slopePerUnit = b / std;
      result.push({
        attrId: attr.id,
        attrName: attr.name,
        encoding: "linear",
        levels,
        range,
        slopePerUnit,
      });
    } else {
      // part-worth
      const levels = attr.levels.map((lv, idx) => {
        if (idx === 0) return { label: lv.label, value: lv.value, utility: 0 };
        const fIdx = spec.featureMeta.findIndex(
          (m) =>
            m.attrId === attr.id &&
            m.encoding === "partWorth" &&
            m.levelIndex === idx
        );
        return { label: lv.label, value: lv.value, utility: beta[fIdx] };
      });
      const utils = levels.map((l) => l.utility);
      const range = Math.max(...utils) - Math.min(...utils);
      result.push({
        attrId: attr.id,
        attrName: attr.name,
        encoding: "partWorth",
        levels,
        range,
      });
    }
  }

  return result;
}

/**
 * Importance Score: 每属性的 part-worth 极差 / 所有属性极差之和（%）
 */
export interface Importance {
  attrId: string;
  attrName: string;
  importance: number; // 0-1
}

export function computeImportance(partWorths: PartWorth[]): Importance[] {
  const totalRange = partWorths.reduce((s, p) => s + p.range, 0);
  if (totalRange === 0) {
    return partWorths.map((p) => ({
      attrId: p.attrId,
      attrName: p.attrName,
      importance: 1 / partWorths.length,
    }));
  }
  return partWorths.map((p) => ({
    attrId: p.attrId,
    attrName: p.attrName,
    importance: p.range / totalRange,
  }));
}

/**
 * WTP（Willingness To Pay）：用户愿意每月多付多少钱获得某 level
 *
 * 公式：WTP_kl = -part_worth_kl / β_price_per_unit
 *
 *   - β_price_per_unit 是租金每 1 元变化的效用（slopePerUnit）
 *   - 要求 β_price < 0（租金涨效用降），否则 WTP 无意义
 */
export interface WTPItem {
  attrId: string;
  attrName: string;
  levels: { label: string; wtp: number }[]; // 单位：元/月（基准 level=0）
}

export function computeWTP(
  partWorths: PartWorth[],
  priceAttrId: string = "price"
): { items: WTPItem[]; valid: boolean; reason?: string } {
  const pricePW = partWorths.find((p) => p.attrId === priceAttrId);
  if (!pricePW) {
    return { items: [], valid: false, reason: "用户未勾选月租金维度，WTP 不可计算" };
  }
  if (pricePW.encoding !== "linear" || pricePW.slopePerUnit === undefined) {
    return { items: [], valid: false, reason: "月租金不是 linear 编码" };
  }
  if (pricePW.slopePerUnit >= 0) {
    // 经济上不合理：租金越高效用越高 → 用户答题不一致或样本太少
    return {
      items: [],
      valid: false,
      reason: "估计的租金系数为正，与经济直觉相反；样本量不足或答题不一致",
    };
  }

  const items: WTPItem[] = partWorths
    .filter((p) => p.attrId !== priceAttrId)
    .map((p) => ({
      attrId: p.attrId,
      attrName: p.attrName,
      levels: p.levels.map((l) => ({
        label: l.label,
        wtp: -l.utility / pricePW.slopePerUnit!,
      })),
    }));

  return { items, valid: true };
}

// ============================================================
// 6. Holdout 预测准确率
// ============================================================

/**
 * 在 holdout 题上验证模型预测准确率。
 * 对每道 holdout，用 β 算出每个 alternative 的概率，取 argmax 与用户实际选择对比。
 */
export function computeHoldoutAccuracy(
  beta: number[],
  holdouts: ChoiceRecord[]
): { accuracy: number; nCorrect: number; n: number } {
  if (holdouts.length === 0) return { accuracy: 0, nCorrect: 0, n: 0 };
  let nCorrect = 0;
  for (const h of holdouts) {
    const probs = mnlProbs(beta, h.altsX);
    let bestIdx = 0;
    let bestP = -Infinity;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > bestP) {
        bestP = probs[i];
        bestIdx = i;
      }
    }
    if (bestIdx === h.chosen) nCorrect++;
  }
  return { accuracy: nCorrect / holdouts.length, nCorrect, n: holdouts.length };
}
