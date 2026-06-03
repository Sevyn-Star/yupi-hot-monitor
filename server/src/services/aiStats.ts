export interface AiUsageStats {
  expandCalls: number;
  analyzeCalls: number;
  lastResetAt: string | null;
  sessionTotalExpand: number;
  sessionTotalAnalyze: number;
}

let currentScan = { expand: 0, analyze: 0 };
let session = { expand: 0, analyze: 0 };
let lastResetAt: string | null = null;

export function resetAiStatsForScan(): void {
  currentScan = { expand: 0, analyze: 0 };
  lastResetAt = new Date().toISOString();
}

export function recordExpandCall(): void {
  currentScan.expand++;
  session.expand++;
}

export function recordAnalyzeCall(): void {
  currentScan.analyze++;
  session.analyze++;
}

export function getCurrentScanAiStats(): { expand: number; analyze: number } {
  return { ...currentScan };
}

export function getAiUsageStats(): AiUsageStats {
  return {
    expandCalls: currentScan.expand,
    analyzeCalls: currentScan.analyze,
    lastResetAt,
    sessionTotalExpand: session.expand,
    sessionTotalAnalyze: session.analyze
  };
}
