'use client';

import { useState, useEffect } from 'react';
import { Play, Edit2, Trash2, Wand2, Save, X, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

interface LeanCanvasData {
  problem: string[];
  existingAlternatives: string[];
  solution: string[];
  keyMetrics: string[];
  uniqueValueProposition: string;
  highLevelConcept: string;
  unfairAdvantage: string;
  channels: string[];
  customerSegments: string[];
  earlyAdopters: string[];
  costStructure: string[];
  revenueStreams: string[];
}

export default function LeanCanvasPage() {
  const [data, setData] = useState<Partial<LeanCanvasData>>({});
  const [loading, setLoading] = useState(false);
  const [fieldLoading, setFieldLoading] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/lean-canvas');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {}
  };

  const handleRunAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/lean-canvas', { method: 'POST' });
      if (!res.ok) throw new Error('Bir hata oluştu');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldAction = async (field: keyof LeanCanvasData, action: 'update' | 'regenerate', value?: any) => {
    setFieldLoading(field);
    try {
      const res = await fetch('/api/admin/lean-canvas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, action, value }),
      });
      if (!res.ok) throw new Error('Hata oluştu');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFieldLoading(null);
      setEditingField(null);
    }
  };

  const startEditing = (field: keyof LeanCanvasData, isArray: boolean) => {
    setEditingField(field);
    const val = data[field];
    if (isArray) {
      setEditValue(Array.isArray(val) ? val.join('\n') : '');
    } else {
      setEditValue((val as string) || '');
    }
  };

  const saveEdit = (field: keyof LeanCanvasData, isArray: boolean) => {
    let finalValue: any = editValue;
    if (isArray) {
      finalValue = editValue.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }
    handleFieldAction(field, 'update', finalValue);
  };

  const clearField = (field: keyof LeanCanvasData, isArray: boolean) => {
    if (window.confirm('Bu alanı temizlemek istediğinize emin misiniz?')) {
      handleFieldAction(field, 'update', isArray ? [] : '');
    }
  };

  const FieldBox = ({ 
    field, 
    title, 
    desc, 
    isArray = false 
  }: { 
    field: keyof LeanCanvasData, 
    title: string, 
    desc: string, 
    isArray?: boolean 
  }) => {
    const isEditing = editingField === field;
    const isLoading = fieldLoading === field;
    const val = data[field];
    const hasData = isArray ? (val as string[])?.length > 0 : !!val;

    return (
      <div className="p-4 flex-1 flex flex-col group relative">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">{title}</h3>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => handleFieldAction(field, 'regenerate')} title="Yapay Zeka ile Yeniden Oluştur" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition disabled:opacity-50" disabled={isLoading}>
              <Wand2 className="w-4 h-4" />
            </button>
            <button onClick={() => startEditing(field, isArray)} title="Düzenle" className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition disabled:opacity-50" disabled={isLoading}>
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => clearField(field, isArray)} title="Temizle" className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition disabled:opacity-50" disabled={isLoading}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : null}

          {isEditing ? (
            <div className="flex flex-col gap-2 h-full">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full h-full min-h-[100px] border border-blue-300 focus:ring-2 focus:ring-blue-500 rounded-md p-2 text-sm text-slate-800 outline-none resize-none"
                placeholder={isArray ? "Her satıra bir madde yazın" : "Metni girin"}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingField(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">
                  İptal
                </button>
                <button onClick={() => saveEdit(field, isArray)} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> Kaydet
                </button>
              </div>
            </div>
          ) : hasData ? (
            isArray ? (
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                {(val as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{val as string}</p>
            )
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg p-4">
              <p className="text-xs text-slate-400 text-center">İçerik boş.<br/>Oluşturmak için butonları kullanın.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Yalın Kanvas</h1>
          <p className="text-slate-500 mt-1">Sürekli Gelişim</p>
        </div>
        <button
          onClick={handleRunAll}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-50 shadow-sm"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          <span>{loading ? 'Kanvası Oluşturuluyor...' : 'Tüm Kanvası Doldur'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 flex justify-between items-start">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Lean Canvas Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Top Section: 5 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200 lg:min-h-[450px]">
          
          <div className="flex flex-col divide-y divide-slate-200">
            <FieldBox field="problem" title="Sorun" desc="Müşterilerinizin en büyük 3 sorununu yazın" isArray />
            <FieldBox field="existingAlternatives" title="Mevcut Alternatifler" desc="Bu sorunların bugün nasıl çözüldüğünü listeleyin" isArray />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <FieldBox field="solution" title="Çözüm" desc="Her sorun için olası çözümleri ana hatlarıyla yazın" isArray />
            <FieldBox field="keyMetrics" title="Önemli Metrikler" desc="İşin bugün nasıl olduğunu ifade eden önemli sayıları listeleyin" isArray />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <FieldBox field="uniqueValueProposition" title="Benzersiz Değer Teklifi" desc="Habersiz bir ziyaretçiyi ilgili bir müşteriye dönüştürecek sade, açık ve ikna edici mesaj" />
            <FieldBox field="highLevelConcept" title="Üst Düzey Konsept" desc="X için Y analojilerini listeleyin" />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <FieldBox field="unfairAdvantage" title="Haksız Avantaj" desc="Kolaylıkla kopyalanamayacak ya da satın alınamayacak bir şey" />
            <FieldBox field="channels" title="Kanallar" desc="Müşterilerinize ulaşma yollarınızı listeleyin" isArray />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <FieldBox field="customerSegments" title="Müşteri Segmentleri" desc="Hedef müşterilerinizi ve kullanıcılarınızı listeleyin" isArray />
            <FieldBox field="earlyAdopters" title="Erken Benimseyenler" desc="İdeal müşterinizin karakteristik özelliklerini listeleyin" isArray />
          </div>

        </div>

        {/* Bottom Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-[200px]">
          <FieldBox field="costStructure" title="Maliyet Yapısı" desc="Sabit ve değişken maliyetlerinizi listeleyin" isArray />
          <FieldBox field="revenueStreams" title="Gelir Kalemleri" desc="Gelir kaynaklarınızı listeleyin" isArray />
        </div>
      </div>
    </AdminLayout>
  );
}
