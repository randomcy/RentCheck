# Choice-Based Conjoint (CBC) Analysis：严谨做法技术笔记

> **目标**：在 Next.js 租房 demo 中实现学术上站得住脚的 CBC。本文档覆盖从理论基础到浏览器可执行算法的全链路。

---

## 目录

1. [任务设计 (Task Design)](#1-任务设计)
2. [实验设计矩阵 (Experimental Design)](#2-实验设计矩阵)
3. [效用模型 (Utility Model)](#3-效用模型)
4. [参数估计 (Estimation)](#4-参数估计)
5. [结果解释 (Interpretation)](#5-结果解释)
6. [租房场景属性设计](#6-租房场景属性设计)
7. [个性化出题的严谨性](#7-个性化出题的严谨性)
8. [学术参考](#8-学术参考)
9. [最终设计规格（实现速查表）](#9-最终设计规格实现速查表)

---

## 1. 任务设计

### 1.1 CBC vs 评分式 vs 排序式 conjoint

| 维度 | CBC（Choice-Based） | 评分式（Rating） | 排序式（Ranking） |
|------|---------------------|-------------------|-------------------|
| **生态效度** | ✅ 最高：模拟真实购买行为（选一个） | ❌ 低：用户不会给产品打分 | 🟡 中：与自然行为有差距 |
| **理论基础** | ✅ 随机效用理论（McFadden 1974）→ Multinomial Logit | 普通回归，假设评分区间等距 | 需要 rank-ordered logit |
| **信息量** | 每题 1 bit（选哪个），但量足够 | 每题多维度，但尺度偏差严重 | 提供更多信息，但认知负荷高 |
| **缺点** | 单题信息量低，需要足够 task 数 | 趋中偏差（60-80 分集中），分辨率差 | 要求对所有 alternatives 排序，疲劳 |
| **工业标准** | ✅ 是（Sawtooth / Qualtrics / Conjointly 默认方法） | ❌ 已过时 | 较少使用 |

**为什么 CBC 是工业标准**：

- **行为真实性**：真实消费者的决策就是"选哪个"，而不是"给每个选项打分"。CBC 的任务格式直接对应真实决策。
- **统计严谨性**：McFadden（1974）的随机效用理论（RUM）为 MNL 提供了坚实的微观经济学基础（该工作获 2000 年诺贝尔经济学奖）。
- **尺度不变性**：选择只需比较，不受绝对评分偏差影响。
- **IIA 假设的可处理性**：标准 MNL 下独立性假设（IIA）使 closed-form 估计成为可能。

> 📖 参考：[Conjointly 对 13 种 conjoint 方法的比较](https://conjointly.com/guides/classification-of-conjoint-analysis/) — "CBC 是唯一理论上严谨的 choice 方法"。

---

### 1.2 每个 choice task 包含几个 alternatives？

**标准答案：3 个（不含 none）**，原因如下：

| Alternatives 数 | 统计效率 | 认知负荷 | 结论 |
|-----------------|----------|----------|------|
| 2（paired） | 低（MNL 模型假设每次选择与所有 alternatives 比较） | 最低 | 统计上不效率，预测效度较低 |
| **3** | **✅ 平衡点** | **中等** | **Sweet spot，工业标准** |
| 4-5 | 更高（D-efficiency 提升约 30%） | 增加 33-60% 答题时间 | 对复杂产品可考虑 |
| 7+ | 较高但边际递减 | 极高（fixations 翻倍） | 不推荐 |

**关键研究**（[Duke/Sawtooth 研究](https://people.duke.edu/~jch8/bio/Papers/HowManyOptions%20Sawtooth%202016.pdf)）：
- 2 alternatives（pairs）比 5 alternatives（quints）D-效率低 31%。
- 每增加一个 alternative，答题时间约增加 33%（2→4）到 60%（2→7）。
- 用户在更多 alternatives 的任务中会加速学习，认知负荷随练习降低约 43%。

**结论**：**3 个 alternatives per task** 是工业和学术的共识 sweet spot。

---

### 1.3 是否包含 "None" 选项？

**建议：demo 阶段可以不包含，正式研究酌情加入。**

| 情况 | 建议 |
|------|------|
| 用户必须选一套房（刚需场景） | 不加 none，强迫选择 |
| 用户可以"都不满意，继续看" | 加 none 或 dual-response none |
| demo 阶段，数据少 | 不加（减少参数，估计更稳定） |

**Dual-response None**（推荐的折中方案，来自 [Sawtooth 文档](https://sawtoothsoftware.com/help/lighthouse-studio/manual/cbc-none-option.html)）：
1. 先让用户从 3 个中选最喜欢的。
2. 再问："你真的会选这个吗？（是 / 否）"
- 优点：分离选择信息和购买意愿，参数不混淆。
- 缺点：每题需要两次回答，轻微增加负担。

---

### 1.4 每个用户应该回答多少题？

**最优区间：8-12 题**（[Sawtooth 研究，21 个商业项目](https://content.sawtoothsoftware.com/assets/a24654f4-0553-4484-9c90-46a5899e8d57)）

关键结论：
- 题目数从 5 增加到 10-12，精度提升显著。
- **10-12 题之后边际收益急剧递减**（即使使用"机器人"完美答题者也如此）。
- **题目数 vs 样本量**：题目数翻倍 ≈ 样本量翻倍带来的精度提升（二者等价）。
- 真实用户在 15 题后开始疲劳，答题质量下降（[Tang & Greenville 2010](https://www.cambridge.org/core/journals/political-analysis/article/number-of-choice-tasks-and-survey-satisficing-in-conjoint-experiments/5BBACB75CF59C10E1B42AB20D9F085F0)）。

**Demo 场景推荐：10 题**（平衡精度与完成率）。

精度随题目数变化（模拟数据，大致趋势）：

```
题目数   相对精度（标准误倒数）
4        55%
8        78%
10       85%   ← 推荐
12       90%
16       94%
20       96%   ← 边际收益 <6%，不值得
```

---

### 1.5 每个 concept 应包含多少 attribute？

**推荐：6-8 个 attributes**（[Sawtooth Lighthouse 文档](https://sawtoothsoftware.com/help/lighthouse-studio/manual/cbc-number-of-attributes-levels-tasks.html)）

- **≤ 8**：全轮廓（full-profile）下的认知上限。超过 8 个属性，用户倾向于忽略部分维度或使用简单启发式。
- 如超过 8 个，考虑 partial-profile 设计（每题只显示部分 attributes），或使用 ACBC。

---

### 1.6 Level 数平衡：避免 Number-of-Levels Effect

**关键规则：各 attribute 的 level 数尽量相等（或接近）。**

**Number-of-Levels Effect（NOL effect）**（[Sawtooth 研究](https://content.sawtoothsoftware.com/assets/a0c3d224-4c8d-49dc-9025-801488bf34ec)）：

- Level 数从 2 增加到 4，属性重要性会人为提高（即使真实重要性不变）。
- 从 4 增加到 11 或 21，效果已基本消失（CBC 中 NOL effect 比评分式 conjoint 弱很多）。

**实践建议**：

1. 同一研究中所有 attributes 使用相同 level 数（如统一用 3 levels）。
2. 如果某 attribute 必须用 2 levels（如"是/否"型），注意其重要性可能被低估。
3. 连续型变量（租金、面积）建议用 3-4 个离散 level，而非更多。

---

## 2. 实验设计矩阵

### 2.1 设计方案对比

| 设计类型 | 特征 | 优劣 | 适用场景 |
|----------|------|------|----------|
| **Full Factorial** | 所有 level 组合都出现 | 完整无偏，但组合爆炸（6属性×3levels=729组合） | 属性少（≤3）时 |
| **Fractional Factorial** | 选取全因子的子集，保证主效应可估计（正交） | 实用，损失高阶交互项 | 传统纸质问卷 |
| **随机设计** | 每个 task 中 attribute levels 独立随机选取 | 极简，大样本下渐进有效 | 政治学 conjoint（Hainmueller et al.）|
| **D-efficient 设计** | 最大化费舍尔信息矩阵的行列式 det(I(β)) | 最优统计效率，但需数值优化求解 | 商业研究，Ngene/Sawtooth |
| **Balanced Overlap** | 随机设计 + 保证每个 level 出现次数接近（balanced），允许同一 attribute 在两个 alternatives 中出现同一 level（overlap） | 对用户有简化认知效果 | CBC 工业标准 |

### 2.2 前端 Demo 推荐：随机设计 + 平衡性检查

在浏览器中，最实用的方案是**"均衡随机设计"**（Balanced Random Design）：

**核心思想**：
1. 每个 task 中，对每个 attribute 独立随机选取 level。
2. 在一个用户的 10 题中，保证每个 level 出现次数大致均匀（平衡性）。
3. 检查并排除 dominated alternatives（见 2.3）。

这与 [Leeper et al. (2020)](https://github.com/leeper/conjoint-example) 在 Qualtrics 中使用的完全随机化 conjoint 方法一致，被 APSR 等政治学顶刊广泛使用。

#### 2.2.1 JS 实现：均衡随机设计生成器

```ts
// types
type Level = string | number;
type Attribute = { name: string; levels: Level[] };
type Profile = Record<string, Level>; // { attr: level }
type Task = Profile[]; // array of alternatives

/**
 * 生成一个 CBC 任务序列（均衡随机设计）
 * @param attributes  属性定义数组
 * @param nTasks      任务数（题目数），推荐 10
 * @param nAlts       每题 alternatives 数，推荐 3
 * @returns           任务数组，每个任务含 nAlts 个 concept
 */
function generateCBCDesign(
  attributes: Attribute[],
  nTasks: number = 10,
  nAlts: number = 3,
  maxRetries: number = 20
): Task[] {
  const tasks: Task[] = [];
  // 统计每个 attribute 每个 level 的出现次数（跨所有 tasks × alts）
  const levelCounts: Record<string, Record<string, number>> = {};
  for (const attr of attributes) {
    levelCounts[attr.name] = {};
    for (const lv of attr.levels) levelCounts[attr.name][String(lv)] = 0;
  }

  for (let t = 0; t < nTasks; t++) {
    let task: Task | null = null;
    for (let retry = 0; retry < maxRetries; retry++) {
      const candidates: Profile[] = [];
      for (let a = 0; a < nAlts; a++) {
        const profile: Profile = {};
        for (const attr of attributes) {
          // 优先选出现次数最少的 level（贪心平衡）
          const sorted = [...attr.levels].sort(
            (x, y) =>
              levelCounts[attr.name][String(x)] -
              levelCounts[attr.name][String(y)]
          );
          // 从最少的 ceil(levels.length/2) 个中随机选
          const pool = sorted.slice(0, Math.ceil(attr.levels.length / 2));
          profile[attr.name] = pool[Math.floor(Math.random() * pool.length)];
        }
        candidates.push(profile);
      }
      // 检查是否有 dominated alternative
      if (!hasDominated(candidates, attributes)) {
        task = candidates;
        break;
      }
    }
    if (!task) {
      // 退化为纯随机，避免死循环
      task = Array.from({ length: nAlts }, () => randomProfile(attributes));
    }
    // 更新 levelCounts
    for (const profile of task) {
      for (const attr of attributes) {
        levelCounts[attr.name][String(profile[attr.name])]++;
      }
    }
    tasks.push(task);
  }
  return tasks;
}

function randomProfile(attributes: Attribute[]): Profile {
  const p: Profile = {};
  for (const attr of attributes) {
    p[attr.name] = attr.levels[Math.floor(Math.random() * attr.levels.length)];
  }
  return p;
}
```

### 2.3 避免 Dominated Alternatives

**Dominated alternative 定义**：一个选项在所有属性维度上都不优于另一个选项——这种 task 对用户没有信息量（答案显而易见），同时降低统计效率。

**问题**（[Sawtooth 博客](https://sawtoothsoftware.com/resources/blog/posts/level-up-your-next-conjoint-analysis-project)）：
- 创造"no-brainer"选择，用户无需权衡就能选出答案。
- 降低设计的统计效率，在小样本下问题放大。

**检测逻辑**（需要为每个 attribute 预先定义 level 的偏好方向）：

```ts
type AttrMeta = {
  name: string;
  levels: Level[];
  // 'higher' = 后面的 level 更优（如面积），'lower' = 前面的 level 更优（如租金），
  // 'nominal' = 无序（如朝向），无法判断主导性
  preference: 'higher' | 'lower' | 'nominal';
};

/**
 * 检测一组 alternatives 中是否存在 dominated alternative
 * 只对有序属性（preference != 'nominal'）进行比较
 */
function hasDominated(alternatives: Profile[], attrMetas: AttrMeta[]): boolean {
  const n = alternatives.length;
  const orderedAttrs = attrMetas.filter(a => a.preference !== 'nominal');

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      // 检查 i 是否在所有有序属性上都 ≤ j（即 i 被 j 主导）
      let dominated = true;
      for (const attr of orderedAttrs) {
        const levelsArr = attr.levels;
        const rankI = levelsArr.indexOf(alternatives[i][attr.name]);
        const rankJ = levelsArr.indexOf(alternatives[j][attr.name]);
        // 判断 i 在该属性上是否不劣于 j
        const iNotWorse =
          attr.preference === 'higher' ? rankI >= rankJ : rankI <= rankJ;
        if (!iNotWorse) { dominated = false; break; }
      }
      // 如果 i 在所有属性上都 ≤ j，且至少一个属性严格 < j，则 i 被 j 主导
      if (dominated) {
        let strictlyWorse = false;
        for (const attr of orderedAttrs) {
          const rankI = attr.levels.indexOf(alternatives[i][attr.name]);
          const rankJ = attr.levels.indexOf(alternatives[j][attr.name]);
          if (attr.preference === 'higher' ? rankI < rankJ : rankI > rankJ) {
            strictlyWorse = true; break;
          }
        }
        if (strictlyWorse) return true;
      }
    }
  }
  return false;
}
```

### 2.4 Prohibitions（不允许的组合）

某些属性的组合在现实中不存在或矛盾（例如：租金 ¥800 且面积 ≥ 100㎡）。

**处理方案**：

```ts
type Prohibition = (profile: Profile) => boolean; // 返回 true 表示该组合被禁止

const prohibitions: Prohibition[] = [
  // 禁止低租金 + 大面积
  (p) => Number(p['月租金']) < 2000 && Number(p['面积']) > 80,
  // 禁止高楼层 + 无电梯
  (p) => Number(p['楼层']) > 6 && p['电梯'] === '无',
];

function isValidProfile(profile: Profile, prohibitions: Prohibition[]): boolean {
  return !prohibitions.some(fn => fn(profile));
}

// 在生成 profile 时加入验证
function safeRandomProfile(
  attributes: Attribute[],
  prohibitions: Prohibition[],
  maxRetries = 50
): Profile | null {
  for (let i = 0; i < maxRetries; i++) {
    const p = randomProfile(attributes);
    if (isValidProfile(p, prohibitions)) return p;
  }
  return null; // 极少发生
}
```

**注意**：prohibitions 过多会导致生成效率低下，并可能破坏设计的正交性/平衡性。建议限制在 2-3 条最关键的现实约束。

---

## 3. 效用模型

### 3.1 基本线性可加效用假设

CBC 的核心假设是**线性可加效用（Linear Additive Utility）**：

$$U_{ni} = \sum_{k=1}^{K} \beta_{nk} \cdot x_{nik} + \varepsilon_{ni}$$

- $U_{ni}$：用户 $n$ 对 alternative $i$ 的效用
- $x_{nik}$：alternative $i$ 在第 $k$ 个 attribute level 上的编码值
- $\beta_{nk}$：用户 $n$ 对第 $k$ 个 level 的 part-worth（偏效用）
- $\varepsilon_{ni}$：随机误差项

**可加性假设**意味着属性之间没有交互效应（无"1+1>2"效果）。这是一个强假设，但在大多数实际场景下效果良好。

### 3.2 Part-worth Utility vs Linear Coding

| 编码方式 | 适用场景 | 参数数 | 灵活性 |
|----------|----------|--------|--------|
| **Part-worth（哑变量编码）** | 分类属性（电梯有/无）、有序但非线性属性 | L-1 个参数（L 为 level 数） | 高：每个 level 独立 |
| **Linear Coding（线性编码）** | 连续/有序数值型属性（租金、面积、通勤时间） | 1 个参数 | 低：假设效用与数值线性关系 |
| **Piecewise Linear** | 有拐点的连续变量 | 几个参数 | 中 |

**租房场景建议**：

| 属性 | 编码类型 | 原因 |
|------|----------|------|
| 月租金（元） | Linear（或 part-worth） | 价格效用通常近似线性，linear 节省参数；但若有非线性心理价位，用 part-worth |
| 通勤时间（分钟） | Linear | 时间效用通常线性 |
| 面积（㎡） | Part-worth 或 Linear | 面积边际效用递减，建议 part-worth |
| 电梯（有/无） | Part-worth | 二分类 |
| 独卫（有/无） | Part-worth | 二分类 |
| 装修（毛坯/普通/精装） | Part-worth | 有序但非线性 |
| 地铁距离（步行分钟） | Linear | 连续有序 |
| 楼龄（段） | Part-worth | 有序，可能有非线性心理效应 |

### 3.3 哑变量编码方案

对于 part-worth，有两种主要编码：

**Effect coding（效应编码，推荐）**：
- 每个 attribute 的基准 level 用 -1 代替 0
- 保证属性内所有 level 的 part-worth 之和为 0
- 便于直接比较 attribute 间的 importance

**Dummy coding（哑变量编码，更直觉）**：
- 基准 level 所有哑变量为 0
- 各 level 的 part-worth 解释为"相对于基准的效用差"

```ts
// 示例：装修（3 levels: 毛坯=0, 普通=1, 精装=2）
// Dummy coding（以毛坯为基准）：
// 毛坯 → [0, 0]
// 普通 → [1, 0]
// 精装 → [0, 1]

function dummyEncode(levelIndex: number, nLevels: number): number[] {
  const vec = new Array(nLevels - 1).fill(0);
  if (levelIndex > 0) vec[levelIndex - 1] = 1;
  return vec;
}

// 构建单个 profile 的特征向量 x
function profileToFeatureVector(
  profile: Profile,
  attrMetas: AttrMeta[]
): number[] {
  const x: number[] = [];
  for (const attr of attrMetas) {
    const levelIdx = attr.levels.indexOf(profile[attr.name]);
    if (attr.encoding === 'linear') {
      // 线性编码：直接使用数值（需标准化）
      x.push(Number(profile[attr.name]));
    } else {
      // Part-worth：哑变量编码
      x.push(...dummyEncode(levelIdx, attr.levels.length));
    }
  }
  return x;
}
```

### 3.4 随机效用理论（RUM）与 MNL

**随机效用模型（McFadden 1974）**：

$$U_{ni} = V_{ni} + \varepsilon_{ni}$$

- $V_{ni} = \mathbf{\beta}_n^\top \mathbf{x}_{ni}$：确定性（可观测）效用部分
- $\varepsilon_{ni} \sim \text{Gumbel}(0, 1)$：独立同分布的 Gumbel 随机误差

**MNL 选择概率**（closed form）：

$$P(i \mid \mathcal{C}) = \frac{\exp(V_{ni})}{\sum_{j \in \mathcal{C}} \exp(V_{nj})}$$

这是 softmax 函数的经典形式。

**IIA 假设（Independence of Irrelevant Alternatives）**：
- MNL 的一个重要限制：两个选项的选择概率之比不随第三个选项的加入而改变。
- 在租房场景下（alternatives 之间差异足够大时），IIA 基本成立。
- 如违反（如多个相似廉价房），可使用 Nested Logit 或 Mixed Logit（但 demo 阶段无需考虑）。

---

## 4. 参数估计

### 4.1 最大似然估计（MLE）

**目标**：最大化对数似然函数

$$\ell(\boldsymbol{\beta}) = \sum_{n=1}^{N} \sum_{t=1}^{T} \sum_{i=1}^{J} y_{nti} \cdot \log P_{nti}(\boldsymbol{\beta})$$

- $y_{nti} = 1$ 如果用户 $n$ 在第 $t$ 题选择了 alternative $i$，否则为 0
- $P_{nti}$：MNL 预测的选择概率

**问题（demo 场景）**：单个用户只有 10 题，个体级 MLE 极不稳定（参数数可能超过数据点数）。

### 4.2 Demo 场景的估计策略

#### 策略一：聚合 MLE（Aggregate MNL）

**所有用户数据合并估计一个共享 β**。

- 优点：数据量足够时稳定；实现简单。
- 缺点：忽略用户异质性，无法做个性化推荐。
- 适用：demo 初期，用户量 < 50。

#### 策略二：MAP 估计 + L2 正则（推荐 Demo 方案）

**目标函数**（负对数后验）：

$$\mathcal{L}_{\text{MAP}}(\boldsymbol{\beta}) = -\ell(\boldsymbol{\beta}) + \frac{\lambda}{2} \|\boldsymbol{\beta}\|^2$$

这等价于在 $\beta \sim \mathcal{N}(\mathbf{0}, \frac{1}{\lambda} I)$ 的先验下的 MAP 估计，本质是**带 L2 正则化的 logistic 回归**。

- $\lambda$（正则化强度）推荐取 0.5-2.0（根据数据量调整，数据越少 $\lambda$ 越大）。
- 优点：实现简单（标准 logistic 回归库），数值稳定，防过拟合。
- 缺点：仍假设用户偏好同质（共享 β），不做个体估计。

#### 策略三：Hierarchical Bayes（HB）— 生产级方案

$$\boldsymbol{\beta}_n \sim \mathcal{N}(\boldsymbol{\mu}, \boldsymbol{\Sigma})$$
$$\boldsymbol{\mu} \sim \mathcal{N}(\mathbf{0}, \sigma_\mu^2 I), \quad \boldsymbol{\Sigma} \sim \text{Inverse-Wishart}$$

- 每个用户有独立 $\boldsymbol{\beta}_n$，但受群体先验 $(\boldsymbol{\mu}, \boldsymbol{\Sigma})$ 约束（Bayesian shrinkage）。
- 用 MCMC（如 Stan）或变分推断（VI）估计。
- 优点：最佳的个体级估计，尤其数据稀疏时。
- 缺点：浏览器端难以实现（计算量大）；适合后端 Python/R 定期批量估计。

**推荐 Demo 架构**：
- 前端：显示题目，收集选择，本地实时用 MAP+L2 估计（快速展示）。
- 后端（异步）：积累足够用户后，用 HB 重新估计群体参数，更新展示。

### 4.3 浏览器端 MNL + L2 正则估计实现

#### 4.3.1 数据结构

```ts
// 一条选择记录
type ChoiceRecord = {
  task: number;           // 题目编号
  alternatives: number[][]; // 每个 alternative 的特征向量
  chosen: number;          // 用户选择的 alternative 索引 (0-based)
};
```

#### 4.3.2 核心：MNL 概率 + Log-sum-exp 防溢出

```ts
/**
 * 数值稳定的 softmax（log-sum-exp trick）
 * 防止 exp(大数) 溢出
 */
function stableSoftmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - maxLogit));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExp);
}

/**
 * 计算 MNL 选择概率
 * @param beta  参数向量
 * @param alts  alternatives 的特征向量矩阵 [nAlts x nFeatures]
 */
function mnlProbs(beta: number[], alts: number[][]): number[] {
  const logits = alts.map(x => dotProduct(beta, x));
  return stableSoftmax(logits);
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}
```

#### 4.3.3 目标函数：负对数后验（MAP + L2）

```ts
/**
 * 计算目标函数值（负 log-posterior = 负 log-likelihood + L2 正则）
 * 以及梯度
 */
function computeLossAndGrad(
  beta: number[],
  data: ChoiceRecord[],
  lambda: number = 1.0
): { loss: number; grad: number[] } {
  const K = beta.length;
  let loss = 0;
  const grad = new Array(K).fill(0);

  for (const record of data) {
    const probs = mnlProbs(beta, record.alternatives);
    const chosenProb = probs[record.chosen];
    // 负 log-likelihood
    loss -= Math.log(Math.max(chosenProb, 1e-15)); // clip 防 log(0)

    // 梯度：∂(-log P_chosen) / ∂β = Σ_i P_i * x_i - x_chosen
    for (let k = 0; k < K; k++) {
      const expectedXk = probs.reduce(
        (sum, p, i) => sum + p * record.alternatives[i][k],
        0
      );
      grad[k] -= record.alternatives[record.chosen][k] - expectedXk;
      // 等价于：grad[k] += expectedXk - x_chosen[k]
    }
  }

  // L2 正则项
  for (let k = 0; k < K; k++) {
    loss += (lambda / 2) * beta[k] * beta[k];
    grad[k] += lambda * beta[k];
  }

  return { loss, grad };
}
```

#### 4.3.4 优化器：Adam（推荐浏览器端）

Adam 比朴素梯度下降收敛更快，且对学习率不敏感。

```ts
/**
 * Adam 优化器估计 MNL + L2 参数
 * 适合浏览器端：100-200 次迭代通常已收敛（数据少时）
 */
function estimateBetaAdam(
  data: ChoiceRecord[],
  nFeatures: number,
  lambda: number = 1.0,
  maxIter: number = 300,
  lr: number = 0.05,
  tol: number = 1e-6
): number[] {
  let beta = new Array(nFeatures).fill(0.0);
  const m = new Array(nFeatures).fill(0); // 一阶矩
  const v = new Array(nFeatures).fill(0); // 二阶矩
  const eps = 1e-8;
  const b1 = 0.9, b2 = 0.999;

  let prevLoss = Infinity;
  for (let iter = 1; iter <= maxIter; iter++) {
    const { loss, grad } = computeLossAndGrad(beta, data, lambda);

    // Adam 更新
    for (let k = 0; k < nFeatures; k++) {
      m[k] = b1 * m[k] + (1 - b1) * grad[k];
      v[k] = b2 * v[k] + (1 - b2) * grad[k] * grad[k];
      const mHat = m[k] / (1 - Math.pow(b1, iter));
      const vHat = v[k] / (1 - Math.pow(b2, iter));
      beta[k] -= lr * mHat / (Math.sqrt(vHat) + eps);
    }

    // 收敛检查
    if (Math.abs(prevLoss - loss) < tol) break;
    prevLoss = loss;
  }
  return beta;
}
```

**备选：Newton-Raphson（IRLS）**——收敛更快（2-10 步），但需要计算 Hessian 矩阵（O(K²) 内存），K 较大时（> 20 个参数）可能慢：

```ts
/**
 * Newton-Raphson 步骤（单步，适合 K < 20 的情况）
 * β_{t+1} = β_t - H^{-1} * g
 * 其中 H 是 Hessian，g 是梯度
 */
function newtonStep(
  beta: number[],
  data: ChoiceRecord[],
  lambda: number
): number[] {
  const K = beta.length;
  const { grad } = computeLossAndGrad(beta, data, lambda);

  // 计算 Hessian: H[k][l] = Σ_task Σ_i p_i * x_ik * x_il - Σ_i Σ_j p_i*p_j*x_ik*x_jl
  //                          + λ*I（L2 正则）
  const H: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
  for (const record of data) {
    const probs = mnlProbs(beta, record.alternatives);
    // 加权二阶矩
    for (let k = 0; k < K; k++) {
      for (let l = 0; l < K; l++) {
        let hkl = 0;
        for (let i = 0; i < record.alternatives.length; i++) {
          hkl += probs[i] * record.alternatives[i][k] * record.alternatives[i][l];
        }
        // 减去均值的外积
        let ek = 0, el = 0;
        for (let i = 0; i < record.alternatives.length; i++) {
          ek += probs[i] * record.alternatives[i][k];
          el += probs[i] * record.alternatives[i][l];
        }
        H[k][l] += hkl - ek * el;
      }
    }
  }
  // 加 L2 正则到对角
  for (let k = 0; k < K; k++) H[k][k] += lambda;

  // 求解线性方程组 H * delta = grad（用 LU 分解或简单逆矩阵）
  // 浏览器端可用 numeric.js 或 math.js 的 solve 方法
  // const delta = matrixSolve(H, grad);
  // return beta.map((b, k) => b - delta[k]);

  // 简化：使用对角近似（适合参数不强相关的情况）
  return beta.map((b, k) => b - grad[k] / (H[k][k] + 1e-8));
}
```

#### 4.3.5 数值稳定性要点

1. **Log-sum-exp trick**：计算 softmax 前先减去 max，防止 `exp(大数)` 溢出。
2. **Log clip**：`Math.log(Math.max(prob, 1e-15))` 防止 `log(0) = -Infinity`。
3. **初始化**：将 $\beta$ 初始化为 0，或小随机数（如 ±0.01）。
4. **L2 正则**：对角 Hessian 元素 `H[k][k] += λ`，保证正定，防止奇异。
5. **迭代数**：Adam 300 步通常足够；Newton 10-20 步即可（10 题数据量极小）。

---

## 5. 结果解释

### 5.1 Part-worth Utility

估计完成后，$\hat{\beta}$ 的各分量就是 **part-worth utilities**：

- 对 dummy-coded 属性：$\hat{\beta}_k$ 表示 level $k$ 相对基准 level 的效用差。
- 对 linear-coded 属性：$\hat{\beta}$ 表示数值增加一个单位带来的效用变化。

**解释原则**：
- Part-worth 是任意尺度（scale-free），只有相对大小有意义。
- 同一属性内的 part-worth 之差反映用户对该属性的偏好强度。
- 跨属性比较需要通过 importance score 标准化。

```ts
// 计算各 attribute 的 part-worth 范围和基准 part-worth
function computePartWorths(
  beta: number[],
  attrMetas: AttrMetaWithEncoding[]
): Record<string, { level: string; utility: number }[]> {
  const result: Record<string, { level: string; utility: number }[]> = {};
  let betaIdx = 0;

  for (const attr of attrMetas) {
    if (attr.encoding === 'linear') {
      result[attr.name] = [{ level: 'slope', utility: beta[betaIdx++] }];
    } else {
      const nLevels = attr.levels.length;
      const utils: { level: string; utility: number }[] = [];
      utils.push({ level: String(attr.levels[0]), utility: 0 }); // 基准 level
      for (let l = 1; l < nLevels; l++) {
        utils.push({ level: String(attr.levels[l]), utility: beta[betaIdx++] });
      }
      result[attr.name] = utils;
    }
  }
  return result;
}
```

### 5.2 Attribute Importance Score

**定义**：每个属性的 part-worth 极差 / 所有属性极差之和

$$\text{Importance}_k = \frac{\max_l \hat{\beta}_{kl} - \min_l \hat{\beta}_{kl}}{\sum_{k'} (\max_l \hat{\beta}_{k'l} - \min_l \hat{\beta}_{k'l})} \times 100\%$$

```ts
function computeImportances(
  partWorths: Record<string, { level: string; utility: number }[]>
): Record<string, number> {
  const ranges: Record<string, number> = {};
  for (const [attr, levels] of Object.entries(partWorths)) {
    if (levels.length === 1) {
      // linear-coded: range = slope * (max_value - min_value)
      ranges[attr] = Math.abs(levels[0].utility); // 需要乘以数值范围
    } else {
      const utils = levels.map(l => l.utility);
      ranges[attr] = Math.max(...utils) - Math.min(...utils);
    }
  }
  const totalRange = Object.values(ranges).reduce((a, b) => a + b, 0);
  const importances: Record<string, number> = {};
  for (const [attr, range] of Object.entries(ranges)) {
    importances[attr] = totalRange > 0 ? (range / totalRange) * 100 : 0;
  }
  return importances;
}
```

**注意事项**：
- Importance score 受 level 数影响（NOL effect）——level 数多的属性可能人为重要性偏高。
- 受属性的 level 范围影响：租金从 ¥2000-8000 比 ¥2000-3000 范围大，importance 自然更高。
- 只在相同设计条件下的属性间比较才有意义。

### 5.3 WTP（支付意愿）

**公式**：

$$\text{WTP}_{kl} = -\frac{\hat{\beta}_{kl}}{\hat{\beta}_{\text{price}}}$$

- $\hat{\beta}_{kl}$：attribute $k$ 的 level $l$ 的 part-worth
- $\hat{\beta}_{\text{price}}$：租金（price）的参数（linear coding 下为斜率）

**解释**：用户愿意每月多付多少钱（元）来换取属性 $k$ 从基准 level 变为 level $l$。

```ts
function computeWTP(
  partWorths: Record<string, { level: string; utility: number }[]>,
  priceSlope: number, // β_price (应为负数)
  referenceAttr: string = '月租金'
): Record<string, { level: string; wtp: number }[]> {
  if (priceSlope >= 0) {
    console.warn('β_price 应为负数，WTP 估计无意义');
    return {};
  }

  const wtp: Record<string, { level: string; wtp: number }[]> = {};
  for (const [attr, levels] of Object.entries(partWorths)) {
    if (attr === referenceAttr) continue;
    wtp[attr] = levels.map(({ level, utility }) => ({
      level,
      wtp: -utility / priceSlope, // 单位：元/月
    }));
  }
  return wtp;
}
```

**例子（解释给非技术用户）**：

> "根据你的 10 次选择，我们估算你的偏好：
> - 你愿意每月多付约 **¥650** 来住**有电梯的房子**（vs 无电梯）。
> - 你愿意多付约 **¥320** 来享有**独立卫浴**（vs 合用卫浴）。
> - 通勤每缩短 10 分钟，你愿意多付约 **¥180/月**。"

**注意事项（[Sawtooth WTP 指南](https://sawtoothsoftware.com/resources/blog/posts/better-willingness-to-pay-in-conjoint-analysis)）**：
- $\hat{\beta}_{\text{price}}$ 必须为**负且统计显著**，否则 WTP 无意义（经济上不合理）。
- 代数法 WTP 通常高估真实支付意愿约 20%（相比基于市场份额的方法）。
- WTP 不应跨属性加总（"电梯+独卫" WTP ≠ 两者之和）。
- Demo 阶段数据少时，WTP 置信区间很宽，应谨慎解读。

---

## 6. 租房场景属性设计

### 6.1 维度全集（建议从中选 6-8 个）

| 属性 | 类型 | 推荐 Level 数 | Level 示例 | 编码 |
|------|------|--------------|------------|------|
| **月租金（元）** | 连续 | 3-4 | 3500/4500/5500/6500 | Linear |
| **通勤时间（分钟）** | 连续 | 3 | 15/30/45 | Linear |
| **面积（㎡）** | 连续 | 3 | 40/60/80 | Part-worth 或 Linear |
| **电梯** | 二分 | 2 | 有/无 | Part-worth |
| **独卫** | 二分 | 2 | 独卫/合用 | Part-worth |
| **采光** | 有序 | 3 | 暗/中/明 | Part-worth |
| **楼龄** | 有序 | 3 | 0-5年/6-15年/15年+ | Part-worth |
| **装修** | 有序 | 3 | 毛坯/普装/精装 | Part-worth |
| **合租/独租** | 二分 | 2 | 整租/合租 | Part-worth |
| **地铁步行（分钟）** | 连续 | 3 | 5/15/30 | Linear |
| **宠物友好** | 二分 | 2 | 允许/不允许 | Part-worth |
| **押金（月）** | 有序 | 3 | 押1/押2/押3 | Part-worth 或 Linear |

### 6.2 推荐的 Demo 属性设计（8 个属性 × 3 levels）

```ts
const ZUFANG_ATTRIBUTES: AttrMeta[] = [
  {
    name: '月租金',
    levels: [3000, 4500, 6000],
    preference: 'lower',    // 越低越好
    encoding: 'linear',
  },
  {
    name: '通勤时间',
    levels: [15, 30, 45],   // 分钟
    preference: 'lower',
    encoding: 'linear',
  },
  {
    name: '面积',
    levels: [35, 55, 75],   // 平米
    preference: 'higher',
    encoding: 'part-worth',
  },
  {
    name: '电梯',
    levels: ['无', '有'],
    preference: 'higher',
    encoding: 'part-worth',
  },
  {
    name: '独卫',
    levels: ['合用', '独立'],
    preference: 'higher',
    encoding: 'part-worth',
  },
  {
    name: '装修',
    levels: ['普通', '精装', '豪装'],
    preference: 'higher',
    encoding: 'part-worth',
  },
  {
    name: '地铁步行',
    levels: [5, 15, 30],    // 分钟
    preference: 'lower',
    encoding: 'linear',
  },
  {
    name: '租住方式',
    levels: ['合租', '整租'],
    preference: 'nominal',  // 取决于个人
    encoding: 'part-worth',
  },
];
```

**参数数量计算**：
- Linear-coded（月租金、通勤、地铁步行）：3 × 1 = 3 参数
- Part-worth（面积 3L、电梯 2L、独卫 2L、装修 3L、租住 2L）：2 + 1 + 1 + 2 + 1 = 7 参数
- **总计：10 个参数**
- 每用户 10 题 × 3 alternatives = 30 个数据点（参数/数据点比为 1:3，勉强可估计，需 L2 正则）

### 6.3 Level 数量原则

1. **对称**：8 个属性尽量都用 3 levels（避免 NOL effect）。
2. **现实范围**：level 范围要覆盖用户实际可能考虑的范围，不要太窄（影响效应大小）也不要太宽（脱离现实）。
3. **间距合理**：连续变量的 levels 最好等间距，有助于线性假设成立。
4. **电梯/独卫等二分属性**：只有 2 levels，这是设计约束，可接受（但重要性估计可能偏低）。

---

## 7. 个性化出题的严谨性

### 7.1 Self-explicated + CBC 混合的理论背景

让用户先勾选关心的维度，是 **Self-Explicated Approach** 与 CBC 的混合，类似于 Huber & McCann (1994) 的 **ACA（Adaptive Conjoint Analysis）** 思路。

| 方法 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| 纯 CBC | 所有属性全部纳入 | 统计上最严谨，无选择偏差 | 认知负荷高，题目多 |
| Self-explicated | 先问重要性，再问偏好 | 快速，直觉 | 假设可加性，反事实偏差 |
| **ACA 混合** | 先收集 desiderata，再做 CBC | 减少认知负荷，提升信噪比 | 早期问题可能影响后期偏好 |
| **ACBC** | BYO → Screening → Choice | 最接近自然决策流程 | 实现复杂，问卷长 |

### 7.2 用户先勾选维度的风险

**自我认知偏差（Introspection failure）**：用户可能：
- **低报** 真正驱动决策的维度（如价格，因为"自己不该那么看重钱"的社会期望偏差）
- **高报** 不影响实际决策的"好听"维度（如楼层朝向）

**ACBC 的缓解方案**（[Sawtooth ACBC 文档](https://sawtoothsoftware.com/conjoint-analysis/acbc)）：
1. BYO（Build Your Own）阶段：先让用户勾选理想配置（行为，非态度）
2. Screening 阶段：呈现接近理想配置的 profile，用户标记"不可接受"的条目
3. 这样的行为数据比直接问"重要性"更可靠

### 7.3 Demo 推荐折中方案

**方案：用户勾选 Top 5-7 维度，剩余维度用群体均值填充**

```ts
// 用户偏好阶段：让用户从 12 个维度中选最关心的 5-7 个
function buildPersonalizedDesign(
  allAttributes: AttrMeta[],
  selectedAttrNames: string[],
  populationBeta: Record<string, number[]>, // 群体先验 β（历史用户估计）
  nTasks: number = 10,
  nAlts: number = 3
): { tasks: Task[]; effectiveAttributes: AttrMeta[] } {
  // 仅对选中的属性做 CBC
  const effectiveAttributes = allAttributes.filter(a =>
    selectedAttrNames.includes(a.name)
  );

  // 补充：未选属性使用群体均值 level（固定在 profile 中）
  const fixedAttributes = allAttributes.filter(
    a => !selectedAttrNames.includes(a.name)
  );
  const fixedLevels: Profile = {};
  for (const attr of fixedAttributes) {
    // 用群体 β 选最高效用的 level，或中间 level（保守做法）
    fixedLevels[attr.name] = attr.levels[Math.floor(attr.levels.length / 2)];
  }

  // 生成仅变化 effectiveAttributes 的设计
  const tasks = generateCBCDesign(effectiveAttributes, nTasks, nAlts);

  // 将 fixedLevels 合并到每个 profile
  const tasksWithFixed = tasks.map(task =>
    task.map(profile => ({ ...fixedLevels, ...profile }))
  );

  return { tasks: tasksWithFixed, effectiveAttributes };
}
```

**验证手段**：
- 设置 2-3 道 holdout task（用户不知道，属于验证集），检验估计的预测精度。
- 若预测正确率 > 60%（随机基准：33%），认为模型有效。

### 7.4 BYO（Build Your Own）阶段

比单纯勾选维度更严谨的方式：让用户先配置一套理想房源，再基于此生成 CBC 题目。

```ts
// BYO 配置：用户对每个维度选择偏好 level
type BYOConfig = Record<string, Level>;

// 基于 BYO 生成"接近理想配置"的 alternatives
function generateBYOTask(
  byo: BYOConfig,
  attributes: AttrMeta[],
  nAlts: number = 3
): Task {
  // Alternative 0：接近理想（少量扰动）
  // Alternative 1-2：较差选项（在某些维度降级）
  const ideal = { ...byo };
  const alternatives: Profile[] = [ideal];

  for (let i = 1; i < nAlts; i++) {
    const alt = { ...byo };
    // 随机选 2-3 个维度降级
    const toDegrade = attributes
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    for (const attr of toDegrade) {
      const currentIdx = attr.levels.indexOf(alt[attr.name]);
      // 降级：对 "higher is better" 属性选更低 level
      if (attr.preference === 'higher' && currentIdx > 0) {
        alt[attr.name] = attr.levels[currentIdx - 1];
      } else if (attr.preference === 'lower' &&
                 currentIdx < attr.levels.length - 1) {
        alt[attr.name] = attr.levels[currentIdx + 1];
      }
    }
    alternatives.push(alt);
  }
  return alternatives;
}
```

---

## 8. 学术参考

| 著作 | 内容 | 用途 |
|------|------|------|
| **Louviere, Hensher, Swait (2000)** — *Stated Choice Methods* | 离散选择实验的系统理论，包括实验设计和估计 | CBC 方法论基础 |
| **Train (2009)** — *Discrete Choice Methods with Simulation* | MNL、Mixed Logit、HB 的数学推导和代码 | 模型估计 |
| **McFadden (1974)** — "Conditional Logit Analysis of Qualitative Choice Behavior" | MNL 的创始论文，RUM 理论基础 | 理论背书 |
| **Sawtooth Software 白皮书** — *CBC Technical Paper* | CBC 工程实现细节（Balanced Overlap, HB 估计）| 工程实现 |
| **Orme (2014)** — *Getting Started with Conjoint Analysis* | CBC 实践指南，属性设计到结果解释 | 实践参考 |
| **Hainmueller, Hopkins, Yamamoto (2014)** — *Causal Inference in Conjoint Analysis* | 完全随机化设计的统计有效性 | 为随机设计背书 |
| **Chrzan & Orme (2019)** — *Applied MaxDiff and Conjoint Analysis* | 包含 HB 估计的实践 | 估计进阶 |

---

## 9. 最终设计规格（实现速查表）

### 核心参数

```
┌─────────────────────────────────────────────────────────┐
│              CBC Demo 设计规格（租房场景）                │
├──────────────────────┬──────────────────────────────────┤
│ 属性数 (Attributes)  │ 7 个（用户从 12 个中选 5-7 个）  │
│ 每属性 Level 数      │ 3 levels（统一，避免 NOL effect） │
│ 每题 Alternatives 数 │ 3 alternatives                    │
│ 题目数 (Tasks)       │ 10 题（8 正式 + 2 holdout 验证）  │
│ None 选项            │ 不包含（刚需场景，强迫选择）      │
│ 参数总数             │ ~14 个（linear×3 + part-worth×11）│
│ 每用户数据点         │ 30 选择 × log(P) → ~10题          │
└──────────────────────┴──────────────────────────────────┘
```

### 实验设计

```
设计方法：    均衡随机设计（Balanced Random Design）
平衡策略：    贪心算法，优先选择出现次数最少的 level
Dominated 检测：对有序属性检测并排除 dominated alternatives
Prohibitions：2-3 条现实约束（低租金+大面积禁止等）
```

### 估计算法

```
算法：        MAP 估计 + L2 正则化（Ridge-penalized MNL）
优化器：      Adam（lr=0.05, 迭代 300 步）
正则化强度：  λ = 1.0（数据少时可增至 2.0）
数值稳定：    log-sum-exp trick（stableSoftmax）
收敛判据：    |loss_t - loss_{t-1}| < 1e-6
```

### 属性具体规格（8 个属性版本）

| # | 属性 | Levels | 编码 |
|---|------|--------|------|
| 1 | 月租金（元） | 3000 / 4500 / 6000 | Linear |
| 2 | 通勤时间（分钟） | 15 / 30 / 45 | Linear |
| 3 | 面积（㎡） | 35 / 55 / 75 | Part-worth |
| 4 | 电梯 | 无 / 有 | Part-worth |
| 5 | 独立卫浴 | 合用 / 独立 | Part-worth |
| 6 | 装修 | 普通 / 精装 / 豪装 | Part-worth |
| 7 | 地铁步行（分钟） | 5 / 15 / 30 | Linear |
| 8 | 整租/合租 | 合租 / 整租 | Part-worth |

**参数总数**：4（linear）+ 10（part-worth，各减 1 基准）= **14 个参数**

### 输出到用户

1. **偏好重要性条形图**：各属性的 importance score %
2. **WTP 估计**（如 β_price 显著为负）："你愿意为电梯每月多付 X 元"
3. **个性化排房推荐**：基于估计 β 对房源列表打分 → `V = β⊤x`，降序排列
4. **Holdout 准确率**：模型预测精度（vs 33% 随机基准）

---

*文档最后更新：2025 年*
*参考来源：Sawtooth Software 白皮书、McFadden (1974)、Train (2009)、Hainmueller et al. (2014)*
