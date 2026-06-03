import { prisma } from '../db.js';

export type ReportRange = 'today' | '7d' | '30d';

const SOURCE_LABELS: Record<string, string> = {
  twitter: 'Twitter',
  bing: 'Bing',
  hackernews: 'HackerNews',
  sogou: '搜狗',
  bilibili: 'Bilibili',
  weibo: '微博',
  google: 'Google',
  duckduckgo: 'DuckDuckGo',
  github: 'GitHub',
  huggingface: 'Hugging Face'
};

function rangeToDateFrom(range: ReportRange): Date {
  const now = new Date();
  switch (range) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function formatRangeLabel(range: ReportRange): string {
  switch (range) {
    case 'today':
      return '今日';
    case '7d':
      return '近 7 天';
    case '30d':
      return '近 30 天';
  }
}

export async function generateHotspotReportMarkdown(
  range: ReportRange = '7d'
): Promise<{ markdown: string; count: number; range: ReportRange }> {
  const dateFrom = rangeToDateFrom(range);

  const hotspots = await prisma.hotspot.findMany({
    where: { createdAt: { gte: dateFrom } },
    include: { keyword: true },
    orderBy: [{ importance: 'desc' }, { relevance: 'desc' }, { createdAt: 'desc' }]
  });

  const bySource = new Map<string, typeof hotspots>();
  for (const h of hotspots) {
    const list = bySource.get(h.source) || [];
    list.push(h);
    bySource.set(h.source, list);
  }

  const lines: string[] = [];
  const now = new Date();
  lines.push(`# HotPulse 热点报告（${formatRangeLabel(range)}）`);
  lines.push('');
  lines.push(`> 生成时间：${now.toLocaleString('zh-CN')}`);
  lines.push(`> 热点条数：**${hotspots.length}**`);
  lines.push('');

  const urgent = hotspots.filter((h) => h.importance === 'urgent').length;
  const high = hotspots.filter((h) => h.importance === 'high').length;
  lines.push('## 概览');
  lines.push('');
  lines.push(`- 紧急：${urgent} 条`);
  lines.push(`- 高优先级：${high} 条`);
  lines.push(`- 监控词覆盖：${new Set(hotspots.map((h) => h.keywordId).filter(Boolean)).size} 个`);
  lines.push('');

  if (hotspots.length === 0) {
    lines.push('_该时间范围内暂无入库热点。_');
    return { markdown: lines.join('\n'), count: 0, range };
  }

  for (const [source, items] of bySource) {
    lines.push(`## ${SOURCE_LABELS[source] || source}（${items.length}）`);
    lines.push('');
    for (const h of items.slice(0, 30)) {
      const kw = h.keyword?.text ? ` · ${h.keyword.text}` : '';
      lines.push(`### ${h.title}`);
      lines.push('');
      lines.push(
        `- **重要性**：${h.importance} · **相关性**：${h.relevance}% · **来源**：${SOURCE_LABELS[h.source] || h.source}${kw}`
      );
      if (h.summary) lines.push(`- **摘要**：${h.summary}`);
      lines.push(`- **链接**：[查看原文](${h.url})`);
      lines.push('');
    }
    if (items.length > 30) {
      lines.push(`_另有 ${items.length - 30} 条未展开…_`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('*由 HotPulse Web 版自动生成*');

  return { markdown: lines.join('\n'), count: hotspots.length, range };
}
