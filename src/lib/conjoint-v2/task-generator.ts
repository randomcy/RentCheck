/**
 * Conjoint v2 · CBC 任务生成（均衡随机 + Partial-Profile）
 *
 * 设计原则（详见 notes/conjoint-method.md §2）：
 * - **Partial-Profile**：每题只让 kActive (默认 3) 个维度变化，其他维度两张卡锁定相同 level
 *   → 2015 年后 Sawtooth/Qualtrics 默认，维度≥5 时认知负载可控
 *   → 跨题轮转激活，保证每个维度都被足够多次测量
 * - Balanced Random Design：每个 attribute 在每个 alternative 位置上 level 出现次数尽可能均匀
 * - 避免 dominated alternatives：A 在所有"有方向"维度上都优于 B，会让选择没信息量
 * - Holdout：从生成的 N+H 题里随机抽 H 题作为 holdout（从后 60% 中抽，避免疲劳）
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
  /**
   * Partial-Profile：每题激活几个维度（剩余维度两卡使用同一 level）。
   * 设为 undefined 或≥0 表示 Full-Profile（所有维度均变化）。
   * 推荐值：3。如果 attributes.length <= kActive，退化为 Full-Profile。
   */
  kActive?: number;
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
    kActive,
  } = opts;

  const totalTasks = nTasks + nHoldout;

  // Partial-Profile 生效条件：kActive >= 1 且 < attributes.length
  // 否则退化到 Full-Profile（所有维度都激活）
  const usePartial =
    typeof kActive === "number" &&
    kActive >= 1 &&
    kActive < attributes.length;
  const k = usePartial ? (kActive as number) : attributes.length;

  // 每个 attribute 的 level 出现计数（在所有题、所有 alt 位置上累加）
  const counter: Record<string, number[]> = {};
  for (const attr of attributes) {
    counter[attr.id] = new Array(attr.levels.length).fill(0);
  }

  // Partial-Profile 轮转计数器：记录每个维度被「激活」的次数（跨题轮转均匀）
  const activeCounter: Record<string, number> = {};
  for (const attr of attributes) activeCounter[attr.id] = 0;

  /** 从 attributes 里选出本题激活的 k 个维度：优先选被激活过最少的维度，以保证每个维度跨题出现次数均匀。同频随机。 */
  const pickActiveAttrs = (): ConjointAttribute[] => {
    if (!usePartial) return attributes;
    const sorted = [...attributes].sort((a, b) => {
      const diff = activeCounter[a.id] - activeCounter[b.id];
      if (diff !== 0) return diff;
      return Math.random() - 0.5; // 同频随机打乱
    });
    const picked = sorted.slice(0, k);
    picked.forEach((a) => activeCounter[a.id]++);
    return picked;
  };

  /** 选当前出现次数最少的 level；并列时随机。可排除某些 level（用于强制激活维度差异） */
  const pickBalancedLevel = (
    attrId: string,
    levelCount: number,
    excludeLevels: Set<number> = new Set()
  ): number => {
    const c = counter[attrId];
    // 先找出未被排除的 level
    const allowed: number[] = [];
    for (let i = 0; i < levelCount; i++) {
      if (!excludeLevels.has(i)) allowed.push(i);
    }
    if (allowed.length === 0) {
      // 全部被排除了，退回到任意 level（理论上不应该发生）
      return Math.floor(Math.random() * levelCount);
    }
    const minVal = Math.min(...allowed.map((i) => c[i]));
    const candidates = allowed.filter((i) => c[i] === minVal);
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  /**
   * 检查是否 dominated：对所有有方向的 attribute（lower / higher），
   * 如果 alt A 在所有维度上都 ≥ alt B（且至少一个严格 >），则 A 弱占优 B。
   * 注意：nominal 维度（整租/合租）不参与判断。
   *
   * Partial-Profile 下仅在激活维度范围内检查。原因：非激活维度两卡同 level，
   * 不应贡献优势判断；否则 3 维变化时极易出现“A 在 3 维都优于 B”被误拒。
   */
  const isDominated = (
    a: Profile,
    b: Profile,
    activeIdSet?: Set<string>
  ): boolean => {
    let strictlyBetter = false;
    let allAtLeastAsGood = true;
    for (const attr of attributes) {
      if (attr.preference === "nominal") continue;
      // Partial-Profile 限定：仅检查激活维度
      if (activeIdSet && !activeIdSet.has(attr.id)) continue;
      const aIdx = a[attr.id];
      const bIdx = b[attr.id];
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
  const hasDominationInTask = (
    alts: Profile[],
    activeIdSet?: Set<string>
  ): boolean => {
    for (let i = 0; i < alts.length; i++) {
      for (let j = 0; j < alts.length; j++) {
        if (i === j) continue;
        if (isDominated(alts[i], alts[j], activeIdSet)) return true;
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
    // Partial-Profile 下校验更严格（激活维度必须产生差异），重试上限加大
    const MAX_ATTEMPT = usePartial ? 60 : 30;
    let fallbackActiveAttrs: ConjointAttribute[] | null = null;

    while (attempt < MAX_ATTEMPT) {
      // 临时计数器副本（如果这次失败可以回滚）
      const snapshot: Record<string, number[]> = {};
      for (const key in counter) snapshot[key] = [...counter[key]];
      const activeSnapshot = { ...activeCounter };

      // 本题激活的 k 个维度（Partial-Profile）。Full-Profile 时返回全部。
      const activeAttrs = pickActiveAttrs();
      const activeIdSet = new Set(activeAttrs.map((a) => a.id));
      fallbackActiveAttrs = activeAttrs; // 兜底分支使用最后一次激活集

      // “锁定 level”：对非激活维度，本题所有 alt 使用同一个 level。
      // 选择策略：优先用用户理想 level（idealProfile），不然均衡抽。
      const lockedLevels: Record<string, number> = {};
      for (const attr of attributes) {
        if (activeIdSet.has(attr.id)) continue;
        if (idealProfile && idealProfile[attr.id] !== undefined) {
          lockedLevels[attr.id] = idealProfile[attr.id];
        } else {
          lockedLevels[attr.id] = pickBalancedLevel(attr.id, attr.levels.length);
        }
      }

      // 关键改造：先记录每个激活维度在 alt[0] 用的 level，
      // 后续 alt 在激活维度上强制排除已用 level，保证「激活=可见变化」。
      const usedInAttr: Record<string, Set<number>> = {};
      for (const attr of activeAttrs) usedInAttr[attr.id] = new Set();

      const candidate: Profile[] = [];
      for (let a = 0; a < nAlts; a++) {
        const profile: Profile = {};
        for (const attr of attributes) {
          if (activeIdSet.has(attr.id)) {
            // 激活维度：强制与前面 alt 不同 level（保证可见差异）
            // 例外：当 levels.length=1（理论上不应发生）或剩余 level 已用尽时，回退到无约束抽
            const excluded = usedInAttr[attr.id];
            let levelIdx: number;
            if (excluded.size >= attr.levels.length) {
              // level 用尽（例如 nAlts > level 数），无约束抽
              levelIdx = pickBalancedLevel(attr.id, attr.levels.length);
            } else if (
              idealProfile &&
              idealProfile[attr.id] !== undefined &&
              Math.random() < 0.3 &&
              !excluded.has(idealProfile[attr.id])
            ) {
              levelIdx = idealProfile[attr.id];
            } else {
              levelIdx = pickBalancedLevel(
                attr.id,
                attr.levels.length,
                excluded
              );
            }
            profile[attr.id] = levelIdx;
            usedInAttr[attr.id].add(levelIdx);
            counter[attr.id][levelIdx]++;
          } else {
            // 非激活维度：使用本题统一锁定 level（两张卡相同值）
            profile[attr.id] = lockedLevels[attr.id];
            counter[attr.id][lockedLevels[attr.id]]++;
          }
        }
        candidate.push(profile);
      }

      // 校验 1：alts 不重复 + 不 dominated
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
      if (ok && hasDominationInTask(candidate, usePartial ? activeIdSet : undefined)) ok = false;

      // 校验 2（Partial-Profile 专有）：所有激活维度必须在 alts 之间产生变化，
      // 避免「声称激活但两卡压到同 level」。这保证每题「可见变化」的维度数 = kActive。
      if (ok && usePartial) {
        for (const attr of activeAttrs) {
          const vals = new Set(candidate.map((p) => p[attr.id]));
          if (vals.size < 2) {
            ok = false;
            break;
          }
        }
      }

      if (ok) {
        altsThisTask = candidate;
        break;
      }
      // 回滚 counter + activeCounter
      for (const key in snapshot) counter[key] = snapshot[key];
      for (const key in activeSnapshot) activeCounter[key] = activeSnapshot[key];
      attempt++;
    }

    // 兜底分支：MAX_ATTEMPT 次都没生成出合格题。
    // Partial-Profile：仍在限定激活集内采样，并「强制激活维度不同 level」，仅不再检 dominated（避免死循环）。
    // Full-Profile：与原逻辑保持一致。
    if (altsThisTask.length === 0) {
      const fallbackActive = fallbackActiveAttrs ?? attributes;
      const fallbackActiveSet = new Set(fallbackActive.map((a) => a.id));
      const fallbackLocked: Record<string, number> = {};
      for (const attr of attributes) {
        if (fallbackActiveSet.has(attr.id)) continue;
        fallbackLocked[attr.id] =
          idealProfile?.[attr.id] ??
          Math.floor(Math.random() * attr.levels.length);
      }
      // 兜底也要保证激活维度产生可见差异
      const usedInAttrFb: Record<string, Set<number>> = {};
      for (const attr of fallbackActive) usedInAttrFb[attr.id] = new Set();
      const profiles: Profile[] = [];
      for (let a = 0; a < nAlts; a++) {
        const profile: Profile = {};
        for (const attr of attributes) {
          if (fallbackActiveSet.has(attr.id)) {
            const used = usedInAttrFb[attr.id];
            const available: number[] = [];
            for (let i = 0; i < attr.levels.length; i++) {
              if (!used.has(i)) available.push(i);
            }
            const pool = available.length > 0 ? available : Array.from({ length: attr.levels.length }, (_, i) => i);
            const levelIdx = pool[Math.floor(Math.random() * pool.length)];
            profile[attr.id] = levelIdx;
            usedInAttrFb[attr.id].add(levelIdx);
          } else {
            profile[attr.id] = fallbackLocked[attr.id];
          }
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
