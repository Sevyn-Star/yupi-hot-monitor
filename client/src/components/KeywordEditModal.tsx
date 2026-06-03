import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Keyword } from '../services/api';
import DarkSelect from './DarkSelect';

const CATEGORY_OPTIONS = [
  { value: '', label: '无分类' },
  { value: 'AI大模型', label: 'AI大模型' },
  { value: 'AI编程', label: 'AI编程' },
  { value: '行业', label: '行业' },
  { value: '其他', label: '其他' }
];

interface KeywordEditModalProps {
  keyword: Keyword | null;
  onClose: () => void;
  onSave: (id: string, data: { text: string; category?: string }) => Promise<void>;
}

export default function KeywordEditModal({
  keyword,
  onClose,
  onSave
}: KeywordEditModalProps) {
  const [text, setText] = useState(keyword?.text ?? '');
  const [category, setCategory] = useState(keyword?.category ?? '');
  const [saving, setSaving] = useState(false);

  if (!keyword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSave(keyword.id, { text: text.trim(), category: category || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.form
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          className="w-full max-w-md p-6 rounded-2xl bg-[#0a0a1a] border border-white/10 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">编辑关键词</h3>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
          />
          <DarkSelect value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
