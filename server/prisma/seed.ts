import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_KEYWORDS = [
  { text: 'GPT-5', category: 'AI大模型' },
  { text: 'Cursor', category: 'AI编程' },
  { text: 'AI编程', category: '行业' }
];

const DEMO_HOTSPOTS = [
  {
    text: 'GPT-5',
    title: 'OpenAI 发布 GPT-5 预览版，推理能力显著提升',
    content: '社区讨论集中在多模态与代码能力；开发者反馈 API 延迟降低。',
    url: 'https://example.com/demo/gpt5-announce',
    source: 'hackernews',
    importance: 'urgent',
    relevance: 92,
    summary: 'GPT-5 预览引发全网关注，属高优先级 AI 大模型动态。'
  },
  {
    text: 'Cursor',
    title: 'Cursor 2.0 支持多 Agent 并行编程工作流',
    content: 'IDE 集成 Composer 与终端协同，适合全栈 AI 辅助开发。',
    url: 'https://example.com/demo/cursor-2',
    source: 'github',
    importance: 'high',
    relevance: 88,
    summary: 'Cursor 版本更新，直接影响 AI 编程工具赛道。'
  },
  {
    text: 'AI编程',
    title: 'Hugging Face  trending：开源代码大模型周下载破百万',
    content: '多个 7B 级别代码模型进入 Trending 榜单。',
    url: 'https://huggingface.co/demo/model',
    source: 'huggingface',
    importance: 'medium',
    relevance: 75,
    summary: '开源社区热度上升，与 AI 编程关键词相关。'
  },
  {
    text: 'GPT-5',
    title: '科技博主实测 GPT-5 长上下文写作',
    content: '对比 Claude 与 Gemini 在长文档场景的表现。',
    url: 'https://example.com/demo/gpt5-review',
    source: 'bing',
    importance: 'medium',
    relevance: 70,
    summary: '评测类内容，相关性良好。'
  }
];

async function main() {
  const keywordMap = new Map<string, string>();

  for (const { text, category } of DEMO_KEYWORDS) {
    const kw = await prisma.keyword.upsert({
      where: { text },
      update: { isActive: true, category, lastScannedAt: new Date() },
      create: { text, category, isActive: true, lastScannedAt: new Date() }
    });
    keywordMap.set(text, kw.id);
  }

  let hotspotCount = 0;
  for (const demo of DEMO_HOTSPOTS) {
    const keywordId = keywordMap.get(demo.text);
    await prisma.hotspot.upsert({
      where: {
        url_source: { url: demo.url, source: demo.source }
      },
      update: {},
      create: {
        title: demo.title,
        content: demo.content,
        url: demo.url,
        source: demo.source,
        importance: demo.importance,
        relevance: demo.relevance,
        summary: demo.summary,
        isReal: true,
        keywordMentioned: true,
        keywordId: keywordId ?? null,
        publishedAt: new Date(),
        createdAt: new Date()
      }
    });
    hotspotCount++;
  }

  const welcome = await prisma.notification.findFirst({
    where: { title: '欢迎使用 HotPulse' }
  });
  if (!welcome) {
    await prisma.notification.create({
      data: {
        type: 'hotspot',
        title: '欢迎使用 HotPulse',
        content: 'Demo 数据已加载，可在热点雷达查看示例条目。',
        isRead: false
      }
    });
  }

  console.log(
    `Demo seed complete: ${DEMO_KEYWORDS.length} keywords, ${hotspotCount} hotspots`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
