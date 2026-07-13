'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit2, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import BlocksRenderer from './BlocksRenderer';
import BlockEditorModal from './BlockEditorModal';

export default function EditorClient({ business, initialBlocks }: { business: any, initialBlocks: any[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  // 70% threshold calculation
  const completeness = useMemo(() => {
    let score = 0;
    const hasAbout = blocks.some(b => b.type === 'about' && b.content?.text?.length > 10);
    const hasServices = blocks.some(b => b.type === 'services' && b.content?.items?.length > 0);
    const hasFAQ = blocks.some(b => b.type === 'faq' && b.content?.items?.length > 0);
    const hasHours = blocks.some(b => b.type === 'hours');
    const hasContact = blocks.some(b => b.type === 'contact' && b.content?.text?.length > 5);

    if (hasAbout) score += 30;
    if (hasServices) score += 30;
    if (hasFAQ) score += 20;
    if (hasHours) score += 10;
    if (hasContact) score += 10;
    
    return score;
  }, [blocks]);

  const isPublished = completeness >= 70;

  // Publish / Update Status automatically when blocks change, wait, let's just let the user know. 
  // In a full implementation, we'd sync `is_published` to DB if it crosses the threshold.
  const syncPublishStatus = async (published: boolean) => {
    if (business.is_published !== published) {
      await supabase.from('businesses').update({ is_published: published }).eq('id', business.id);
      business.is_published = published;
    }
  };
  
  if (isPublished !== business.is_published) {
    syncPublishStatus(isPublished);
  }

  const handleSaveBlock = async (data: { title: string, content: any }) => {
    setIsSaving(true);
    try {
      if (editingBlock.isNew) {
        // Insert new
        const { data: newBlock, error } = await supabase.from('blocks').insert({
          business_id: business.id,
          type: editingBlock.type,
          title: data.title,
          content: data.content,
          order: blocks.length
        }).select().single();
        
        if (error) throw error;
        setBlocks([...blocks, newBlock]);
      } else {
        // Update
        const { error } = await supabase.from('blocks').update({
          title: data.title,
          content: data.content
        }).eq('id', editingBlock.id);
        
        if (error) throw error;
        setBlocks(blocks.map(b => b.id === editingBlock.id ? { ...b, title: data.title, content: data.content } : b));
      }
    } catch (err) {
      console.error(err);
      alert('Kaydedilirken hata oluştu.');
    } finally {
      setIsSaving(false);
      setEditingBlock(null);
    }
  };

  const handleDeleteBlock = async () => {
    if (editingBlock.isNew) {
      setEditingBlock(null);
      return;
    }
    setIsSaving(true);
    try {
      await supabase.from('blocks').delete().eq('id', editingBlock.id);
      setBlocks(blocks.filter(b => b.id !== editingBlock.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      setEditingBlock(null);
    }
  };

  const createNewBlock = (type: string, defaultTitle: string) => {
    setEditingBlock({ isNew: true, type, title: defaultTitle, content: {} });
  };

  const copyLink = () => {
    if (!isPublished) return;
    const url = `${window.location.origin}/${business.username}`;
    navigator.clipboard.writeText(url);
    alert('Link kopyalandı!');
  };

  return (
    <div className="flex h-[100dvh]">
      {/* Left Sidebar: Controls & Progress */}
      <div className="w-1/3 bg-white border-r border-slate-200 p-6 flex flex-col h-full overflow-y-auto">
        <h1 className="text-2xl font-bold font-bricolage text-[var(--ink)] mb-6">Canlı Sayfam</h1>
        
        <div className="bg-[var(--paper)] rounded-xl p-4 mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-[var(--ink)]">Yayın Durumu</h2>
            <span className={`text-xs font-bold px-2 py-1 rounded ${isPublished ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              {isPublished ? 'YAYINDA' : 'TASLAK'}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
            <div className={`h-2.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-[var(--coral)]'}`} style={{ width: `${Math.min(completeness, 100)}%` }}></div>
          </div>
          <p className="text-sm text-[var(--ink-soft)] mb-4">
            %{completeness} tamamlandı. Yayınlamak için %70'e ulaşın.
          </p>
          <div className="flex space-x-2">
            <button 
              onClick={copyLink}
              disabled={!isPublished}
              className="flex-1 flex items-center justify-center py-2 bg-[var(--ink)] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
            >
              <Copy className="w-4 h-4 mr-2" /> Linki Kopyala
            </button>
            <a 
              href={`/${business.username}`}
              target="_blank"
              className="flex items-center justify-center p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-[var(--ink)]">İçerik Blokları</h3>
          {blocks.length === 0 && <p className="text-sm text-slate-500">Henüz hiç blok eklemediniz.</p>}
          {blocks.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition">
              <div>
                <span className="font-medium text-sm text-[var(--ink)] block">{b.title}</span>
                <span className="text-xs text-[var(--ink-soft)] capitalize">{b.type}</span>
              </div>
              <button onClick={() => setEditingBlock(b)} className="text-[var(--teal)] hover:bg-[var(--coral-tint)] hover:text-[var(--coral)] p-2 rounded transition">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="pt-4 border-t border-slate-100 mt-6">
            <h4 className="text-sm font-medium text-[var(--ink-soft)] mb-3">Yeni Ekle</h4>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => createNewBlock('about', 'Hakkımda')} className="py-2 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50">Hakkımda</button>
              <button onClick={() => createNewBlock('services', 'Hizmetler')} className="py-2 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50">Hizmetler</button>
              <button onClick={() => createNewBlock('faq', 'SSS')} className="py-2 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50">SSS</button>
              <button onClick={() => createNewBlock('hours', 'Çalışma Saatleri')} className="py-2 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50">Çalışma Saatleri</button>
              <button onClick={() => createNewBlock('contact', 'İletişim')} className="py-2 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50">İletişim</button>
              <button onClick={() => createNewBlock('custom', 'Özel İçerik')} className="py-2 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50">Özel İçerik</button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Area: Live Preview */}
      <div className="w-2/3 bg-slate-100 relative flex justify-center overflow-y-auto">
        <div className="my-10 w-full max-w-sm rounded-[3rem] border-[12px] border-slate-800 bg-[var(--paper)] shadow-2xl overflow-hidden flex flex-col relative h-[800px] shrink-0">
          
          {/* Mockup Notch */}
          <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
            <div className="w-32 h-6 bg-slate-800 rounded-b-xl"></div>
          </div>

          {/* Mockup Header */}
          <div className="w-full bg-[var(--paper)] pt-16 pb-6 px-4 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[var(--coral-tint)] text-[var(--coral)] rounded-full flex items-center justify-center text-3xl font-bold mb-3">
              {business.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold font-bricolage text-[var(--ink)]">{business.name}</h2>
            <p className="text-[var(--ink-soft)] font-medium text-sm">{business.category}</p>
          </div>

          {/* Blocks (Click to edit) */}
          <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">
            {blocks.map(block => (
              <div key={block.id} className="relative group cursor-pointer" onClick={() => setEditingBlock(block)}>
                <div className="absolute inset-0 bg-[var(--coral)]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 flex items-center justify-center">
                  <div className="bg-[var(--coral)] text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                    Düzenle
                  </div>
                </div>
                <div className="pointer-events-none">
                  <BlocksRenderer blocks={[block]} />
                </div>
              </div>
            ))}
            {blocks.length === 0 && (
              <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-[var(--border-light)] text-[var(--muted)] text-sm">
                Sayfanız şu an boş. Sol taraftan blok ekleyerek doldurmaya başlayın.
              </div>
            )}
          </div>

          {/* Chat Mockup */}
          <div className="absolute bottom-0 w-full h-[100px] bg-transparent flex items-end justify-center pb-6 px-4">
            <div className="w-full bg-white shadow-xl rounded-full h-14 flex items-center px-4 border border-[var(--border-light)]">
              <span className="text-[var(--muted)] text-sm">Asistanınıza bir mesaj yazın...</span>
            </div>
          </div>
        </div>
      </div>

      {editingBlock && (
        <BlockEditorModal 
          block={editingBlock} 
          onClose={() => setEditingBlock(null)} 
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
        />
      )}
      {isSaving && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[200] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--coral)] animate-spin" />
        </div>
      )}
    </div>
  );
}
