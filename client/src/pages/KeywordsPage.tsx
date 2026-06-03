import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Target, Sparkles, Pencil, Download, Upload } from 'lucide-react';
import KeywordEditModal from '../components/KeywordEditModal';
import { relativeTime } from '../utils/relativeTime';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { keywordsApi, type KeywordTemplate } from '../services/api';
import DarkSelect from '../components/DarkSelect';
import { cn } from '../lib/utils';

const CATEGORY_OPTIONS = [
  { value: '', label: '无分类' },
  { value: 'AI大模型', label: 'AI大模型' },
  { value: 'AI编程', label: 'AI编程' },
  { value: '行业', label: '行业' },
  { value: '其他', label: '其他' }
];

export default function KeywordsPage() {
  const {
    keywords,
    showToast,
    handleAddKeyword,
    handleDeleteKeyword,
    handleToggleKeyword,
    handleUpdateKeyword,
    refreshKeywords
  } = useApp();
  const [newKeyword, setNewKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [templates, setTemplates] = useState<KeywordTemplate[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [editingKeyword, setEditingKeyword] = useState<import('../services/api').Keyword | null>(null);

  useEffect(() => {
    keywordsApi
      .getTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    try {
      await handleAddKeyword(newKeyword, category || undefined);
      setNewKeyword('');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : '添加失败', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const data = await keywordsApi.exportJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotpulse-keywords-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('已导出关键词', 'success');
    } catch {
      showToast('导出失败', 'error');
    }
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as {
          keywords?: { text: string; category?: string; isActive?: boolean }[];
        };
        const list = parsed.keywords ?? (Array.isArray(parsed) ? parsed : []);
        const res = await keywordsApi.importJson(list);
        await refreshKeywords();
        showToast(`导入 ${res.created} 个，跳过 ${res.skipped} 个`, 'success');
      } catch {
        showToast('导入文件格式错误', 'error');
      }
    };
    input.click();
  };

  const handleImportTemplate = async (templateId: string) => {
    setImportingId(templateId);
    try {
      const result = await keywordsApi.importTemplate(templateId);
      await refreshKeywords();
      showToast(
        `已导入 ${result.created} 个${result.skipped > 0 ? `，跳过 ${result.skipped} 个重复` : ''}`,
        'success'
      );
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '导入失败', 'error');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {templates.length > 0 && (
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <h2 className="text-sm font-medium text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            关键词模板
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-2"
              >
                <div>
                  <p className="text-sm font-medium text-white">{tpl.name}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{tpl.description}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{tpl.keywords.length} 个词</p>
                </div>
                <button
                  type="button"
                  disabled={importingId === tpl.id}
                  onClick={() => handleImportTemplate(tpl.id)}
                  className="mt-auto px-3 py-2 rounded-lg text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  {importingId === tpl.id ? '导入中…' : '一键导入'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-2 rounded-lg text-xs border border-white/10 text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          导出 JSON
        </button>
        <button
          type="button"
          onClick={handleImportFile}
          className="px-3 py-2 rounded-lg text-xs border border-white/10 text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          导入 JSON
        </button>
      </div>

      <form onSubmit={onSubmit} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="输入要监控的关键词，如：GPT-5、AI编程、Cursor..."
            className="flex-1 min-w-[200px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
          />
          <DarkSelect
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={setCategory}
            className="min-w-[140px] sm:min-w-[160px]"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            添加
          </motion.button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <AnimatePresence>
          {keywords.map((keyword, i) => (
            <motion.div
              key={keyword.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                'group p-4 rounded-xl border transition-all',
                keyword.isActive
                  ? 'bg-white/[0.03] border-blue-500/20 hover:border-blue-500/30'
                  : 'bg-white/[0.01] border-white/5 opacity-60'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleKeyword(keyword.id).catch(() => showToast('操作失败', 'error'))}
                    className={cn(
                      'w-11 h-6 rounded-full transition-all relative',
                      keyword.isActive ? 'bg-blue-500' : 'bg-slate-700'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                        keyword.isActive ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                  <div>
                    <span className={cn('font-medium', keyword.isActive ? 'text-white' : 'text-slate-500')}>
                      {keyword.text}
                    </span>
                    {keyword.category && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                        {keyword.category}
                      </span>
                    )}
                    {keyword._count && keyword._count.hotspots > 0 && (
                      <span className="ml-2 text-xs text-slate-600">{keyword._count.hotspots} 条热点</span>
                    )}
                    {keyword.lastScannedAt && (
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        上次扫描 {relativeTime(keyword.lastScannedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    type="button"
                    onClick={() => setEditingKeyword(keyword)}
                    className="p-2 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteKeyword(keyword.id).catch(() => showToast('删除失败', 'error'))}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {keywords.length === 0 && (
        <EmptyState
          icon={Target}
          title="还没有监控关键词"
          description="从上方模板一键导入，或运行 npm run demo 加载演示数据"
        />
      )}

      <KeywordEditModal
        keyword={editingKeyword}
        onClose={() => setEditingKeyword(null)}
        onSave={handleUpdateKeyword}
      />
    </div>
  );
}
