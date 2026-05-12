/**
 * Conjoint v2 算法验证：模拟一个有明确偏好的用户答题，看 β 能否被反推出来
 */
import { ATTRIBUTES_V2, findAttr } from "../src/lib/conjoint-v2/attributes";
import { generateTasks } from "../src/lib/conjoint-v2/task-generator";
import {
  buildDesignSpec,
  fitMNL,
  mnlProbs,
  computePartWorths,
  computeImportance,
  computeWTP,
  computeHoldoutAccuracy,
  type ChoiceRecord,
} from "../src/lib/conjoint-v2/core";

// 1. 选 7 个维度（模拟用户勾选）
const chosenIds = [
  "price",
  "commute",
  "area",
  "elevator",
  "privateBath",
  "decoration",
  "rentType",
];
const attrs = chosenIds.map((id) => findAttr(id)!);
console.log("=== 选用维度 ===");
console.log(attrs.map((a) => a.name).join(" / "));

// 2. 生成任务
const tasks = generateTasks(attrs, { nTasks: 10, nHoldout: 2, nAlts: 3 });
console.log(`\n=== 生成 ${tasks.length} 道题（含 ${tasks.filter(t => t.isHoldout).length} 道 holdout）===`);

// 3. 构建设计矩阵
const spec = buildDesignSpec(attrs);
console.log(`\n=== 特征维度 K = ${spec.K} ===`);
spec.featureMeta.forEach((m, i) => {
  console.log(`  [${i}] ${m.label} (${m.encoding})`);
});

// 4. 模拟真实 β（一个虚构用户的真实偏好）
//    例如：极度在意价格、相对在意电梯/独卫、对装修无所谓
const trueBeta: Record<string, number> = {};
// linear（标准化后单位 β）
trueBeta["月租金（元/月）"] = -2.5; // 强烈不喜欢高租金
trueBeta["通勤时间（分钟）"] = -1.5;
// part-worth
trueBeta["房屋面积 = 55 ㎡"] = 0.5;
trueBeta["房屋面积 = 75 ㎡"] = 1.0;
trueBeta["电梯 = 有电梯"] = 1.2;
trueBeta["电梯 = 新装电梯"] = 1.3;
trueBeta["独立卫浴 = 半独立"] = 0.6;
trueBeta["独立卫浴 = 完全独立"] = 1.5;
trueBeta["装修档次 = 精装"] = 0.2;
trueBeta["装修档次 = 豪装/网红"] = 0.3;
trueBeta["整租/合租 = 两人合租"] = 0.4;
trueBeta["整租/合租 = 整租独居"] = 0.8;

const trueBetaVec = spec.featureMeta.map((m) => trueBeta[m.label] ?? 0);
console.log("\n=== 真实 β ===");
console.log(trueBetaVec.map(b => b.toFixed(2)));

// 5. 模拟用户答题（带 Gumbel 噪声的 MNL 选择）
const allRecords: ChoiceRecord[] = [];
const holdoutRecords: ChoiceRecord[] = [];
for (const task of tasks) {
  const altsX = task.alternatives.map(spec.encode);
  const probs = mnlProbs(trueBetaVec, altsX);
  // 按概率采样
  const r = Math.random();
  let acc = 0;
  let chosen = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r <= acc) { chosen = i; break; }
  }
  const record: ChoiceRecord = { taskId: task.taskId, altsX, chosen };
  if (task.isHoldout) holdoutRecords.push(record);
  else allRecords.push(record);
}

console.log(`\n=== 模拟答题：训练 ${allRecords.length} / holdout ${holdoutRecords.length} ===`);

// 6. 估计 β
const fit = fitMNL(allRecords, spec.K, { lambda: 0.5, maxIter: 500 });
console.log(`\n=== 拟合结果 ===`);
console.log(`Loss: ${fit.loss.toFixed(3)}, Iter: ${fit.iterations}, Converged: ${fit.converged}`);
console.log("估计 β：", fit.beta.map(b => b.toFixed(2)));

// 7. Part-worth
const pw = computePartWorths(fit.beta, spec);
console.log("\n=== Part-Worth ===");
for (const p of pw) {
  console.log(`  ${p.attrName} (range=${p.range.toFixed(2)}):`);
  for (const l of p.levels) {
    console.log(`    ${l.label}: ${l.utility.toFixed(2)}`);
  }
}

// 8. Importance
const imp = computeImportance(pw);
console.log("\n=== Importance Score ===");
for (const i of imp.sort((a, b) => b.importance - a.importance)) {
  console.log(`  ${i.attrName}: ${(i.importance * 100).toFixed(1)}%`);
}

// 9. WTP
const wtp = computeWTP(pw);
console.log(`\n=== WTP（valid=${wtp.valid}）===`);
if (wtp.valid) {
  for (const w of wtp.items) {
    console.log(`  ${w.attrName}:`);
    for (const l of w.levels) {
      console.log(`    ${l.label}: 每月愿多付 ¥${l.wtp.toFixed(0)}`);
    }
  }
} else {
  console.log(`  ${wtp.reason}`);
}

// 10. Holdout 准确率
const acc = computeHoldoutAccuracy(fit.beta, holdoutRecords);
console.log(`\n=== Holdout 预测 ===`);
console.log(`  准确率：${(acc.accuracy * 100).toFixed(0)}% (${acc.nCorrect}/${acc.n})（随机基准 33%）`);
