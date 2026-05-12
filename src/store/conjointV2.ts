/**
 * Conjoint v2 状态存储（独立于老版 store，避免类型耦合）
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/conjoint-v2/attributes";
import type { ChoiceTask } from "@/lib/conjoint-v2/task-generator";
import type {
  PartWorth,
  Importance,
  WTPItem,
} from "@/lib/conjoint-v2/core";

export interface ConjointV2Result {
  selectedAttrIds: string[];
  partWorths: PartWorth[];
  importance: Importance[];
  wtp: { items: WTPItem[]; valid: boolean; reason?: string };
  holdout: { accuracy: number; nCorrect: number; n: number };
  beta: number[];
  loss: number;
  converged: boolean;
  /** 用户的勾选维度 + 理想 level（轻量 BYO） */
  idealProfile: Profile;
  /** 持久化的题目记录，用于 result 页面展示用户走过的路径 */
  tasks: ChoiceTask[];
  /** 每道题用户选了第几个 alt（taskId → chosen index） */
  choices: Record<number, number>;
}

interface State {
  result: ConjointV2Result | null;
  setResult: (r: ConjointV2Result | null) => void;
  reset: () => void;
}

export const useConjointV2Store = create<State>()(
  persist(
    (set) => ({
      result: null,
      setResult: (r) => set({ result: r }),
      reset: () => set({ result: null }),
    }),
    {
      name: "zufang-radar-conjoint-v2",
    }
  )
);
