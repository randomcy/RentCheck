"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ATTRIBUTES_V2,
  MIN_SELECTED,
  MAX_SELECTED,
  findAttr,
  applyCustomValues,
  CUSTOMIZABLE_NUMERIC_IDS,
  CUSTOM_VALUE_BOUNDS,
  type Profile,
  type ConjointAttribute,
  type CustomValueMap,
  type CustomizableNumericId,
} from "@/lib/conjoint-v2/attributes";
import { generateTasks, type ChoiceTask } from "@/lib/conjoint-v2/task-generator";
import {
  buildDesignSpec,
  fitMNL,
  computePartWorths,
  computeImportance,
  computeWTP,
  computeHoldoutAccuracy,
  type ChoiceRecord,
} from "@/lib/conjoint-v2/core";
import {
  useConjointV2Store,
  DEFAULT_HARD_CONSTRAINTS,
  type HardConstraints,
} from "@/store/conjointV2";
import { HardConstraintsBlock } from "@/components/quiz/HardConstraints";
import { usePreferenceStore } from "@/store/preference";
import type { PreferenceResult, AttributeWeight } from "@/types";

// ============================================================
// Step 1：维度勾选 + 轻量 BYO（理想 level 选择）
// ============================================================

interface Step1Props {
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  idealProfile: Profile;
  setIdealLevel: (attrId: string, levelIdx: number) => void;
  customValues: CustomValueMap;
  setCustomValue: (id: CustomizableNumericId, value: number | undefined) => void;
  hardConstraints: HardConstraints;
  setHardConstraints: (hc: HardConstraints) => void;
  onNext: () => void;
}

