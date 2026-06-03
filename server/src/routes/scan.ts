import { Router } from 'express';
import { getScanStatus } from '../services/scanStatus.js';
import { getAppSettings } from '../services/settings.js';
import { getAiUsageStats } from '../services/aiStats.js';
import { getCachedSourcesHealth } from '../services/sourceHealth.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const settings = await getAppSettings();
    res.json({
      ...getScanStatus(),
      scanIntervalMinutes: settings.scanIntervalMinutes,
      aiUsage: getAiUsageStats(),
      sourcesHealth: getCachedSourcesHealth()
    });
  } catch (error) {
    console.error('Error fetching scan status:', error);
    res.status(500).json({ error: 'Failed to fetch scan status' });
  }
});

export default router;
