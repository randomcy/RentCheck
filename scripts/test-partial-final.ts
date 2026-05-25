import { ATTRIBUTES_V2 } from "../src/lib/conjoint-v2/attributes";
import { generateTasks } from "../src/lib/conjoint-v2/task-generator";

const selectedIds = ["price", "commute", "rentType", "area", "elevator", "decoration"];
const selectedAttrs = ATTRIBUTES_V2.filter(a => selectedIds.includes(a.id));

// 跑 10 轮看稳定性
let totalOk = 0, totalRuns = 0, totalBadTasks = 0;
const dimUsageGlobal: Record<string, number> = {};
selectedIds.forEach(id => (dimUsageGlobal[id] = 0));

for (let run = 0; run < 10; run++) {
  const tasks = generateTasks(selectedAttrs, {
    nTasks: 8, nHoldout: 5, nAlts: 2, kActive: 3,
  });
  let allOk = true;
  tasks.forEach(task => {
    const [a, b] = task.alternatives;
    const diffCount = selectedAttrs.filter(attr => a[attr.id] !== b[attr.id]).length;
    if (diffCount !== 3) { allOk = false; totalBadTasks++; }
    selectedAttrs.forEach(attr => {
      if (a[attr.id] !== b[attr.id]) dimUsageGlobal[attr.id]++;
    });
  });
  if (allOk) totalOk++;
  totalRuns++;
}

console.log(`=== 10 轮 × 每轮 13 题，每题应变 3 维 ===`);
console.log(`完美轮数（全部题都正好 3 维变化）: ${totalOk}/${totalRuns}`);
console.log(`总坏题数: ${totalBadTasks} / ${totalRuns * 13}`);
console.log(`\n=== 各维度激活次数（10 轮累计，应大致均匀）===`);
Object.entries(dimUsageGlobal).forEach(([id, n]) => console.log(`  ${id}: ${n} 次`));
