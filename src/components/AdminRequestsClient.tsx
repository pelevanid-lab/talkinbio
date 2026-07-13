'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X, Trash2, Send } from 'lucide-react';

export default function AdminRequestsClient({ initialPending, initialProcessed }: { initialPending: any[], initialProcessed: any[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [processed, setProcessed] = useState(initialProcessed);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/requests/${id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error('Action failed');
      
      const target = pending.find(r => r.id === id);
      setPending(pending.filter(r => r.id !== id));
      
      if (target) {
        setProcessed([{ ...target, status: action === 'approve' ? 'approved' : 'rejected' }, ...processed]);
      }
      
      router.refresh();
    } catch (err) {
      alert("İşlem başarısız oldu.");
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleProcessedAction = async (id: string, action: 'delete' | 'resend') => {
    if (action === 'delete' && !window.confirm('Bu kaydı ve ilgili tüm kullanıcı/işletme verilerini silmek istediğinize emin misiniz?')) {
      return;
    }
    
    setLoadingId(id + action);
    try {
      const url = action === 'delete' 
        ? `/api/admin/requests/${id}` 
        : `/api/admin/requests/${id}/resend`;
        
      const res = await fetch(url, { method: action === 'delete' ? 'DELETE' : 'POST' });
      if (!res.ok) throw new Error('Action failed');
      
      if (action === 'delete') {
        setProcessed(processed.filter(r => r.id !== id));
      } else {
        alert('Giriş linki başarıyla tekrar gönderildi!');
      }
      
      router.refresh();
    } catch (err) {
      alert("İşlem başarısız oldu.");
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Bekleyen Talepler ({pending.length})</h2>
        </div>
        
        {pending.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Bekleyen onay talebi bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map(req => (
              <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{req.name}</h3>
                  <p className="text-slate-500">{req.email}</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">Kategori: {req.category || 'Belirtilmedi'}</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md">
                      İletişim: {Object.keys(req.contacts).filter(k => req.contacts[k].selected).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAction(req.id, 'reject')}
                    disabled={loadingId !== null}
                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center font-medium transition disabled:opacity-50"
                  >
                    {loadingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" /> Reddet</>}
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, 'approve')}
                    disabled={loadingId !== null}
                    className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg flex items-center font-medium transition disabled:opacity-50"
                  >
                    {loadingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Onayla & Link Gönder</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Son İşlemler</h2>
        </div>
        
        {processed.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Henüz tamamlanmış işlem yok.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {processed.map(req => (
              <div key={req.id} className="p-4 px-6 flex justify-between items-center opacity-70">
                <div>
                  <h3 className="font-medium text-slate-900">{req.name}</h3>
                  <p className="text-sm text-slate-500">{req.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {req.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                  </span>
                  
                  <div className="flex gap-2">
                    {req.status === 'approved' && (
                      <button 
                        onClick={() => handleProcessedAction(req.id, 'resend')}
                        disabled={loadingId !== null}
                        title="Tekrar Link Gönder"
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                      >
                        {loadingId === req.id + 'resend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    )}
                    <button 
                      onClick={() => handleProcessedAction(req.id, 'delete')}
                      disabled={loadingId !== null}
                      title="Sil"
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                    >
                      {loadingId === req.id + 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
