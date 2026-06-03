import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { hotspotsApi, type ReportRange } from '../services/api';
import { cn } from '../lib/utils';

const RANGES: { id: ReportRange; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: '7d', label: '近 7 天' },
  { id: '30d', label: '近 30 天' }
];

interface ReportExportButtonProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function ReportExportButton({ showToast }: ReportExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (range: ReportRange) => {
    setIsExporting(true);
    setIsOpen(false);
    try {
      const markdown = await hotspotsApi.downloadReport(range);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotpulse-report-${range}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('报告已下载', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isExporting}
        onClick={() => setIsOpen((v) => !v)}
        className="px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-slate-300 hover:border-blue-500/30 hover:text-white flex items-center gap-2 disabled:opacity-50"
      >
        <FileDown className={cn('w-4 h-4', isExporting && 'animate-pulse')} />
        {isExporting ? '导出中…' : '导出报告'}
      </button>
      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            aria-label="关闭"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-20 py-1 rounded-xl bg-slate-900 border border-white/10 shadow-xl min-w-[140px]">
            {RANGES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleExport(id)}
                className="w-full px-4 py-2 text-sm text-left text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
