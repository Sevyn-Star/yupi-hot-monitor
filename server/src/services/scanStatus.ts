import type { SourceFetchStat } from './aggregateSearch.js';
import { log } from '../utils/logger.js';

export type ScanTrigger = 'cron' | 'manual';

export interface ScanFilterStats {
  rawFetched: number;
  afterFreshness: number;
  skippedDuplicate: number;
  skippedFake: number;
  skippedLowRelevance: number;
  skippedNotMentioned: number;
  skippedQuota: number;
  saved: number;
  processErrors: number;
}

export function emptyFilterStats(): ScanFilterStats {
  return {
    rawFetched: 0,
    afterFreshness: 0,
    skippedDuplicate: 0,
    skippedFake: 0,
    skippedLowRelevance: 0,
    skippedNotMentioned: 0,
    skippedQuota: 0,
    saved: 0,
    processErrors: 0
  };
}

export interface KeywordScanSummary {
  keyword: string;
  rawCount: number;
  freshCount: number;
  newHotspots: number;
  filterStats: ScanFilterStats;
  sourceStats: SourceFetchStat[];
  durationMs: number;
  error?: string;
}

export interface ScanRunSummary {
  trigger: ScanTrigger;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  keywordsChecked: number;
  newHotspotsCount: number;
  error?: string;
  filterStats?: ScanFilterStats;
  keywordSummaries?: KeywordScanSummary[];
  aiCalls?: { expand: number; analyze: number };
}

export interface ScanStatus {
  isRunning: boolean;
  lastRun: ScanRunSummary | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  currentKeyword: string | null;
  lastSourceStats: SourceFetchStat[];
  lastSkippedReason: string | null;
}

const state: ScanStatus = {
  isRunning: false,
  lastRun: null,
  lastSuccessAt: null,
  lastError: null,
  currentKeyword: null,
  lastSourceStats: [],
  lastSkippedReason: null
};

export interface PendingRunDetails {
  filterStats: ScanFilterStats;
  keywordSummaries: KeywordScanSummary[];
  aiCalls: { expand: number; analyze: number };
}

let pendingRunDetails: PendingRunDetails | null = null;

export function getScanStatus(): ScanStatus {
  return {
    ...state,
    lastSourceStats: [...state.lastSourceStats]
  };
}

export function setCurrentKeyword(keyword: string | null): void {
  state.currentKeyword = keyword;
}

export function setLastSourceStats(stats: SourceFetchStat[]): void {
  state.lastSourceStats = stats;
}

export function setPendingRunDetails(details: PendingRunDetails): void {
  pendingRunDetails = details;
}

export type ScanRunResult =
  | { skipped: true; reason: 'already_running' }
  | { skipped: false; newHotspotsCount: number; keywordsChecked: number };

export async function runWithScanLock(
  trigger: ScanTrigger,
  fn: () => Promise<{ newHotspotsCount: number; keywordsChecked: number }>
): Promise<ScanRunResult> {
  if (state.isRunning) {
    state.lastSkippedReason = 'already_running';
    log.warn('scan.skipped', { trigger, reason: 'already_running' });
    return { skipped: true, reason: 'already_running' };
  }

  state.isRunning = true;
  state.lastError = null;
  state.lastSkippedReason = null;
  const startedAt = new Date();

  log.info('scan.start', { trigger });

  try {
    const { newHotspotsCount, keywordsChecked } = await fn();
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const details = pendingRunDetails;

    state.lastRun = {
      trigger,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      keywordsChecked,
      newHotspotsCount,
      filterStats: details?.filterStats,
      keywordSummaries: details?.keywordSummaries,
      aiCalls: details?.aiCalls
    };
    state.lastSuccessAt = finishedAt.toISOString();

    log.info('scan.complete', {
      trigger,
      durationMs,
      keywordsChecked,
      newHotspotsCount,
      filterStats: details?.filterStats,
      aiCalls: details?.aiCalls
    });

    return { skipped: false, newHotspotsCount, keywordsChecked };
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);
    const details = pendingRunDetails;
    state.lastError = message;
    state.lastRun = {
      trigger,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      keywordsChecked: 0,
      newHotspotsCount: 0,
      error: message,
      filterStats: details?.filterStats,
      keywordSummaries: details?.keywordSummaries,
      aiCalls: details?.aiCalls
    };
    log.error('scan.failed', { trigger, error: message });
    throw error;
  } finally {
    state.isRunning = false;
    state.currentKeyword = null;
    pendingRunDetails = null;
  }
}
