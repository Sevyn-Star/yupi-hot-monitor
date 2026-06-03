import cron, { type ScheduledTask } from 'node-cron';
import type { Server } from 'socket.io';
import { runHotspotCheck } from './jobs/hotspotChecker.js';
import { runDailyReportEmail } from './jobs/dailyReport.js';
import { getAppSettings, minutesToCron } from './services/settings.js';
import { runWithScanLock } from './services/scanStatus.js';

let scheduledTask: ScheduledTask | null = null;
let dailyReportTask: ScheduledTask | null = null;
let ioRef: Server | null = null;

async function executeScheduledScan(): Promise<void> {
  if (!ioRef) return;
  const result = await runWithScanLock('cron', () => runHotspotCheck(ioRef!));
  if (result.skipped) {
    console.log('⏭ Scheduled scan skipped: already running');
    return;
  }
  console.log(
    `✅ Scheduled scan done: ${result.newHotspotsCount} new hotspots (${result.keywordsChecked} keywords)`
  );
}

function initDailyReportCron(): void {
  if (dailyReportTask) dailyReportTask.stop();
  dailyReportTask = cron.schedule('0 8 * * *', () => {
    void runDailyReportEmail();
  });
  console.log('📧 Daily report email scheduled: 08:00 every day');
}

export function initHotspotCron(io: Server): void {
  ioRef = io;
  void rescheduleHotspotCron();
  initDailyReportCron();
}

export async function rescheduleHotspotCron(): Promise<void> {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const settings = await getAppSettings();
  const expression = minutesToCron(settings.scanIntervalMinutes);

  if (!cron.validate(expression)) {
    console.warn(`Invalid cron "${expression}", falling back to */30 * * * *`);
    scheduledTask = cron.schedule('*/30 * * * *', () => {
      void executeScheduledScan();
    });
  } else {
    scheduledTask = cron.schedule(expression, () => {
      void executeScheduledScan();
    });
  }

  console.log(
    `⏰ Hotspot check scheduled: every ${settings.scanIntervalMinutes} min (${expression})`
  );
}
