/**
 * Conjoint v2 · CBC 任务生成（均衡随机设计）
 *
 * 设计原则（详见 notes/conjoint-method.md §2）：
 * - Balanced Random Design：每个 attribute 在每个 alternative 位置上 level 出现次数尽可能均匀
 * - 每题 3 alternatives，每个 alternative 是一个 Profile（每属性一个 level）
 * - 避免 dominated alternatives：A 在所有"有方向"维度上都优于 B，会让选择没信息量
 * - Holdout：从生成的 N+2 题里随机抽 2 题作为 holdout
 *
 * 注意 BYO 锚定：如果用户给了 idealProfile（每属性一个理想 level），
 * 我们生成时让一部分 alternative 围绕 ideal 做"邻域采样"，提高选择卡片的合理性。
 */
import type { ConjointAttribute, Profile } from "./attributes";

export interface ChoiceTask {
  taskId: number;
  alternatives: Profile[];
  /** true 表示这是 holdout 题（不参与训练，仅用于验证） */
  isHoldout: boolean;
}

interface GenOptions {
  /** 用户的"理想配置"，仅用作邻域采样种子（不强制出现在 alts 中） */
  idealProfile?: Profile;
  /** 正式题数 */
  nTasks?: number;
  /** holdout 题数 */
  nHoldout?: number;
  /** 每题 alt 数 */
  nAlts?: number;
}

/**
 * 给一组维度生成均衡的题目。
 * 算法：
 *   1) 对每个 attr 准备一个"level 出现计数器"
 *   2) 生成每个 alt 时，对每个 attr 选当前最少出现的 level
 *   3) 校验：alt 之间不能完全相同 + 不能 dominated → 不通过就重试
 */
export function generateTasks(
  attributes: ConjointAttribute[],
  opts: GenOptions = {}
): ChoiceTask[] {
  const {
    idealProfile,
    nTasks = 10,
    nHoldout = 2,
    nAlts = 3,
  } = opts;

  const totalTasks = nTasks + nHoldout;

  // 每个 attribute 的 level 出现计数（在所有题、所有 alt 位置上累加）
  const counter: Record<string, number[]> = {};
  for (const attr of attributes) {
    counter[attr.id] = new Array(attr.levels.length).fill(0);
  }

  /** 选当前出现次数最少的 level；并列时随机 */
  const pickBalancedLevel = (attrId: string, levelCount: number): number => {
    const c = counter[attrId];
    const minVal = Math.min(...c);
    const candidates: number[] = [];
    for (let i = 0; i < levelCount; i++) {
      if (c[i] === minVal) candidates.push(i);
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  /**
   * 检查是否 dominated：对所有有方向的 attribute（lower / higher），
   * 如果 alt A 在所有维度上都 ≥ alt B（且至少一个严格 >），则 A 弱占优 B。
   * 注意：nominal 维度（整租/合租）不参与判断。
   */
  const isDominated = (a: Profile, b: Profile): boolean => {
    let strictlyBetter = false;
    let allAtLeastAsGood = true;
    for (const attr of attributes) {
      if (attr.preference === "nominal") continue;
      const aIdx = a[attr.id];
      const bIdx = b[attr.id];
      // "好的方向" 对应的 level 顺序在 attributes.ts 里就是 "差→好"
      // 所以 idx 大 = 更好
      const aBetter = aIdx > bIdx;
      const aWorse = aIdx < bIdx;
      if (aWorse) {
        allAtLeastAsGood = false;
        break;
      }
      if (aBetter) strictlyBetter = true;
    }
    return allAtLeastAsGood && strictlyBetter;
  };

  /** 任意两个 alts 之间不能存在弱占优 */
  const hasDominationInTask = (alts: Profile[]): boolean => {
    for (let i = 0; i < alts.length; i++) {
      for (let j = 0; j < alts.length; j++) {
        if (i === j) continue;
        if (isDominated(alts[i], alts[j])) return true;
      }
    }
    return false;
  };

  /** 两个 profile 完全相同？ */
  const sameProfile = (a: Profile, b: Profile): boolean => {
    for (const attr of attributes) {
      if (a[attr.id] !== b[attr.id]) return false;
    }
    return true;
  };

  const tasks: ChoiceTask[] = [];

  for (let t = 0; t < totalTasks; t++) {
    let altsThisTask: Profile[] = [];
    let attempt = 0;
    const MAX_ATTEMPT = 30;

    while (attempt < MAX_ATTEMPT) {
      // 临时计数器副本（如果这次失败可以回滚）
      const snapshot: Record<string, number[]> = {};
      for (const key in counter) snapshot[key] = [...counter[key]];

      const candidate: Profile[] = [];
      for (let a = 0; a < nAlts; a++) {
        const profile: Profile = {};
        for (const attr of attributes) {
          let levelIdx: number;
          // BYO 邻域采样：30% 概率向 ideal 靠拢（如有）
          if (
            idealProfile &&
            idealProfile[attr.id] !== undefined &&
            Math.random() < 0.3
          ) {
            levelIdx = idealProfile[attr.id];
          } else {
            levelIdx = pickBalancedLevel(attr.id, attr.levels.length);
          }
          profile[attr.id] = levelIdx;
          counter[attr.id][levelIdx]++;
        }
        candidate.push(profile);
      }

      // 校验：alts 不重复 + 不 dominated
      let ok = true;
      for (let i = 0; i < candidate.length; i++) {
        for (let j = i + 1; j < candidate.length; j++) {
          if (sameProfile(candidate[i], candidate[j])) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }
      if (ok && hasDominationInTask(candidate)) ok = false;

      if (ok) {
        altsThisTask = candidate;
        break;
      }
      // 回滚 counter
      for (const key in snapshot) counter[key] = snapshot[key];
      attempt++;
    }

    // 最差情况：30 次都没生成成功，就用最后一次（demo 容忍）
    if (altsThisTask.length === 0) {
      const profiles: Profile[] = [];
      for (let a = 0; a < nAlts; a++) {
        const profile: Profile = {};
        for (const attr of attributes) {
          profile[attr.id] = Math.floor(Math.random() * attr.levels.length);
          counter[attr.id][profile[attr.id]]++;
        }
        profiles.push(profile);
      }
      altsThisTask = profiles;
    }

    tasks.push({
      taskId: t + 1,
      alternatives: altsThisTask,
      isHoldout: false, // 先全部标 false，下面再抽 holdout
    });
  }

  // 随机抽 nHoldout 道作为 holdout（不是最后几道，避免疲劳偏差）
  // 策略：从后 60% 中均匀抽
  if (nHoldout > 0) {
    const startIdx = Math.floor(totalTasks * 0.4);
    const candidateIdxs: number[] = [];
    for (let i = startIdx; i < totalTasks; i++) candidateIdxs.push(i);
    // 洗牌后取前 nHoldout
    for (let i = candidateIdxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateIdxs[i], candidateIdxs[j]] = [candidateIdxs[j], candidateIdxs[i]];
    }
    const holdoutIdxs = new Set(candidateIdxs.slice(0, nHoldout));
    Array.from(holdoutIdxs).forEach((idx) => {
      tasks[idx].isHoldout = true;
    });
  }

  return tasks;
}
