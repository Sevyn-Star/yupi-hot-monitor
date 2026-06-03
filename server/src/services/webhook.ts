import axios from 'axios';
import { getAppSettings, type WebhookType } from './settings.js';

interface HotspotPayload {
  title: string;
  url: string;
  source: string;
  importance: string;
  summary: string | null;
  keyword?: { text: string } | null;
}

function buildDingTalkBody(hotspot: HotspotPayload) {
  const text = [
    `### 🔥 热点监控：${hotspot.title.slice(0, 80)}`,
    '',
    `- 重要性：${hotspot.importance}`,
    `- 来源：${hotspot.source}`,
    hotspot.keyword?.text ? `- 关键词：${hotspot.keyword.text}` : '',
    hotspot.summary ? `- 摘要：${hotspot.summary}` : '',
    `- [查看原文](${hotspot.url})`
  ]
    .filter(Boolean)
    .join('\n');

  return {
    msgtype: 'markdown',
    markdown: { title: 'HotPulse 热点', text }
  };
}

function buildFeishuBody(hotspot: HotspotPayload) {
  const text = [
    `**${hotspot.title}**`,
    `重要性：${hotspot.importance} | 来源：${hotspot.source}`,
    hotspot.summary || '',
    hotspot.url
  ]
    .filter(Boolean)
    .join('\n');

  return {
    msg_type: 'text',
    content: { text }
  };
}

function buildGenericBody(hotspot: HotspotPayload) {
  return {
    event: 'hotspot',
    title: hotspot.title,
    url: hotspot.url,
    source: hotspot.source,
    importance: hotspot.importance,
    summary: hotspot.summary,
    keyword: hotspot.keyword?.text ?? null
  };
}

export async function sendHotspotWebhook(hotspot: HotspotPayload): Promise<boolean> {
  const settings = await getAppSettings();

  if (!settings.webhookNotificationsEnabled || !settings.webhookUrl) {
    return false;
  }

  if (!['high', 'urgent'].includes(hotspot.importance)) {
    return false;
  }

  let body: unknown;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  switch (settings.webhookType) {
    case 'dingtalk':
      body = buildDingTalkBody(hotspot);
      break;
    case 'feishu':
      body = buildFeishuBody(hotspot);
      break;
    default:
      body = buildGenericBody(hotspot);
  }

  try {
    await axios.post(settings.webhookUrl, body, {
      headers,
      timeout: 10000
    });
    return true;
  } catch (error) {
    console.error('Webhook notification failed:', error);
    return false;
  }
}

export async function testWebhook(
  url: string,
  type: WebhookType
): Promise<{ ok: boolean; error?: string }> {
  const sample: HotspotPayload = {
    title: 'HotPulse 测试通知',
    url: 'https://example.com',
    source: 'system',
    importance: 'high',
    summary: '这是一条测试消息，说明 Webhook 配置正确。',
    keyword: { text: '测试' }
  };

  let body: unknown;
  switch (type) {
    case 'dingtalk':
      body = buildDingTalkBody(sample);
      break;
    case 'feishu':
      body = buildFeishuBody(sample);
      break;
    default:
      body = buildGenericBody(sample);
  }

  try {
    await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
