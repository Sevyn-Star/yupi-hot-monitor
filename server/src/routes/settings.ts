import { Router } from 'express';
import {
  getAppSettings,
  updateAppSettings,
  getSettingsForClient,
  type AppSettings,
  type SourceId,
  type WebhookType,
  SOURCE_IDS
} from '../services/settings.js';
import { rescheduleHotspotCron } from '../cron.js';
import { testWebhook } from '../services/webhook.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const settings = await getAppSettings();
    res.json(getSettingsForClient(settings));
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const body = req.body;

    if (typeof body !== 'object' || body === null) {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    const partial: Partial<AppSettings> = {};

    if (body.scanIntervalMinutes !== undefined) {
      partial.scanIntervalMinutes = Number(body.scanIntervalMinutes);
    }
    if (body.emailNotificationsEnabled !== undefined) {
      partial.emailNotificationsEnabled = Boolean(body.emailNotificationsEnabled);
    }
    if (body.enabledSources !== undefined) {
      if (!Array.isArray(body.enabledSources)) {
        return res.status(400).json({ error: 'enabledSources must be an array' });
      }
      partial.enabledSources = body.enabledSources.filter((s: string) =>
        SOURCE_IDS.includes(s as SourceId)
      ) as SourceId[];
    }
    if (body.webhookNotificationsEnabled !== undefined) {
      partial.webhookNotificationsEnabled = Boolean(body.webhookNotificationsEnabled);
    }
    if (body.webhookUrl !== undefined) {
      partial.webhookUrl = String(body.webhookUrl);
    }
    if (body.webhookType !== undefined) {
      const t = body.webhookType as WebhookType;
      if (t === 'dingtalk' || t === 'feishu' || t === 'generic') {
        partial.webhookType = t;
      }
    }
    if (body.dailyReportEmailEnabled !== undefined) {
      partial.dailyReportEmailEnabled = Boolean(body.dailyReportEmailEnabled);
    }

    const settings = await updateAppSettings(partial);

    if (partial.scanIntervalMinutes !== undefined) {
      await rescheduleHotspotCron();
    }

    res.json(getSettingsForClient(settings));
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/webhook/test', async (req, res) => {
  try {
    const { url, type } = req.body as { url?: string; type?: WebhookType };
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }
    const webhookType: WebhookType =
      type === 'feishu' || type === 'generic' || type === 'dingtalk'
        ? type
        : 'dingtalk';
    const result = await testWebhook(url.trim(), webhookType);
    if (!result.ok) {
      return res.status(502).json({ error: result.error || 'Webhook test failed' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Webhook test error:', error);
    res.status(500).json({ error: 'Webhook test failed' });
  }
});

export default router;
