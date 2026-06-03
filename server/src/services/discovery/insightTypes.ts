export type InsightPeriod = 'today' | '7d' | '30d';

export type KeywordTrend = 'new' | 'rising' | 'stable';

export interface KeywordCandidate {
  term: string;
  score: number;
  appearances: number;
  sampleTitles: string[];
  trend: KeywordTrend;
}

export interface InsightTheme {
  title: string;
  keywords: string[];
  why: string;
}

export interface DiscoveryInsightPayload {
  period: InsightPeriod;
  source: string;
  themes: InsightTheme[];
  topKeywords: KeywordCandidate[];
  summary: string;
  vsLastPeriod?: string;
  stats: {
    snapshotCount: number;
    itemCount: number;
    generatedAt: string;
    aiEnhanced: boolean;
  };
}
