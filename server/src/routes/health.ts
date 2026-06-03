import { Router } from 'express';
import { prisma } from '../db.js';
import { getAppSettings, isEmailConfigured } from '../services/settings.js';
import { checkSourcesHealth, getCachedSourcesHealth } from '../services/sourceHealth.js';
import { getAiUsageStats } from '../services/aiStats.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    smtpConfigured: Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.NOTIFY_EMAIL
    )
  });
});

router.get('/sources', async (req, res) => {
  try {
    const force = req.query.refresh === 'true' || req.query.refresh === '1';
    const settings = await getAppSettings();
    const query = typeof req.query.q === 'string' ? req.query.q : 'AI';

    if (!force) {
      const cached = getCachedSourcesHealth();
      if (cached) {
        return res.json({ ...cached, cached: true });
      }
    }

    const report = await checkSourcesHealth(settings.enabledSources, query, { force: true });
    res.json({ ...report, cached: false });
  } catch (error) {
    console.error('Error checking source health:', error);
    res.status(500).json({ error: 'Failed to check sources health' });
  }
});

router.get('/ai-stats', (_req, res) => {
  res.json(getAiUsageStats());
});

router.get('/startup', async (_req, res) => {
  try {
    const [keywordCount, hotspotCount] = await Promise.all([
      prisma.keyword.count(),
      prisma.hotspot.count()
    ]);

    res.json({
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      smtpConfigured: isEmailConfigured(),
      twitterConfigured: Boolean(process.env.TWITTER_API_KEY),
      githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
      databaseOk: true,
      keywordCount,
      hotspotCount,
      ready: Boolean(process.env.OPENROUTER_API_KEY) && keywordCount > 0
    });
  } catch (error) {
    console.error('Startup check error:', error);
    res.status(500).json({ error: 'Startup check failed' });
  }
});

export default router;
