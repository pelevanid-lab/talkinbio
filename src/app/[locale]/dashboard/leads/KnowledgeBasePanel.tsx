'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type KnowledgeRow = {
  id: string;
  title: string | null;
  content: string;
  is_active: boolean;
  created_at: string;
};

// Kaba tahmin: ~4 karakter ≈ 1 token. Gerçek tokenizer yok, uyarı için yeterli.
const CHARS_PER_TOKEN = 4;
const WARN_TOKEN_THRESHOLD = 4500;

export default function KnowledgeBasePanel({ businessId, initialKnowledge }: { businessId: string; initialKnowledge: KnowledgeRow[] }) {
  const supabase = createClient();
  const t = useTranslations('Leads');
  const [notes, setNotes] = useState<KnowledgeRow[]>(initialKnowledge);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activeCharCount = notes.filter(n => n.is_active).reduce((sum, n) => sum + n.content.length, 0);
  const estimatedTokens = Math.round(activeCharCount / CHARS_PER_TOKEN);
  const isOverBudget = estimatedTokens > WARN_TOKEN_THRESHOLD;

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setIsSaving(true);
    const { data, error } = await supabase.from('saule_knowledge').insert({
      business_id: businessId,
      title: newTitle.trim() || null,
      content: newContent.trim(),
    }).select('*').single();
    setIsSaving(false);
    if (error) {
      console.error(error);
      alert(t('knowledgeBase.addError'));
      return;
    }
    setNotes([data, ...notes]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleToggleActive = async (note: KnowledgeRow) => {
    const nextActive = !note.is_active;
    setNotes(notes.map(n => n.id === note.id ? { ...n, is_active: nextActive } : n));
    const { error } = await supabase.from('saule_knowledge').update({ is_active: nextActive }).eq('id', note.id);
    if (error) {
      console.error(error);
      setNotes(notes.map(n => n.id === note.id ? { ...n, is_active: note.is_active } : n));
    }
  };

  const startEdit = (note: KnowledgeRow) => {
    setEditingId(note.id);
    setEditTitle(note.title || '');
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from('saule_knowledge').update({
      title: editTitle.trim() || null,
      content: editContent.trim(),
    }).eq('id', id);
    setIsSaving(false);
    if (error) {
      console.error(error);
      alert(t('knowledgeBase.editError'));
      return;
    }
    setNotes(notes.map(n => n.id === id ? { ...n, title: editTitle.trim() || null, content: editContent.trim() } : n));
    setEditingId(null);
  };

  return (
    <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#14231F]">{t('knowledgeBase.title')}</h3>
          <p className="text-sm text-[#4B5A55]">{t('knowledgeBase.description')}</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#FF6A5C] bg-[#FFEDE9] px-3 py-1.5 rounded-full hover:bg-orange-100 transition"
          >
            <Plus className="w-4 h-4" /> {t('knowledgeBase.addBtn')}
          </button>
        )}
      </div>

      {isOverBudget && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t('knowledgeBase.overBudgetWarning', { tokens: estimatedTokens })}</span>
        </div>
      )}

      {isAdding && (
        <div className="bg-[#F4F2ED] p-4 rounded-xl mb-4 space-y-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('knowledgeBase.titlePlaceholder')}
            className="w-full p-2.5 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={t('knowledgeBase.contentPlaceholder')}
            className="w-full p-2.5 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setIsAdding(false); setNewTitle(''); setNewContent(''); }} className="text-sm text-[#8A8880] px-3 py-1.5">{t('knowledgeBase.cancelBtn')}</button>
            <button onClick={handleAdd} disabled={isSaving || !newContent.trim()} className="text-sm font-medium text-white bg-[#FF6A5C] px-4 py-1.5 rounded-full hover:bg-orange-600 transition disabled:opacity-50 flex items-center">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null} {t('knowledgeBase.saveBtn')}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-[#8A8880]">{t('knowledgeBase.emptyState')}</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className={`border rounded-xl p-3 ${note.is_active ? 'border-[rgba(20,35,31,0.10)] bg-white' : 'border-[rgba(20,35,31,0.06)] bg-[#F4F2ED]/50 opacity-60'}`}>
              {editingId === note.id ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t('knowledgeBase.titlePlaceholder')}
                    className="w-full p-2 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="text-sm text-[#8A8880] px-3 py-1">{t('knowledgeBase.cancelBtn')}</button>
                    <button onClick={() => handleSaveEdit(note.id)} disabled={isSaving} className="text-sm font-medium text-white bg-[#FF6A5C] px-3 py-1 rounded-full hover:bg-orange-600 transition disabled:opacity-50">{t('knowledgeBase.saveBtn')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {note.title && <p className="text-sm font-semibold text-[#14231F]">{note.title}</p>}
                    <p className="text-sm text-[#4B5A55] whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEdit(note)} title={t('knowledgeBase.editTooltip')} className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A8880] hover:bg-[#F4F2ED] hover:text-[#14231F] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(note)}
                      title={note.is_active ? t('knowledgeBase.deactivateTooltip') : t('knowledgeBase.activateTooltip')}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A8880] hover:bg-[#F4F2ED] hover:text-[#14231F] transition"
                    >
                      {note.is_active ? <X className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