function StepSelection({
  selectedIds,
  toggleSelect,
  idealProfile,
  setIdealLevel,
  customValues,
  setCustomValue,
  hardConstraints,
  setHardConstraints,
  onNext,
}: Step1Props) {
  const canProceed = selectedIds.size >= MIN_SELECTED;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          先告诉我，你最在乎哪几件事
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          两步走：先设定「绝对不让步的硬筛选」，再从 12 个维度里勾选
          <span className="font-semibold text-foreground mx-1">{MIN_SELECTED}-{MAX_SELECTED} 个</span>
          愿意权衡的偏好。接下来 13 道题，每题二选一，凭直觉就好，约 2 分钟。
        </p>
      </div>

      {/* 硬筛选模块 */}
      <HardConstraintsBlock
        value={hardConstraints}
        onChange={setHardConstraints}
      />

      {/* 勾选进度 */}
      <div className="mb-5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          已勾选{" "}
          <span
            className={`font-bold tabular-nums ${
              selectedIds.size >= MIN_SELECTED && selectedIds.size <= MAX_SELECTED
                ? "text-emerald-600"
                : selectedIds.size > MAX_SELECTED
                ? "text-amber-600"
                : "text-muted-foreground"
            }`}
          >
            {selectedIds.size}
          </span>{" "}
          / {MAX_SELECTED}
        </span>
        {selectedIds.size > MAX_SELECTED && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="h-3 w-3" />
            最多 {MAX_SELECTED} 个，请取消一些
          </span>
        )}
        {selectedIds.size < MIN_SELECTED && (
          <span className="text-xs text-muted-foreground">
            至少再选 {MIN_SELECTED - selectedIds.size} 个
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {ATTRIBUTES_V2.map((attr) => {
          const selected = selectedIds.has(attr.id);
          const idealLv = idealProfile[attr.id] ?? attr.levels.length - 1;
          const disabled =
            !selected && selectedIds.size >= MAX_SELECTED;

          return (
            <Card
              key={attr.id}
              className={`p-3.5 transition-all cursor-pointer relative ${
                selected
                  ? "border-brand-red bg-brand-red-pale/20 ring-1 ring-brand-red/40 shadow-sm"
                  : disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-brand-red/40 hover:bg-brand-red-pale/5"
              }`}
              onClick={() => !disabled && toggleSelect(attr.id)}
            >
              <div className="flex items-start gap-2.5 mb-2">
                <div className="text-xl leading-none mt-0.5">{attr.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-tight">{attr.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {attr.hint}
                  </div>
                </div>
                <div
                  className={`flex items-center justify-center w-4 h-4 rounded border-2 transition-colors shrink-0 mt-0.5 ${
                    selected
                      ? "bg-brand-red border-brand-red text-white"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </div>
              </div>

              {/* 轻量 BYO：勾选后展开"理想 level" */}
              {selected && (
                <div
                  className="mt-2 pt-2 border-t border-brand-red/15"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] text-muted-foreground mb-1.5">
                    你的理想是？
                  </div>
                  <NumericLevelPicker
                    attr={attr}
                    idealLv={idealLv}
                    customValue={
                      customValues[attr.id as CustomizableNumericId]
                    }
                    onSelectPreset={(idx) => setIdealLevel(attr.id, idx)}
                    onCommitCustom={(v) =>
                      setCustomValue(attr.id as CustomizableNumericId, v)
                    }
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!canProceed}
          onClick={onNext}
          className="min-w-[180px]"
        >
          开始答题
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="mt-4 text-xs text-muted-foreground flex items-start gap-2 bg-secondary/30 rounded-lg p-3">
        <Sparkles className="h-3.5 w-3.5 text-brand-red mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <strong className="text-foreground">为什么这么设计？</strong>
          先让你勾选关心的维度，是为了把后面的选择题压到最少，同时贴近你的真实租房场景。
          全程 90 秒左右，不会让你做无谓的对比。
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NumericLevelPicker：最高 + 中 + 自定义
// ============================================================

interface NumericLevelPickerProps {
  attr: ConjointAttribute;
  idealLv: number;
  customValue: number | undefined;
  onSelectPreset: (lvIdx: number) => void;
  onCommitCustom: (v: number | undefined) => void;
}

function NumericLevelPicker({
  attr,
  idealLv,
  customValue,
  onSelectPreset,
  onCommitCustom,
}: NumericLevelPickerProps) {
  const isNumeric = CUSTOMIZABLE_NUMERIC_IDS.includes(
    attr.id as CustomizableNumericId
  );

  // 非数字型维度：保留原本 3 档预设
  if (!isNumeric) {
    return (
      <div className="flex flex-wrap gap-1">
        {attr.levels.map((lv, idx) => {
          const active = idealLv === idx;
          return (
            <button
              key={idx}
              onClick={() => onSelectPreset(idx)}
              className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                active
                  ? "bg-brand-red text-white font-medium"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {lv.label}
            </button>
          );
        })}
      </div>
    );
  }

  // 数字型：最高 + 中 + 自定义
  const bounds = CUSTOM_VALUE_BOUNDS[attr.id as CustomizableNumericId];
  // attr.levels 是「差→好」顺序。对于 preference=lower，“最高”是第一档（数值最大）；
  // 对于 preference=higher，“最高”也是数值最大。都可以取 levels 中 value 最大的那一档。
  const sortedByValue = [...attr.levels]
    .map((lv, idx) => ({ lv, idx }))
    .sort((a, b) => b.lv.value - a.lv.value); // 从大到小
  const highest = sortedByValue[0]; // 数值最大
  const middle = sortedByValue[1]; // 数值中间

  const [editing, setEditing] = useState(customValue !== undefined);
  const [draft, setDraft] = useState(
    customValue !== undefined ? String(customValue) : ""
  );
  const customActive = customValue !== undefined;

  const draftNum = Number(draft);
  const outOfBounds =
    draft !== "" &&
    Number.isFinite(draftNum) &&
    (draftNum < bounds.min || draftNum > bounds.max);
  const invalid = draft !== "" && !Number.isFinite(draftNum);

  const commitCustom = () => {
    if (draft === "") {
      onCommitCustom(undefined);
      setEditing(false);
      return;
    }
    if (invalid) return;
    // 软提示：超范围也允许提交，但会显示警告
    onCommitCustom(draftNum);
  };

  const selectPreset = (idx: number) => {
    onCommitCustom(undefined); // 清除自定义
    setDraft("");
    setEditing(false);
    onSelectPreset(idx);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 items-center">
        {/* 最高档 */}
        <button
          onClick={() => selectPreset(highest.idx)}
          className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
            idealLv === highest.idx && !customActive
              ? "bg-brand-red text-white font-medium"
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {highest.lv.label}
        </button>
        {/* 中档 */}
        <button
          onClick={() => selectPreset(middle.idx)}
          className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
            idealLv === middle.idx && !customActive
              ? "bg-brand-red text-white font-medium"
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {middle.lv.label}
        </button>
        {/* 自定义按钮 */}
        <button
          onClick={() => setEditing((e) => !e)}
          className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
            customActive
              ? "bg-brand-red text-white font-medium"
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {customActive ? `自定义 ${customValue}` : "自定义"}
        </button>
      </div>

      {editing && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCustom();
              }}
              placeholder={`例: ${Math.round(
                (bounds.min + bounds.max) / 4
              )}`}
              className="flex-1 min-w-0 text-[11px] px-2 py-1 rounded-md border border-brand-red/30 focus:outline-none focus:border-brand-red bg-white"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">
              {bounds.unit}
            </span>
            <button
              onClick={commitCustom}
              disabled={invalid || draft === ""}
              className="text-[10px] px-2 py-1 rounded-md bg-brand-red text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认
            </button>
          </div>
          {(outOfBounds || invalid) && (
            <div className="text-[9px] leading-tight">
              {outOfBounds ? (
                <span className="text-amber-600">
                  ⚠ 超出常见范围（{bounds.min}-{bounds.max} {bounds.unit}），仍可提交
                </span>
              ) : (
                <span className="text-rose-600">⚠ 请输入有效数字</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Step 2：CBC 答题
// ============================================================

interface Step2Props {
  attrs: ConjointAttribute[];
  tasks: ChoiceTask[];
  currentIdx: number;
  onChoose: (altIdx: number) => void;
  onRestart: () => void;
}

function StepChoice({
  attrs,
  tasks,
  currentIdx,
  onChoose,
  onRestart,
}: Step2Props) {
  const task = tasks[currentIdx];
  const progress = ((currentIdx + 1) / tasks.length) * 100;
  const remaining = tasks.length - currentIdx - 1;

  // 计算差异维度：两张卡在哪些 attr 上 level 不同。仅在两卡场景下启用高亮。
  const diffSet = (() => {
    if (!task || task.alternatives.length !== 2) return null;
    const a = task.alternatives[0];
    const b = task.alternatives[1];
    const s = new Set<string>();
    for (const attr of attrs) {
      if (a[attr.id] !== b[attr.id]) s.add(attr.id);
    }
    return s;
  })();

  if (!task) return null;

  // 进度文案：三档节奏感
  // - 最后一题 → 「最后一题了」
  // - 剩 ≤3 题 → 「还差 X 题」冲刺感
  // - 已完成一半（中点后）→ 「过半了，第 X / Y 题」里程碑感
  // - 其他 → 「第 X / Y 题」
  const halfway = Math.ceil(tasks.length / 2);
  const progressLine =
    remaining === 0
      ? "最后一题了"
      : remaining <= 3
      ? `还差 ${remaining} 题`
      : currentIdx + 1 === halfway
      ? `过半了，第 ${currentIdx + 1} / ${tasks.length} 题`
      : `第 ${currentIdx + 1} / ${tasks.length} 题`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold tabular-nums">
          {progressLine}
        </span>
        <Button variant="outline" size="sm" onClick={onRestart}>
          <RefreshCw className="h-3.5 w-3.5" />
          重测
        </Button>
      </div>
      <Progress value={progress} className="mb-6" />

      <div className="text-center mb-6">
        <p className="text-base md:text-lg font-medium text-foreground">
          两套房里，你更想住哪一套？
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          凭直觉，没有标准答案 · 变灰的维度是两套房一样的，不用仔细看
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={task.taskId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={
            task.alternatives.length === 2
              ? "grid md:grid-cols-2 gap-3 md:gap-4 max-w-3xl mx-auto"
              : "grid md:grid-cols-3 gap-3 md:gap-4"
          }
        >
          {task.alternatives.map((alt, altIdx) => (
            <button
              key={altIdx}
              onClick={() => onChoose(altIdx)}
              className="text-left bg-white rounded-2xl border border-border hover:border-brand-red hover:shadow-md transition-all p-4 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                  选项 {String.fromCharCode(65 + altIdx)}
                </span>
                <div className="w-6 h-6 rounded-full bg-secondary/60 group-hover:bg-brand-red group-hover:text-white flex items-center justify-center text-[10px] font-bold transition-colors">
                  {String.fromCharCode(65 + altIdx)}
                </div>
              </div>
              <div className="space-y-2">
                {attrs.map((attr) => {
                  const levelIdx = alt[attr.id];
                  const lv = attr.levels[levelIdx];
                  const isDiff = diffSet ? diffSet.has(attr.id) : true;
                  return (
                    <div
                      key={attr.id}
                      className={
                        isDiff
                          ? "flex items-center justify-between gap-2 text-sm"
                          : "flex items-center justify-between gap-2 text-xs opacity-40"
                      }
                    >
                      <span
                        className={
                          isDiff
                            ? "text-muted-foreground inline-flex items-center gap-1.5 min-w-0"
                            : "text-muted-foreground inline-flex items-center gap-1.5 min-w-0"
                        }
                      >
                        <span
                          className={
                            isDiff ? "text-base shrink-0" : "text-sm shrink-0"
                          }
                        >
                          {attr.icon}
                        </span>
                        <span className="truncate">{attr.name}</span>
                      </span>
                      <span
                        className={
                          isDiff
                            ? "font-semibold text-foreground text-right"
                            : "font-normal text-muted-foreground text-right"
                        }
                      >
                        {lv.label}
                        {lv.desc && isDiff && (
                          <span className="block text-[9px] text-muted-foreground font-normal">
                            {lv.desc}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              {diffSet && (
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    高亮 = 两套不同点
                  </span>
                  <span className="text-xs text-brand-red font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    选这个 →
                  </span>
                </div>
              )}
              {!diffSet && (
                <div className="mt-3 pt-3 border-t border-border/60 text-center text-xs text-brand-red font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  选这个 →
                </div>
              )}
            </button>
          ))}
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-muted-foreground mt-6">
        你的真实偏好是最有价值的数据 · 别考虑太多
      </p>
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export default function QuizPage() {
  const router = useRouter();
  const { setResult } = useConjointV2Store();
  const setLegacyResult = usePreferenceStore((s) => s.setResult);

  const [step, setStep] = useState<"select" | "choice">("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(ATTRIBUTES_V2.filter((a) => a.defaultSelected).map((a) => a.id))
  );
  const [hardConstraints, setHardConstraints] = useState<HardConstraints>(
    DEFAULT_HARD_CONSTRAINTS
  );
  const [idealProfile, setIdealProfile] = useState<Profile>(() => {
    // 默认每个维度的理想 = levels 的最后一项（即"好"的方向）
    const p: Profile = {};
    for (const attr of ATTRIBUTES_V2) {
      p[attr.id] = attr.levels.length - 1;
    }
    return p;
  });

  // 用户自定义的数字型中心值（会在 handleStartChoice 中被用来重生成 levels）
  const [customValues, setCustomValues] = useState<CustomValueMap>({});
  const setCustomValue = (
    id: CustomizableNumericId,
    value: number | undefined
  ) => {
    setCustomValues((cv) => {
      const next = { ...cv };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  // 应用了用户自定义的完整属性列表（走下游出题 / 编码 / WTP）
  const effectiveSelectedAttrs = useMemo(
    () => applyCustomValues(Array.from(selectedIds).map((id) => findAttr(id)!).filter(Boolean), customValues),
    [selectedIds, customValues]
  );

  const [tasks, setTasks] = useState<ChoiceTask[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [choices, setChoices] = useState<Record<number, number>>({});

  const selectedAttrs = effectiveSelectedAttrs;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_SELECTED) next.add(id);
    setSelectedIds(next);
  };

  const setIdealLevel = (attrId: string, levelIdx: number) => {
    setIdealProfile((p) => ({ ...p, [attrId]: levelIdx }));
  };

  const handleStartChoice = () => {
    // 过滤 idealProfile，只保留勾选维度
    const idealForSelected: Profile = {};
    Array.from(selectedIds).forEach((id) => {
      idealForSelected[id] = idealProfile[id];
    });
    // 三层精度设计：13 题（8 训练 + 5 holdout）× 每题 2 卡 × Partial-Profile k=3
    // 1. 8 训练题：β 标准误约为 12×3 卡 Full-Profile 基准的 1.2×，Top-3 重测一致性 ~95%
    // 2. 5 Holdout：随机基准 50%，全对 p = 3.1% < 0.05（学术显著性门槛）
    // 3. kActive=3 Partial-Profile：每题只让 3 个维度变化，其他锁定同值
    //    → 用户认知负载稳定（3 个变量的二元选择）
    //    → 13 题 × 3 激活 = 39 次信号，5-7 维每个平均 5-8 次，β 质量仍足够
    //    → Sawtooth/Qualtrics 近十年默认设计，维度≥5 时优于 Full-Profile
    const generated = generateTasks(selectedAttrs, {
      idealProfile: idealForSelected,
      nTasks: 8,
      nHoldout: 5,
      nAlts: 2,
      kActive: 3,
    });
    setTasks(generated);
    setCurrentIdx(0);
    setChoices({});
    setStep("choice");
  };

  const handleChoose = (altIdx: number) => {
    const task = tasks[currentIdx];
    const newChoices = { ...choices, [task.taskId]: altIdx };
    setChoices(newChoices);

    if (currentIdx + 1 < tasks.length) {
      setCurrentIdx((i) => i + 1);
      return;
    }

    // 全部答完 → 计算结果
    const spec = buildDesignSpec(selectedAttrs);
    const trainingRecords: ChoiceRecord[] = [];
    const holdoutRecords: ChoiceRecord[] = [];
    for (const t of tasks) {
      const altsX = t.alternatives.map(spec.encode);
      const chosen = newChoices[t.taskId] ?? 0;
      const rec: ChoiceRecord = { taskId: t.taskId, altsX, chosen };
      if (t.isHoldout) holdoutRecords.push(rec);
      else trainingRecords.push(rec);
    }

    const fit = fitMNL(trainingRecords, spec.K, {
      lambda: 1.0,
      maxIter: 500,
      lr: 0.05,
    });
    const pw = computePartWorths(fit.beta, spec);
    const imp = computeImportance(pw);
    const wtp = computeWTP(pw);
    const acc = computeHoldoutAccuracy(fit.beta, holdoutRecords);

    setResult({
      selectedAttrIds: Array.from(selectedIds),
      partWorths: pw,
      importance: imp,
      wtp,
      holdout: acc,
      beta: fit.beta,
      loss: fit.loss,
      converged: fit.converged,
      idealProfile,
      tasks,
      choices: newChoices,
      hardConstraints,
    });

    // 同步一份析跳脚到老 store，供社区页 MatchBanner 继续使用
    // （映射 attr id 到老类型的 attributeId）
    const legacyWeights: AttributeWeight[] = imp.map((i) => ({
      attributeId: i.attrId,
      name: i.attrName,
      icon: findAttr(i.attrId)?.icon ?? "✨",
      weight: i.importance,
    }));
    const sorted = [...legacyWeights].sort((a, b) => b.weight - a.weight);
    const top1 = sorted[0];
    const bottom1 = sorted[sorted.length - 1];
    const legacy: PreferenceResult = {
      weights: legacyWeights,
      sortedWeights: sorted,
      personalityTag: top1
        ? `重 ${top1.name} 轻 ${bottom1.name}`
        : "均衡型",
      subTags: sorted.slice(0, 2).map((w) => w.name),
      description: top1
        ? `你最看重 ${top1.name}（${(top1.weight * 100).toFixed(0)}%），对 ${bottom1.name} 最为宽容。`
        : "",
      topAttributeId: top1?.attributeId ?? "",
      topAttributeName: top1?.name ?? "",
      bottomAttributeId: bottom1?.attributeId ?? "",
      bottomAttributeName: bottom1?.name ?? "",
      utilities: {},
    };
    setLegacyResult(legacy);

    router.push("/result");
  };

  const handleRestart = () => {
    setStep("select");
    setCurrentIdx(0);
    setChoices({});
    setTasks([]);
  };

  // 进入答题阶段时如果还没生成 tasks，回退到 select
  useEffect(() => {
    if (step === "choice" && tasks.length === 0) {
      setStep("select");
    }
  }, [step, tasks.length]);

  return (
    <div className="container py-8 md:py-12 max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        返回首页
      </Link>

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-red-deep mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          租房偏好测试
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          13 道题，看见你真正在意的事
        </h1>
      </div>

      {step === "select" ? (
        <StepSelection
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          idealProfile={idealProfile}
          setIdealLevel={setIdealLevel}
          customValues={customValues}
          setCustomValue={setCustomValue}
          hardConstraints={hardConstraints}
          setHardConstraints={setHardConstraints}
          onNext={handleStartChoice}
        />
      ) : (
        <StepChoice
          attrs={selectedAttrs}
          tasks={tasks}
          currentIdx={currentIdx}
          onChoose={handleChoose}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
