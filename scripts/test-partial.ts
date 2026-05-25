import { ATTRIBUTES_V2 } from "../src/lib/conjoint-v2/attributes";
import { generateTasks } from "../src/lib/conjoint-v2/task-generator";

const selectedIds = ["price", "commute", "rentType", "area", "elevator", "decoration"];
const selectedAttrs = ATTRIBUTES_V2.filter(a => selectedIds.includes(a.id));

const tasks = generateTasks(selectedAttrs, {
  nTasks: 8,
  nHoldout: 5,
  nAlts: 2,
  kActive: 3,
});

console.log(`生成 ${tasks.length} 道题，勾选了 ${selectedAttrs.length} 个维度，kActive=3\n`);

const dimUsageCount: Record<string, number> = {};
selectedIds.forEach(id => (dimUsageCount[id] = 0));

tasks.forEach((task, i) => {
  const [a, b] = task.alternatives;
  const diffDims: string[] = [];
  const sameDims: string[] = [];
  selectedAttrs.forEach(attr => {
    if (a[attr.id] !== b[attr.id]) {
      diffDims.push(attr.id);
      dimUsageCount[attr.id]++;
    } else {
      sameDims.push(attr.id);
    }
  });
  const tag = task.isHoldout ? "[HOLDOUT]" : "[训练]";
  console.log(`第 ${i + 1} 题 ${tag}: 变化 ${diffDims.length} 维 [${diffDims.join(",")}]`);
});

console.log(`\n=== 各维度激活次数（越均匀越好）===`);
Object.entries(dimUsageCount).forEach(([id, n]) => console.log(`  ${id}: ${n} 次`));

const ok = tasks.every(t => {
  const [a, b] = t.alternatives;
  const diff = selectedAttrs.filter(attr => a[attr.id] !== b[attr.id]).length;
  return diff === 3;
});
console.log(`\n所有题都正好变化 3 个维度: ${ok ? "✅" : "❌"}`);
