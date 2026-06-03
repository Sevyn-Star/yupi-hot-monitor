import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { healthApi, type StartupCheck } from '../services/api';
import { cn } from '../lib/utils';

const DISMISS_KEY = 'hotpulse-startup-dismissed';

export default function StartupBanner() {
  const [check, setCheck] = useState<StartupCheck | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  );

  useEffect(() => {
    healthApi.startup().then(setCheck).catch(() => setCheck(null));
  }, []);

  if (dismissed || !check || check.ready) return null;

  const items = [
    { ok: check.openRouterConfigured, label: 'OpenRouter API Key' },
    { ok: check.keywordCount > 0, label: '至少 1 个监控关键词' },
    { ok: check.smtpConfigured, label: 'SMTP（可选，邮件通知）' }
  ];

  return (
    <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 relative">
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        className="absolute top-3 right-3 p-1 text-slate-500 hover:text-white"
        aria-label="关闭"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-amber-100 font-medium">完成以下配置即可开始监控</p>
          <ul className="space-y-1">
            {items.map(({ ok, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs">
                <CheckCircle2
                  className={cn('w-3.5 h-3.5', ok ? 'text-emerald-400' : 'text-slate-600')}
                />
                <span className={ok ? 'text-slate-400' : 'text-slate-300'}>{label}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500">
            运行 <code className="text-slate-400">npm run demo</code> 可加载演示数据；详见{' '}
            <Link to="/keywords" className="text-blue-400 hover:underline">
              监控词
            </Link>{' '}
            与{' '}
            <Link to="/settings" className="text-blue-400 hover:underline">
              设置
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
