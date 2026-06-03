import { useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import SettingsPanel from '../components/SettingsPanel';
import SystemStatusPanel from '../components/SystemStatusPanel';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { showToast } = useApp();
  const [saveSignal, setSaveSignal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const triggerSave = () => setSaveSignal((n) => n + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10">
            <Settings2 className="w-5 h-5 text-blue-400" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-white">设置</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              扫描调度、通知渠道与数据源；右侧查看运行状态
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={triggerSave}
          disabled={isSaving}
          className={cn(
            'hidden lg:flex px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500',
            'text-white text-sm font-medium items-center gap-2 shadow-lg shadow-blue-500/20',
            'disabled:opacity-50 shrink-0'
          )}
        >
          <Save className={cn('w-4 h-4', isSaving && 'animate-pulse')} />
          {isSaving ? '保存中…' : '保存设置'}
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          <SettingsPanel
            showToast={showToast}
            saveSignal={saveSignal}
            onSavingChange={setIsSaving}
          />
        </div>

        <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
          <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 px-1">
            系统状态
          </p>
          <SystemStatusPanel showToast={showToast} />
        </aside>
      </div>
    </div>
  );
}
