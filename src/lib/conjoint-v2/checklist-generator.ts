/**
 * 看房避坑清单生成器 — 让 Conjoint 结果有 actionable 下游
 *
 * 来源：产品反思 §4.C「强烈建议新增看房避坑清单生成器」
 * 设计：基于用户的 importance score + hardConstraints，
 * 从基础清单 + 维度专属清单中筛选并排序，生成 8-15 条个性化检查项。
 *
 * 内容来源：北京年轻人租房真实痛点调研（牛客/掘金/小宇宙/界面新闻 2020-2025）
 */

import type { Importance } from "./core";
import type { HardConstraints } from "@/store/conjointV2";

export type ChecklistCategory = "证件" | "现场" | "合同" | "隐形成本";

export interface ChecklistItem {
  id: string;
  /** 触发条件：维度 id + 重要性阈值（importance ≥ 此值才出现）。无条件 = 基础项 */
  trigger?: { attrId?: string; minImportance?: number };
  /** Hard constraint 触发（只要用户勾了对应 hard constraint 就出现） */
  triggerHC?: keyof HardConstraints;
  category: ChecklistCategory;
  icon: string;
  title: string;
  /** 详细的「怎么做/为什么问」 */
  detail: string;
  /** 优先级（基础分），最终顺序 = 基础分 × importance 加权 */
  priority: number;
}

/** 基础清单（不依赖偏好，所有人都该问） */
const BASE_CHECKLIST: ChecklistItem[] = [
  {
    id: "base-cert",
    category: "证件",
    icon: "📋",
    title: "核对房产证 + 房东身份证",
    detail:
      "签约前必须核对房产证姓名与房东身份证是否一致。中介经常用「业主授权代理」绕过这一步，实则可能是二房东转租，遭遇产权纠纷直接被赶。",
    priority: 100,
  },
  {
    id: "base-utility-type",
    category: "隐形成本",
    icon: "💧",
    title: "问清水电是民用价还是商用价",
    detail:
      "商水商电是 SOHO/LOFT/服务式公寓的隐藏坑。月费用比民用高 300-800 元，一年多花 4000+。问中介「水电费单价多少」当场对比北京居民电价（0.4883 元/度）即可识别。",
    priority: 95,
  },
  {
    id: "base-heating",
    category: "隐形成本",
    icon: "🔥",
    title: "问清供暖方式（集中/自采暖/无）",
    detail:
      "北京冬天关键。集中供暖：5.5 元/㎡，省心；自采暖（电/壁挂炉）：单月 500-1500 元；某些公寓干脆无供暖，过冬难以想象。",
    priority: 90,
  },
  {
    id: "base-formaldehyde",
    category: "现场",
    icon: "🌫️",
    title: "测甲醛 + 看装修日期",
    detail:
      "新装修房（半年内）几乎都有甲醛问题。带便携甲醛检测仪去看房，或在合同里加「甲醛超标无责退租」条款。中介通常不让测——这就是信号。",
    priority: 88,
  },
  {
    id: "base-contract-deposit",
    category: "合同",
    icon: "📝",
    title: "押金退还条款写死违约金上限",
    detail:
      "「家具损坏按市价赔」是模糊条款，退房时房东可以随便扣。要求列明「正常使用磨损不扣押金」+「设施折旧表」，并在入住时拍视频留存。",
    priority: 85,
  },
  {
    id: "base-tap-water",
    category: "现场",
    icon: "🚿",
    title: "打开水龙头听管道声音",
    detail:
      "管道反潮、共振、敲击声 = 楼上下水管或公共立管有问题，住进去每天被噪音骚扰。打开热水/冷水各 30 秒，闭眼听是否有「咣咣」「嗡嗡」异响。",
    priority: 80,
  },
];

