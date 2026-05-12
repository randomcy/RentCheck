/**
 * 帖子主题自动分类
 *
 * 把非结构化的用户点评做主题打标
 * - 输入：title + content + tags
 * - 输出：1-3 个主题标签 ∈ { 优点, 缺点, 居住体验, 价格, 通勤, 配套, 物业 }
 *
 * Mock 用关键词启发式（真实产品中应用 LLM/embedding 分类）
 */

import type { Post } from "@/types";

export type PostTopic =
  | "优点"
  | "缺点"
  | "居住体验"
  | "价格"
  | "通勤"
  | "配套"
  | "物业";

const TOPIC_KEYWORDS: Record<PostTopic, RegExp[]> = {
  优点: [
    /优点|好处|喜欢|爱了|绝了|真香|推荐|值得|满意|惊喜|舒服|舒适/,
  ],
  缺点: [
    /缺点|不好|吐槽|后悔|劝退|坑|差评|不推荐|忍不了|受不了|讨厌|麻烦|问题/,
  ],
  居住体验: [
    /住了|搬来|搬进|入住|体验|日常|早上|晚上|每天|生活|半年|一年|两年/,
  ],
  价格: [
    /租金|价格|房租|贵|便宜|涨价|押一付三|押金|性价比|划算|多少钱|￥|预算/,
  ],
  通勤: [
    /通勤|地铁|公交|上班|换乘|打车|早高峰|挤地铁|班车|国贸|中关村|望京|金融街/,
  ],
  配套: [
    /商场|超市|餐厅|外卖|咖啡|便利店|健身|医院|学校|公园|配套|周边/,
  ],
  物业: [
    /物业|保安|管家|报修|维修|电梯|门禁|清洁|卫生|垃圾|水电|快递/,
  ],
};

const PRIMARY_ORDER: PostTopic[] = [
  "优点",
  "缺点",
  "居住体验",
];

/** 提取一条帖子的主题标签（按命中分数排序） */
export function classifyPost(post: Post): PostTopic[] {
  const text = `${post.title}\n${post.content}\n${post.tags.join(" ")}`;
  const hits: Array<[PostTopic, number]> = [];

  (Object.entries(TOPIC_KEYWORDS) as [PostTopic, RegExp[]][]).forEach(
    ([topic, regexes]) => {
      let count = 0;
      regexes.forEach((re) => {
        const m = text.match(re);
        if (m) count += 1;
      });
      if (count > 0) hits.push([topic, count]);
    }
  );

  if (hits.length === 0) return ["居住体验"];

  hits.sort((a, b) => b[1] - a[1]);
  return hits.slice(0, 3).map((h) => h[0]);
}

/**
 * 把帖子按 "主分类"（优点/缺点/居住体验）归桶
 * 一条帖子可能同时进入优点和居住体验
 */
export function groupPostsByPrimary(posts: Post[]) {
  const buckets: Record<PostTopic, Post[]> = {
    优点: [],
    缺点: [],
    居住体验: [],
    价格: [],
    通勤: [],
    配套: [],
    物业: [],
  };
  posts.forEach((p) => {
    const topics = classifyPost(p);
    PRIMARY_ORDER.forEach((t) => {
      if (topics.includes(t)) buckets[t].push(p);
    });
    // 没命中任何 primary → 默认归到"居住体验"
    if (!topics.some((t) => PRIMARY_ORDER.includes(t))) {
      buckets["居住体验"].push(p);
    }
  });
  return buckets;
}

/** 用关键词数组从帖子里筛出"相关"的（用于优缺点条目下的"查看证据"） */
export function filterPostsByKeywords(
  posts: Post[],
  keywords: string[]
): Post[] {
  if (keywords.length === 0) return [];
  const regexes = keywords.map((k) => new RegExp(k, "i"));
  return posts.filter((p) => {
    const text = `${p.title}\n${p.content}\n${p.tags.join(" ")}`;
    return regexes.some((re) => re.test(text));
  });
}

/**
 * 给一个 pros/cons 条目自动提取关键词（用于反向链接证据）
 * 中文没有原生分词，用"主题词库 + 短片段提取"启发式
 */
const THEME_VOCAB = [
  // 噪音/安静
  "吵", "噪音", "隔音", "酒吧", "凌晨", "周末", "夜晚", "安静", "吵闹", "外面",
  // 价格
  "贵", "便宜", "溢价", "性价比", "租金", "押金", "预算",
  // 配套
  "太古里", "商场", "地铁", "餐厅", "咖啡", "便利店", "超市", "医院", "公园",
  // 居住体验
  "灯光", "装修", "户型", "鸽子笼", "紧凑", "开间", "阳台", "电梯",
  // 物业安全
  "物业", "报修", "门禁", "保安", "管家", "领快递", "治安", "深夜",
  // 通勤
  "通勤", "换乘", "打车", "高峰",
];

export function extractKeywords(text: string): string[] {
  const hits = new Set<string>();
  THEME_VOCAB.forEach((w) => {
    if (text.includes(w)) hits.add(w);
  });
  const cleaned = text.replace(/[，。！？、,.!?:：;；\s]+/g, "|");
  cleaned.split("|").forEach((seg) => {
    if (seg.length >= 2 && seg.length <= 4) {
      if (!/^(一言|难尽|怀疑|人生|一倍|真的|可能|建议|如果|因为|所以|但是|或者|已经|应该|实在|确实)$/.test(seg)) {
        hits.add(seg);
      }
    }
  });
  return Array.from(hits).slice(0, 6);
}
