'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import MediaUploader from './MediaUploader';

export default function BlockEditorModal({ 
  block, 
  onSave, 
  onClose,
  onDelete
}: { 
  block: any; 
  onSave: (data: any) => void; 
  onClose: () => void;
  onDelete: () => void;
}) {
  // Local state for editing
  const [title, setTitle] = useState(block?.title || '');
  const [content, setContent] = useState<any>(block?.content || {});

  useEffect(() => {
    setTitle(block?.title || '');
    
    // Initialize default content structure if empty
    if (!block?.content || Object.keys(block.content).length === 0) {
      if (block?.type === 'services' || block?.type === 'pricing') setContent({ items: [] });
      else if (block?.type === 'hours') setContent({ schedule: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        saturday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
      }});
      else if (block?.type === 'faq' || block?.type === 'links' || block?.type === 'gallery' || block?.type === 'testimonials') setContent({ items: [] });
      else setContent({ text: '' });
    } else {
      setContent(block.content);
    }
  }, [block]);

  const handleSave = () => {
    onSave({ title, content });
  };

  const renderContentEditor = () => {
    if (!block) return null;

    switch (block.type) {
      case 'about':
      case 'custom':
      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Metin İçeriği</label>
              <textarea 
                value={content.text || ''} 
                onChange={(e) => setContent({...content, text: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-lg h-32"
                placeholder="İçeriğinizi buraya yazın..."
              />
            </div>
            {block.type === 'about' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium mb-1">Görsel / Video</label>
                <MediaUploader 
                  value={content.mediaUrl || ''}
                  onChange={(url) => setContent({...content, mediaUrl: url})}
                />
                {content.mediaUrl && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium mb-1 text-slate-500">Görsel Konumu</label>
                    <select 
                      value={content.mediaPosition || 'top'} 
                      onChange={(e) => setContent({...content, mediaPosition: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
                    >
                      <option value="top">En Üstte (Başlıktan Önce)</option>
                      <option value="middle">Ortada (Başlık ile Metin Arasında)</option>
                      <option value="bottom">En Altta (Metinden Sonra)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'services':
        return (
          <div className="space-y-4">
            {(content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg relative space-y-3 bg-slate-50">
                <button 
                  onClick={() => {
                    const newItems = [...content.items];
                    newItems.splice(idx, 1);
                    setContent({...content, items: newItems});
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input 
                  value={item.title || ''} 
                  onChange={e => {
                    const newItems = [...content.items];
                    newItems[idx].title = e.target.value;
                    setContent({...content, items: newItems});
                  }}
                  placeholder="Hizmet Adı" 
                  className="w-full p-2 border border-slate-200 rounded"
                />
                <textarea 
                  value={item.description || ''} 
                  onChange={e => {
                    const newItems = [...content.items];
                    newItems[idx].description = e.target.value;
                    setContent({...content, items: newItems});
                  }}
                  placeholder="Açıklama" 
                  className="w-full p-2 border border-slate-200 rounded"
                />
                <div className="flex gap-3">
                  <input 
                    value={item.price || ''} 
                    onChange={e => {
                      const newItems = [...content.items];
                      newItems[idx].price = e.target.value;
                      setContent({...content, items: newItems});
                    }}
                    placeholder="Fiyat (Örn: 400 TL)" 
                    className="flex-1 p-2 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-500">Hizmet Görseli / Videosu</label>
                  <MediaUploader 
                    value={item.mediaUrl || ''}
                    onChange={url => {
                      const newItems = [...content.items];
                      newItems[idx].mediaUrl = url;
                      setContent({...content, items: newItems});
                    }}
                  />
                </div>
              </div>
            ))}
            <button 
              onClick={() => setContent({...content, items: [...(content.items || []), { title: '', description: '', price: '', mediaUrl: '' }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Yeni Hizmet Ekle
            </button>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            {(content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg relative space-y-3 bg-slate-50">
                <button 
                  onClick={() => {
                    const newItems = [...content.items];
                    newItems.splice(idx, 1);
                    setContent({...content, items: newItems});
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input 
                  value={item.question || ''} 
                  onChange={e => {
                    const newItems = [...content.items];
                    newItems[idx].question = e.target.value;
                    setContent({...content, items: newItems});
                  }}
                  placeholder="Soru" 
                  className="w-full p-2 border border-slate-200 rounded font-medium"
                />
                <textarea 
                  value={item.answer || ''} 
                  onChange={e => {
                    const newItems = [...content.items];
                    newItems[idx].answer = e.target.value;
                    setContent({...content, items: newItems});
                  }}
                  placeholder="Cevap (Opsiyonel - Ajan bunu context olarak kullanabilir)" 
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                />
              </div>
            ))}
            <button 
              onClick={() => setContent({...content, items: [...(content.items || []), { question: '', answer: '' }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Yeni Soru Ekle
            </button>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(content.items || []).map((item: any, idx: number) => (
                <div key={idx} className="relative bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      const newItems = [...content.items];
                      newItems.splice(idx, 1);
                      setContent({...content, items: newItems});
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 p-1 rounded-full z-10 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="h-32">
                    <MediaUploader 
                      value={item.url || ''}
                      onChange={url => {
                        const newItems = [...content.items];
                        newItems[idx].url = url;
                        setContent({...content, items: newItems});
                      }}
                      label="Medya Yükle"
                    />
                  </div>
                  <input 
                    value={item.caption || ''} 
                    onChange={e => {
                      const newItems = [...content.items];
                      newItems[idx].caption = e.target.value;
                      setContent({...content, items: newItems});
                    }}
                    placeholder="Görsel Açıklaması" 
                    className="w-full p-2 border border-slate-200 rounded text-xs mt-auto"
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={() => setContent({...content, items: [...(content.items || []), { url: '', caption: '' }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Yeni Medya Ekle
            </button>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            {(content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg relative space-y-3 bg-slate-50">
                <button 
                  onClick={() => {
                    const newItems = [...content.items];
                    newItems.splice(idx, 1);
                    setContent({...content, items: newItems});
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <textarea 
                  value={item.quote || ''} 
                  onChange={e => {
                    const newItems = [...content.items];
                    newItems[idx].quote = e.target.value;
                    setContent({...content, items: newItems});
                  }}
                  placeholder="Müşteri Yorumu..." 
                  className="w-full p-2 border border-slate-200 rounded min-h-[80px]"
                />
                <div className="flex gap-2">
                  <input 
                    value={item.author || ''} 
                    onChange={e => {
                      const newItems = [...content.items];
                      newItems[idx].author = e.target.value;
                      setContent({...content, items: newItems});
                    }}
                    placeholder="Müşteri Adı" 
                    className="flex-1 p-2 border border-slate-200 rounded text-sm"
                  />
                  <input 
                    value={item.role || ''} 
                    onChange={e => {
                      const newItems = [...content.items];
                      newItems[idx].role = e.target.value;
                      setContent({...content, items: newItems});
                    }}
                    placeholder="Unvan (Örn: CEO)" 
                    className="flex-1 p-2 border border-slate-200 rounded text-sm"
                  />
                </div>
              </div>
            ))}
            <button 
              onClick={() => setContent({...content, items: [...(content.items || []), { quote: '', author: '', role: '' }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Yeni Yorum Ekle
            </button>
          </div>
        );

      case 'hours':
        return (
          <div className="space-y-3">
            {Object.entries(content.schedule || {}).map(([day, data]: [string, any]) => (
              <div key={day} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center space-x-3 w-1/3">
                  <input 
                    type="checkbox" 
                    checked={data.isOpen} 
                    onChange={e => {
                      const newSchedule = {...content.schedule};
                      newSchedule[day].isOpen = e.target.checked;
                      setContent({...content, schedule: newSchedule});
                    }}
                    className="w-4 h-4 rounded text-[var(--coral)] focus:ring-[var(--coral)]"
                  />
                  <span className="capitalize font-medium text-sm text-[var(--ink)]">{day}</span>
                </div>
                {data.isOpen ? (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="time" 
                      value={data.openTime} 
                      onChange={e => {
                        const newSchedule = {...content.schedule};
                        newSchedule[day].openTime = e.target.value;
                        setContent({...content, schedule: newSchedule});
                      }}
                      className="p-1 border border-slate-300 rounded text-sm"
                    />
                    <span>-</span>
                    <input 
                      type="time" 
                      value={data.closeTime} 
                      onChange={e => {
                        const newSchedule = {...content.schedule};
                        newSchedule[day].closeTime = e.target.value;
                        setContent({...content, schedule: newSchedule});
                      }}
                      className="p-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-[var(--muted)]">Kapalı</span>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return (
          <p className="text-sm text-slate-500">Bu blok tipi için düzenleyici henüz hazır değil.</p>
        );
    }
  };

  if (!block) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-[var(--ink)]">Bloğu Düzenle</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1">
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1 text-[var(--ink)]">Blok Başlığı</label>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg font-semibold"
              placeholder="Örn: Hakkımda"
            />
          </div>
          
          <h3 className="font-medium text-[var(--ink)] mb-3">İçerik</h3>
          {renderContentEditor()}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
          <button onClick={onDelete} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition">
            Sil
          </button>
          <div className="space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">
              İptal
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-[var(--coral)] text-white font-medium rounded-lg hover:bg-orange-600 shadow-sm transition">
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