/** 维度专属清单 — 按 attrId 索引，importance 越高越前置 */
const DIMENSION_CHECKLIST: Record<string, ChecklistItem[]> = {
  price: [
    {
      id: "p-utility-cost",
      trigger: { attrId: "price", minImportance: 0.1 },
      category: "隐形成本",
      icon: "💰",
      title: "问近三个月真实水电燃气账单",
      detail:
        "标价租金只是冰山一角。要求中介或房东出示前任租客近三个月的水电费账单——一个 8000 的房子如果每月水电 1500，实际月成本是 9500。",
      priority: 75,
    },
    {
      id: "p-hidden-fee",
      trigger: { attrId: "price", minImportance: 0.15 },
      category: "合同",
      icon: "💸",
      title: "确认所有附加费（服务费/网络/物业）",
      detail:
        "自如/相寓的「服务费」可以达到月租 10%；公寓的「网络费」「卫生费」常年不写在大字上。逐项问：「除了租金还有什么费用？」要求写进合同。",
      priority: 70,
    },
  ],
  commute: [
    {
      id: "c-door-to-door",
      trigger: { attrId: "commute", minImportance: 0.1 },
      category: "现场",
      icon: "🚶",
      title: "实地走一遍门到门通勤",
      detail:
        "地图显示「50分钟」是理论值。真实门到门 = 出门到地铁站（5-15min）+ 等车（高峰期 3-4 趟，10-20min）+ 换乘步行 + 公司步行。早高峰 8-9 点实测一次，再决定。",
      priority: 75,
    },
    {
      id: "c-peak-crowd",
      trigger: { attrId: "commute", minImportance: 0.2 },
      category: "现场",
      icon: "🚇",
      title: "确认地铁线高峰拥挤等级",
      detail:
        "6/4/10/13 号线早高峰 = 排队进站 + 等 3 趟车。同样 50 分钟通勤，5 号线和 13 号线体验完全不同。在小红书搜「某号线 早高峰」看真实视频。",
      priority: 65,
    },
  ],
  subwayWalk: [
    {
      id: "sw-night",
      trigger: { attrId: "subwayWalk", minImportance: 0.05 },
      category: "现场",
      icon: "🌙",
      title: "夜间走一次地铁到家路线",
      detail:
        "白天看着 8 分钟的步行路，晚上 10 点可能要经过没路灯的小巷、聚众饮酒点。女生独居尤其重要——晚 8 点后实地走一遍，注意路灯密度和监控。",
      priority: 60,
    },
  ],
  lighting: [
    {
      id: "l-afternoon-visit",
      trigger: { attrId: "lighting", minImportance: 0.05 },
      category: "现场",
      icon: "☀️",
      title: "晴天下午 2-4 点去看房",
      detail:
        "中介喜欢在上午带看，光线最好。但你住进去是要看下午西晒/被楼挡的真实情况。要求晴天 2-4 点单独二次复看，看采光持续时间。",
      priority: 70,
    },
    {
      id: "l-1f-2f",
      trigger: { attrId: "lighting", minImportance: 0.1 },
      category: "现场",
      icon: "🪴",
      title: "拒绝 1-2 楼（蟑螂 + 阴暗）",
      detail:
        "北京老小区 1-2 楼 90% 有蟑螂，且采光普遍差。除非是带花园的低密住宅，否则同等价位优先 5 楼以上。",
      priority: 55,
    },
  ],
  decoration: [
    {
      id: "d-mold",
      trigger: { attrId: "decoration", minImportance: 0.05 },
      category: "现场",
      icon: "💧",
      title: "关灯 + 闪光灯查霉斑",
      detail:
        "卫生间和厨房墙角是霉斑/反潮重灾区。关灯后打开手机闪光灯扫一遍墙角、踢脚线、窗台，黑点 = 霉，黄渍 = 反潮。住进去三个月内会变本加厉。",
      priority: 65,
    },
  ],
  privateBath: [
    {
      id: "pb-flush",
      trigger: { attrId: "privateBath", minImportance: 0.1 },
      category: "现场",
      icon: "🚽",
      title: "试冲水 + 看下水速度",
      detail:
        "马桶冲水声音大 = 隔音差，半夜上厕所会吵醒室友；下水慢 = 管道老化，住进去经常堵。看房现场冲 3 次水，看回水是否变干净。",
      priority: 60,
    },
  ],
  elevator: [
    {
      id: "e-peak-wait",
      trigger: { attrId: "elevator", minImportance: 0.05 },
      category: "现场",
      icon: "🛗",
      title: "高峰期实测电梯等待时间",
      detail:
        "20 层 + 1 部电梯 = 早 8 点要等 5-10 分钟。早高峰实测一次。电梯老旧（90 年代以前）的还要看保养记录。",
      priority: 55,
    },
  ],
  rentType: [
    {
      id: "rt-roommate-check",
      trigger: { attrId: "rentType", minImportance: 0.05 },
      category: "现场",
      icon: "👥",
      title: "见一面现住室友",
      detail:
        "合租前必须见一次现住室友，问：作息时间、是否抽烟、是否养宠物、是否经常带朋友回来。室友质量是合租满意度的 #1 决定因素。",
      priority: 70,
    },
    {
      id: "rt-partition",
      trigger: { attrId: "rentType", minImportance: 0.05 },
      category: "合同",
      icon: "🚫",
      title: "确认是否「打隔断」/「N+1」",
      detail:
        "客厅打隔断、阳台改卧室在北京已被多次治理，但仍隐性存在。问：「原始户型图是几居室？现在几个卧室？」如果数字不一致，签约前确认合规性。",
      priority: 60,
    },
  ],
  buildingAge: [
    {
      id: "ba-pipes",
      trigger: { attrId: "buildingAge", minImportance: 0.05 },
      category: "现场",
      icon: "🏚️",
      title: "老房子重点查管道 + 电路",
      detail:
        "2000 年前老板楼经常铸铁管 + 铝芯线。问：「最近一次水电改造是什么时候？」如果近 5 年没改过，住进去管道漏水/跳闸概率很高。",
      priority: 55,
    },
  ],
  area: [
    {
      id: "a-measure",
      trigger: { attrId: "area", minImportance: 0.05 },
      category: "现场",
      icon: "📐",
      title: "带卷尺实测主卧面积",
      detail:
        "中介报「卧室 12 ㎡」常含飘窗 + 衣柜。带卷尺量真实可用面积，特别是床位摆放区域。",
      priority: 50,
    },
  ],
  petFriendly: [
    {
      id: "pf-written",
      trigger: { attrId: "petFriendly", minImportance: 0.05 },
      category: "合同",
      icon: "🐱",
      title: "养宠条款必须写进合同",
      detail:
        "口头答应「可以养猫」在退租时房东可以否认，扣押金理由很多（地板抓痕、毛发）。要求写明：「房东确认可饲养 N 只 XX 类型宠物」+ 押金不扣抓痕折旧。",
      priority: 55,
    },
  ],
  balcony: [
    {
      id: "b-drying",
      trigger: { attrId: "balcony", minImportance: 0.05 },
      category: "现场",
      icon: "🌿",
      title: "确认晾衣 + 朝向",
      detail:
        "封闭阳台不能晾衣；西向阳台夏天暴晒。问朝向，看是否有现成晾衣架，下雨时是否会渗水。",
      priority: 45,
    },
  ],
};

