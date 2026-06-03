import { OpenRouter } from '@openrouter/sdk';
import { recordAnalyzeCall } from '../aiStats.js';
import type {
  DiscoveryInsightPayload,
  InsightPeriod,
  KeywordCandidate
} from './insightTypes.js';
import {
  buildRuleBasedThemes,
  ruleBasedSummary
} from './keywordExtract.js';

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? ''
});

const OPENROUTER_MODEL = 'z-ai/glm-4.5-air:free';

const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  weibo: '微博热搜',
  hackernews: 'Hacker News',
  bilibili: 'Bilibili',
  huggingface: 'Hugging Face'
};

export async function synthesizeInsightWithAi(params: {
  source: string;
  period: InsightPeriod;
  keywords: KeywordCandidate[];
  previousTopTerms: string[];
  sampleTitles: string[];
  stats: { snapshotCount: number; itemCount: number };
}): Promise<Pick<DiscoveryInsightPayload, 'themes' | 'summary' | 'vsLastPeriod'> | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  const label = PLATFORM_LABELS[params.source] ?? params.source;
  const periodLabel =
    params.period === 'today' ? '今日' : params.period === '7d' ? '近 7 天' : '近 30 天';

  const keywordLines = params.keywords
    .slice(0, 25)
    .map(
      (k) =>
        `- ${k.term} (score=${k.score}, appearances=${k.appearances}, trend=${k.trend})`
    )
    .join('\n');

  const titleLines = params.sampleTitles.slice(0, 20).map((t) => `- ${t}`).join('\n');

  const systemPrompt = `你是技术热点分析专家。根据给定的榜单高频关键词与标题，归纳${periodLabel}「${label}」的热门主题与趋势。

规则：
1. topKeywords 中的 term 必须来自下方「候选关键词」列表，禁止编造
2. themes 每条包含 title、keywords（2-5个，均来自候选列表）、why（一句话）
3. summary 2-3 句中文，概括本周期热点
4. vsLastPeriod 一句对比上周/上一周期（若提供了上周词）；若无上周数据则写「暂无上一周期对比数据」
5. 只输出 JSON，格式：
{
  "themes": [{"title":"...", "keywords":["..."], "why":"..."}],
  "summary": "...",
  "vsLastPeriod": "..."
}`;

  const userContent = `候选关键词：
${keywordLines}

上周/上周期高频词：${params.previousTopTerms.join('、') || '无'}

榜单标题样例：
${titleLines}

快照 ${params.stats.snapshotCount} 次，共 ${params.stats.itemCount} 条条目。`;

  try {
    const result = await openRouter.chat.send({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      maxTokens: 800
    });

    const raw = result.choices[0]?.message?.content ?? '';
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    recordAnalyzeCall();

    const allowed = new Set(params.keywords.map((k) => k.term));

    const themes = (Array.isArray(parsed.themes) ? parsed.themes : [])
      .slice(0, 5)
      .map((t: { title?: string; keywords?: string[]; why?: string }) => ({
        title: String(t.title ?? '').slice(0, 80),
        keywords: (Array.isArray(t.keywords) ? t.keywords : [])
          .map((k: string) => String(k).toLowerCase())
          .filter((k: string) => allowed.has(k))
          .slice(0, 5),
        why: String(t.why ?? '').slice(0, 200)
      }))
      .filter((t: { title: string }) => t.title);

    return {
      themes: themes.length > 0 ? themes : buildRuleBasedThemes(params.keywords),
      summary: String(parsed.summary ?? '').slice(0, 500),
      vsLastPeriod: String(parsed.vsLastPeriod ?? '').slice(0, 300)
    };
  } catch (error) {
    console.error('Insight AI synthesis failed:', error);
    return null;
  }
}

export function buildFallbackInsight(params: {
  source: string;
  period: InsightPeriod;
  keywords: KeywordCandidate[];
  stats: { snapshotCount: number; itemCount: number };
}): Pick<DiscoveryInsightPayload, 'themes' | 'summary' | 'vsLastPeriod'> {
  return {
    themes: buildRuleBasedThemes(params.keywords),
    summary: ruleBasedSummary(params.source, params.period, params.keywords, params.stats),
    vsLastPeriod: undefined
  };
}
