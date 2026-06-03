import { useEffect, useState } from 'react';
import { Save, Mail, Clock, Database, Webhook, Send } from 'lucide-react';
import { settingsApi, type AppSettings, type WebhookType } from '../services/api';
import DarkSelect from './DarkSelect';
import NumberStepperInput from './NumberStepperInput';
import SettingsSection from './SettingsSection';
import SettingsToggle from './SettingsToggle';
import { DATA_SOURCE_OPTIONS } from '../constants/sources';
import { cn } from '../lib/utils';

const WEBHOOK_TYPE_OPTIONS: { value: WebhookType; label: string }[] = [
  { value: 'dingtalk', label: '钉钉机器人' },
  { value: 'feishu', label: '飞书机器人' },
  { value: 'generic', label: '通用 JSON' }
];

interface SettingsPanelProps {
  onSaved?: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  onSavingChange?: (saving: boolean) => void;
  saveSignal?: number;
}

export default function SettingsPanel({
  onSaved,
  showToast,
  onSavingChange,
  saveSignal = 0
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await settingsApi.get();
      setSettings(data);
    } catch {
      showToast('加载设置失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await settingsApi.update({
        scanIntervalMinutes: settings.scanIntervalMinutes,
        emailNotificationsEnabled: settings.emailNotificationsEnabled,
        dailyReportEmailEnabled: settings.dailyReportEmailEnabled,
        enabledSources: settings.enabledSources,
        webhookNotificationsEnabled: settings.webhookNotificationsEnabled,
        webhookUrl: settings.webhookUrl,
        webhookType: settings.webhookType
      });
      setSettings(updated);
      showToast('设置已保存', 'success');
      onSaved?.();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (saveSignal > 0) handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  const toggleSource = (id: string) => {
    if (!settings) return;
    const has = settings.enabledSources.includes(id);
    const next = has
      ? settings.enabledSources.filter((s) => s !== id)
      : [...settings.enabledSources, id];
    if (next.length === 0) {
      showToast('至少保留一个数据源', 'error');
      return;
    }
    setSettings({ ...settings, enabledSources: next });
  };

  const selectAllSources = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      enabledSources: DATA_SOURCE_OPTIONS.map((o) => o.id)
    });
  };

  if (isLoading || !settings) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const enabledCount = settings.enabledSources.length;

  return (
    <div className="space-y-4">
      <SettingsSection
        id="scan"
        title="扫描调度"
        description={`当前 cron：${settings.cronExpression}`}
        icon={<Clock className="w-4 h-4 text-blue-400" />}
        defaultOpen
      >
        <div className="max-w-xs">
          <label className="text-xs text-slate-500 block mb-2">自动扫描间隔（分钟）</label>
          <NumberStepperInput
            min={5}
            max={1440}
            step={5}
            value={settings.scanIntervalMinutes}
            onChange={(scanIntervalMinutes) =>
              setSettings({ ...settings, scanIntervalMinutes })
            }
          />
          <p className="text-[11px] text-slate-600 mt-1.5">保存后生效，建议 15～60 分钟</p>
        </div>
      </SettingsSection>

      <SettingsSection
        id="notify"
        title="邮件通知"
        description={
          settings.smtpConfigured ? 'SMTP 已配置' : '需在 server/.env 配置 SMTP'
        }
        icon={<Mail className="w-4 h-4 text-slate-300" />}
        badge={
          !settings.smtpConfigured ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              未配置
            </span>
          ) : null
        }
        defaultOpen
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="min-w-0">
              <p className="text-sm text-white">高优先级通知</p>
              <p className="text-[11px] text-slate-600 mt-0.5">仅 high / urgent 发信</p>
            </div>
            <SettingsToggle
              checked={settings.emailNotificationsEnabled}
              disabled={!settings.smtpConfigured}
              onChange={() =>
                setSettings({
                  ...settings,
                  emailNotificationsEnabled: !settings.emailNotificationsEnabled
                })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="min-w-0">
              <p className="text-sm text-white">每日日报</p>
              <p className="text-[11px] text-slate-600 mt-0.5">每天 08:00 发送摘要</p>
            </div>
            <SettingsToggle
              checked={settings.dailyReportEmailEnabled}
              disabled={!settings.smtpConfigured}
              onChange={() =>
                setSettings({
                  ...settings,
                  dailyReportEmailEnabled: !settings.dailyReportEmailEnabled
                })
              }
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="webhook"
        title="Webhook"
        description="钉钉 / 飞书 / 通用 JSON"
        icon={<Webhook className="w-4 h-4 text-violet-400" />}
        defaultOpen={false}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-2">类型</label>
            <DarkSelect
              value={settings.webhookType}
              options={WEBHOOK_TYPE_OPTIONS}
              onChange={(webhookType) => setSettings({ ...settings, webhookType })}
            />
          </div>
          <div className="flex items-end justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 sm:col-span-2 sm:max-w-md sm:ml-auto">
            <p className="text-xs text-slate-600">推送 high / urgent</p>
            <SettingsToggle
              accent="violet"
              checked={settings.webhookNotificationsEnabled}
              disabled={!settings.webhookUrl}
              onChange={() =>
                setSettings({
                  ...settings,
                  webhookNotificationsEnabled: !settings.webhookNotificationsEnabled
                })
              }
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-2">Webhook URL</label>
          <input
            type="url"
            value={settings.webhookUrl}
            onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
            placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <button
          type="button"
          disabled={!settings.webhookUrl || isTestingWebhook}
          onClick={async () => {
            setIsTestingWebhook(true);
            try {
              await settingsApi.testWebhook(settings.webhookUrl, settings.webhookType);
              showToast('测试消息已发送', 'success');
            } catch (e: unknown) {
              showToast(e instanceof Error ? e.message : '测试失败', 'error');
            } finally {
              setIsTestingWebhook(false);
            }
          }}
          className="px-4 py-2 rounded-lg text-sm border border-white/10 text-slate-400 hover:text-white hover:border-white/20 flex items-center gap-2 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          {isTestingWebhook ? '发送中…' : '发送测试'}
        </button>
      </SettingsSection>

      <SettingsSection
        id="sources"
        title="数据源"
        description={`已启用 ${enabledCount} / ${DATA_SOURCE_OPTIONS.length} · 监控与搜索共用`}
        icon={<Database className="w-4 h-4 text-cyan-400" />}
        defaultOpen
        badge={
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {enabledCount} 个
          </span>
        }
      >
        <div className="flex flex-wrap gap-2 mb-1">
          <button
            type="button"
            onClick={selectAllSources}
            className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-slate-500 hover:text-white"
          >
            全选
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DATA_SOURCE_OPTIONS.map(({ id, label }) => {
            const on = settings.enabledSources.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleSource(id)}
                className={cn(
                  'px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left border transition-all',
                  on
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-white/[0.02] border-white/5 text-slate-500 hover:border-white/10'
                )}
              >
                {label.replace(' / X', '')}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <div className="lg:hidden pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
        >
          <Save className={cn('w-4 h-4', isSaving && 'animate-pulse')} />
          {isSaving ? '保存中…' : '保存设置'}
        </button>
      </div>
    </div>
  );
}
