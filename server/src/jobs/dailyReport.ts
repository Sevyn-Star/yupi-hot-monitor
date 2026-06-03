import { prisma } from '../db.js';
import { getAppSettings, isEmailConfigured } from '../services/settings.js';
import { sendDigestEmail } from '../services/email.js';
import { log } from '../utils/logger.js';

export async function runDailyReportEmail(): Promise<boolean> {
  const settings = await getAppSettings();

  if (!settings.dailyReportEmailEnabled || !isEmailConfigured()) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hotspots = await prisma.hotspot.findMany({
    where: { createdAt: { gte: today } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  if (hotspots.length === 0) {
    log.info('daily.report.skip', { reason: 'no_hotspots_today' });
    return false;
  }

  const sent = await sendDigestEmail(hotspots);
  log.info('daily.report.sent', { count: hotspots.length, sent });
  return sent;
}
