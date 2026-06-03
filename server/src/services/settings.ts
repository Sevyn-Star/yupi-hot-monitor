import { prisma } from '../db.js';

export const SOURCE_IDS = [
  'twitter',
  'bing',
  'google',
  'duckduckgo',
  'hackernews',
  'github',
  'huggingface',
  'sogou',
  'bilibili',
  'weibo'
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];
export type WebhookType = 'dingtalk' | 'feishu' | 'generic';

export interface AppSettings {
  scanIntervalMinutes: number;
  emailNotificationsEnabled: boolean;
  enabledSources: SourceId[];
  webhookNotificationsEnabled: boolean;
  webhookUrl: string;
  webhookType: WebhookType;
  dailyReportEmailEnabled: boolean;
}

const SETTING_KEYS = {
  scanIntervalMinutes: 'scanIntervalMinutes',
  emailNotificationsEnabled: 'emailNotificationsEnabled',
  enabledSources: 'enabledSources',
  webhookNotificationsEnabled: 'webhookNotificationsEnabled',
  webhookUrl: 'webhookUrl',
  webhookType: 'webhookType',
  dailyReportEmailEnabled: 'dailyReportEmailEnabled'
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  scanIntervalMinutes: 30,
  emailNotificationsEnabled: true,
  enabledSources: [...SOURCE_IDS],
  webhookNotificationsEnabled: false,
  webhookUrl: '',
  webhookType: 'dingtalk',
  dailyReportEmailEnabled: false
};

function parseWebhookType(raw: string | undefined): WebhookType {
  if (raw === 'feishu' || raw === 'generic' || raw === 'dingtalk') return raw;
  return 'dingtalk';
}

const LEGACY_DEFAULT_SOURCES: SourceId[] = [
  'twitter',
  'bing',
  'hackernews',
  'sogou',
  'bilibili',
  'weibo'
];

const SOURCES_ADDED_AFTER_LEGACY: SourceId[] = [
  'google',
  'github',
  'huggingface',
  'duckduckgo'
];

function parseEnabledSources(raw: string | undefined): SourceId[] {
  if (!raw) return [...DEFAULT_SETTINGS.enabledSources];
  try {
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((s): s is SourceId =>
      SOURCE_IDS.includes(s as SourceId)
    );
    if (valid.length === 0) return [...DEFAULT_SETTINGS.enabledSources];
    const isLegacyFullSet =
      valid.length === LEGACY_DEFAULT_SOURCES.length &&
      LEGACY_DEFAULT_SOURCES.every((id) => valid.includes(id));
    if (isLegacyFullSet) {
      return [...valid, ...SOURCES_ADDED_AFTER_LEGACY];
    }
    return valid;
  } catch {
    return [...DEFAULT_SETTINGS.enabledSources];
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const interval = parseInt(map[SETTING_KEYS.scanIntervalMinutes] ?? '', 10);
  const scanIntervalMinutes =
    Number.isFinite(interval) && interval >= 5 && interval <= 1440
      ? interval
      : DEFAULT_SETTINGS.scanIntervalMinutes;

  const emailNotificationsEnabled =
    map[SETTING_KEYS.emailNotificationsEnabled] === undefined
      ? DEFAULT_SETTINGS.emailNotificationsEnabled
      : map[SETTING_KEYS.emailNotificationsEnabled] === 'true';

  const webhookNotificationsEnabled =
    map[SETTING_KEYS.webhookNotificationsEnabled] === 'true';

  const dailyReportEmailEnabled =
    map[SETTING_KEYS.dailyReportEmailEnabled] === 'true';

  return {
    scanIntervalMinutes,
    emailNotificationsEnabled,
    enabledSources: parseEnabledSources(map[SETTING_KEYS.enabledSources]),
    webhookNotificationsEnabled,
    webhookUrl: map[SETTING_KEYS.webhookUrl] ?? '',
    webhookType: parseWebhookType(map[SETTING_KEYS.webhookType]),
    dailyReportEmailEnabled
  };
}

export async function updateAppSettings(
  partial: Partial<AppSettings>
): Promise<AppSettings> {
  const updates: { key: string; value: string }[] = [];

  if (partial.scanIntervalMinutes !== undefined) {
    const v = Math.min(1440, Math.max(5, partial.scanIntervalMinutes));
    updates.push({ key: SETTING_KEYS.scanIntervalMinutes, value: String(v) });
  }
  if (partial.emailNotificationsEnabled !== undefined) {
    updates.push({
      key: SETTING_KEYS.emailNotificationsEnabled,
      value: String(partial.emailNotificationsEnabled)
    });
  }
  if (partial.enabledSources !== undefined) {
    const valid = partial.enabledSources.filter((s) =>
      SOURCE_IDS.includes(s)
    );
    updates.push({
      key: SETTING_KEYS.enabledSources,
      value: JSON.stringify(valid.length > 0 ? valid : [...SOURCE_IDS])
    });
  }
  if (partial.webhookNotificationsEnabled !== undefined) {
    updates.push({
      key: SETTING_KEYS.webhookNotificationsEnabled,
      value: String(partial.webhookNotificationsEnabled)
    });
  }
  if (partial.webhookUrl !== undefined) {
    updates.push({ key: SETTING_KEYS.webhookUrl, value: partial.webhookUrl.trim() });
  }
  if (partial.webhookType !== undefined) {
    updates.push({ key: SETTING_KEYS.webhookType, value: partial.webhookType });
  }
  if (partial.dailyReportEmailEnabled !== undefined) {
    updates.push({
      key: SETTING_KEYS.dailyReportEmailEnabled,
      value: String(partial.dailyReportEmailEnabled)
    });
  }

  await Promise.all(
    updates.map(({ key, value }) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  return getAppSettings();
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.NOTIFY_EMAIL
  );
}

export function getSettingsForClient(settings: AppSettings) {
  return {
    ...settings,
    smtpConfigured: isEmailConfigured(),
    cronExpression: minutesToCron(settings.scanIntervalMinutes)
  };
}

export function minutesToCron(minutes: number): string {
  if (minutes >= 60 && 1440 % minutes === 0) {
    const hours = minutes / 60;
    if (hours === 24) return '0 0 * * *';
    return `0 */${hours} * * *`;
  }
  if (minutes < 60) {
    return `*/${minutes} * * * *`;
  }
  return '*/30 * * * *';
}
