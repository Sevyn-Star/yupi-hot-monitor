import type { DiscoveryItem } from './types.js';
import type { KeywordCandidate, KeywordTrend } from './insightTypes.js';

const EN_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'it', 'its', 'this', 'that', 'these', 'those', 'from', 'by', 'at', 'as', 'but', 'not',
  'you', 'your', 'we', 'our', 'they', 'their', 'he', 'she', 'his', 'her', 'my', 'me',
  'new', 'how', 'what', 'when', 'where', 'why', 'who', 'which', 'all', 'any', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'get', 'use', 'using', 'used',
  'github', 'http', 'https', 'www', 'com', 'show', 'news', 'video', 'api'
]);

const ZH_STOP = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '什么', '怎么', '为什么', '可以', '已经', '进行', '今日',
  '热搜', '微博', '话题', '视频', '官方', '发布', '回应', '网友', '曝光'
]);

function rankWeight(rank: number): number {
  return Math.max(1, 32 - rank);
}

function normalizeTerm(raw: string): string | null {
  const term = raw.trim().toLowerCase();
  if (term.length < 2 || term.length > 48) return null;
  if (EN_STOP.has(term) || ZH_STOP.has(term)) return null;
  if (/^\d+$/.test(term)) return null;
  return term;
}

function extractFromGitHub(item: DiscoveryItem): string[] {
  const terms: string[] = [];
  const title = item.title.trim();
  if (title.includes('/')) {
    const parts = title.split('/');
    if (parts[1]) terms.push(parts[1]);
    if (parts[0] && parts[0].length >= 3) terms.push(parts[0]);
  } else {
    terms.push(title);
  }
  const desc = item.content.replace(/⭐.*$/, '').trim();
  for (const w of desc.split(/[\s\-_,./·]+/)) {
    if (w.length >= 3) terms.push(w);
  }
  return terms;
}

function extractFromWeibo(item: DiscoveryItem): string[] {
  const title = item.title.replace(/^🔥\s*微博热搜:\s*/i, '').trim();
  const terms = [title];
  for (const seg of title.split(/[#\s,，、/|]+/)) {
    if (seg.length >= 2) terms.push(seg);
  }
  return terms;
}

function extractEnglishTokens(text: string): string[] {
  return text
    .replace(/[^a-zA-Z0-9\s\-+.#]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ''))
    .filter((w) => w.length >= 3);
}

function extractChineseTokens(text: string): string[] {
  const terms: string[] = [];
  const segments = text.match(/[\u4e00-\u9fff]{2,8}/g) ?? [];
  terms.push(...segments);
  for (const seg of segments) {
    if (seg.length >= 4) {
      for (let i = 0; i <= seg.length - 2; i += 2) {
        terms.push(seg.slice(i, i + 2));
      }
    }
  }
  return terms;
}

function extractFromGeneric(item: DiscoveryItem, source: string): string[] {
  const text = `${item.title} ${item.content}`;
  const terms: string[] = [];

  if (source === 'huggingface') {
    const id = item.title;
    if (id.includes('/')) {
      terms.push(id.split('/').pop()!);
      terms.push(id.replace('/', '-'));
    }
    terms.push(id);
  }

  terms.push(...extractEnglishTokens(text));
  terms.push(...extractChineseTokens(text));
  return terms;
}

function extractTermsFromItem(item: DiscoveryItem, source: string): string[] {
  switch (source) {
    case 'github':
      return extractFromGitHub(item);
    case 'weibo':
      return extractFromWeibo(item);
    default:
      return extractFromGeneric(item, source);
  }
}

interface ScoredEntry {
  score: number;
  appearances: number;
  titles: Set<string>;
}

export function extractKeywordCandidates(
  items: Array<{ item: DiscoveryItem; rank: number }>,
  source: string,
  previousTerms?: Map<string, number>
): KeywordCandidate[] {
  const map = new Map<string, ScoredEntry>();

  for (const { item, rank } of items) {
    const weight = rankWeight(rank);
    const rawTerms = extractTermsFromItem(item, source);

    for (const raw of rawTerms) {
      const term = normalizeTerm(raw);
      if (!term) continue;

      const entry = map.get(term) ?? { score: 0, appearances: 0, titles: new Set<string>() };
      entry.score += weight;
      entry.appearances += 1;
      if (entry.titles.size < 3) entry.titles.add(item.title.slice(0, 80));
      map.set(term, entry);
    }
  }

  const prevTop = previousTerms ?? new Map<string, number>();

  return [...map.entries()]
    .map(([term, e]) => {
      const prev = prevTop.get(term) ?? 0;
      let trend: KeywordTrend = 'stable';
      if (prev === 0 && e.appearances >= 2) trend = 'new';
      else if (prev > 0 && e.score > prev * 1.3) trend = 'rising';
      else if (prev === 0) trend = 'new';

      return {
        term,
        score: Math.round(e.score),
        appearances: e.appearances,
        sampleTitles: [...e.titles],
        trend
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

export function buildRuleBasedThemes(keywords: KeywordCandidate[]): { title: string; keywords: string[]; why: string }[] {
  if (keywords.length === 0) return [];

  const themes: { title: string; keywords: string[]; why: string }[] = [];
  const chunkSize = 4;
  for (let i = 0; i < Math.min(keywords.length, 12); i += chunkSize) {
    const chunk = keywords.slice(i, i + chunkSize);
    themes.push({
      title: chunk.map((k) => k.term).slice(0, 2).join(' / ') || '热门话题',
      keywords: chunk.map((k) => k.term),
      why: `在榜单中出现 ${chunk.reduce((s, k) => s + k.appearances, 0)} 次`
    });
  }
  return themes.slice(0, 5);
}

export function ruleBasedSummary(
  source: string,
  period: string,
  keywords: KeywordCandidate[],
  stats: { snapshotCount: number; itemCount: number }
): string {
  const top = keywords.slice(0, 5).map((k) => k.term).join('、');
  const periodLabel = period === 'today' ? '今日' : period === '7d' ? '近 7 天' : '近 30 天';
  if (!top) {
    return `${periodLabel}暂无足够快照数据，请多刷新榜单后再生成洞察。`;
  }
  return `${periodLabel}「${source}」榜单基于 ${stats.snapshotCount} 次快照、${stats.itemCount} 条条目分析，高频词包括：${top}。`;
}