/** Hard Constraint 触发的清单项（用户明确拒绝某条件时给出额外提醒） */
const HC_CHECKLIST: Partial<Record<keyof HardConstraints, ChecklistItem>> = {
  rejectPartition: {
    id: "hc-partition",
    category: "现场",
    icon: "🚪",
    title: "现场验证不是隔断/N+1",
    detail:
      "你已设定「拒绝隔断」。看房时核对：每个卧室是否有独立窗户？墙体是否承重（敲击声沉闷=承重墙，空鼓=隔板）？要求中介出示物业备案的户型图。",
    priority: 78,
  },
  rejectRelocation: {
    id: "hc-relocation",
    category: "证件",
    icon: "🏘️",
    title: "查楼栋是否含回迁安置",
    detail:
      "你已设定「拒绝回迁房」。打开本小区在小红书/贝壳上的讨论，搜「回迁」「拆迁」「安置」关键词。也可直接问中介：「这栋楼是商品楼栋还是回迁楼栋？」",
    priority: 76,
  },
  requirePrivateBath: {
    id: "hc-pbath",
    category: "现场",
    icon: "🛁",
    title: "确认主卧带卫不是「公卫紧邻」",
    detail:
      "你已设定「必须独卫」。注意中介常把「主卧门旁有公卫」描述为「主卧带卫」。要求看主卧内是否有独立卫生间门，而非走出主卧门去用。",
    priority: 72,
  },
};

interface GenerateOptions {
  importance: Importance[];
  hardConstraints: HardConstraints;
  /** 最少展示数（默认 8） */
  minItems?: number;
  /** 最多展示数（默认 12） */
  maxItems?: number;
}

/**
 * 生成个性化看房避坑清单
 * 算法：
 *  1. 全部基础项必入
 *  2. 用户勾选的 hard constraint 触发对应专项
 *  3. 维度专项：按 importance × priority 排序，挑前 N 个
 *  4. 总数控制在 [minItems, maxItems]
 */
export function generateChecklist(opts: GenerateOptions): ChecklistItem[] {
  const {
    importance,
    hardConstraints,
    minItems = 8,
    maxItems = 12,
  } = opts;

  const impMap = new Map(importance.map((i) => [i.attrId, i.importance]));

  // 1. 基础项
  const items: { item: ChecklistItem; score: number }[] = BASE_CHECKLIST.map(
    (it) => ({ item: it, score: it.priority })
  );

  // 2. Hard constraints 触发
  for (const [key, val] of Object.entries(hardConstraints)) {
    if (typeof val === "boolean" && val) {
      const hcItem = HC_CHECKLIST[key as keyof HardConstraints];
      if (hcItem) items.push({ item: hcItem, score: hcItem.priority + 5 });
    }
  }

  // 3. 维度专项：按 importance 加权
  for (const [attrId, list] of Object.entries(DIMENSION_CHECKLIST)) {
    const imp = impMap.get(attrId) ?? 0;
    for (const it of list) {
      const minImp = it.trigger?.minImportance ?? 0;
      if (imp < minImp) continue;
      // 加权得分 = 基础优先级 × (1 + importance × 2)
      const score = it.priority * (1 + imp * 2);
      items.push({ item: it, score });
    }
  }

  // 排序 + 截断 + 去重
  const seen = new Set<string>();
  const sorted = items
    .sort((a, b) => b.score - a.score)
    .filter((x) => {
      if (seen.has(x.item.id)) return false;
      seen.add(x.item.id);
      return true;
    });

  // 至少 minItems，至多 maxItems
  return sorted.slice(0, Math.max(minItems, Math.min(maxItems, sorted.length))).map(
    (x) => x.item
  );
}
