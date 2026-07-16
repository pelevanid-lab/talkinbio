'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
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
  const [data, setData] = useState<LeanCanvasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/lean-canvas', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Bir hata oluştu');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderList = (items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
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
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          <span>{loading ? 'Çalıştırılıyor...' : 'Çalıştır'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
          {error}
        </div>
      )}

      {/* Lean Canvas Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Top Section: 5 Columns */}
        <div className="grid grid-cols-5 divide-x divide-slate-200 border-b border-slate-200 min-h-[400px]">
          
          {/* Column 1: Problem & Alternatives */}
          <div className="flex flex-col divide-y divide-slate-200">
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Sorun</h3>
              <p className="text-xs text-slate-500 mb-2">Müşterilerinizin en büyük 3 sorununu yazın</p>
              {data && renderList(data.problem)}
            </div>
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Mevcut Alternatifler</h3>
              <p className="text-xs text-slate-500 mb-2">Bu sorunların bugün nasıl çözüldüğünü listeleyin</p>
              {data && renderList(data.existingAlternatives)}
            </div>
          </div>

          {/* Column 2: Solution & Key Metrics */}
          <div className="flex flex-col divide-y divide-slate-200">
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Çözüm</h3>
              <p className="text-xs text-slate-500 mb-2">Her sorun için olası çözümleri ana hatlarıyla yazın</p>
              {data && renderList(data.solution)}
            </div>
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Önemli Metrikler</h3>
              <p className="text-xs text-slate-500 mb-2">İşin bugün nasıl olduğunu ifade eden önemli sayıları listeleyin</p>
              {data && renderList(data.keyMetrics)}
            </div>
          </div>

          {/* Column 3: UVP & Concept */}
          <div className="flex flex-col divide-y divide-slate-200">
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Benzersiz Değer Teklifi</h3>
              <p className="text-xs text-slate-500 mb-2">Habersiz bir ziyaretçiyi ilgili bir müşteriye dönüştürecek sade, açık ve ikna edici bir mesaj</p>
              {data && <p className="text-sm text-slate-700 mt-2">{data.uniqueValueProposition}</p>}
            </div>
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Üst düzey konsept</h3>
              <p className="text-xs text-slate-500 mb-2">X için Y analojilerini listeleyin</p>
              {data && <p className="text-sm text-slate-700 mt-2">{data.highLevelConcept}</p>}
            </div>
          </div>

          {/* Column 4: Unfair Advantage & Channels */}
          <div className="flex flex-col divide-y divide-slate-200">
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Haksız Avantaj</h3>
              <p className="text-xs text-slate-500 mb-2">Kolaylıkla kopyalanamayacak ya da satın alınamayacak bir şey</p>
              {data && <p className="text-sm text-slate-700 mt-2">{data.unfairAdvantage}</p>}
            </div>
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Kanallar</h3>
              <p className="text-xs text-slate-500 mb-2">Müşterilerinize ulaşma yollarınızı listeleyin</p>
              {data && renderList(data.channels)}
            </div>
          </div>

          {/* Column 5: Customer Segments & Early Adopters */}
          <div className="flex flex-col divide-y divide-slate-200">
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Müşteri Segmentleri</h3>
              <p className="text-xs text-slate-500 mb-2">Hedef müşterilerinizi ve kullanıcılarınızı listeleyin</p>
              {data && renderList(data.customerSegments)}
            </div>
            <div className="p-4 flex-1">
              <h3 className="font-bold text-slate-900">Erken Benimseyenler</h3>
              <p className="text-xs text-slate-500 mb-2">İdeal müşterinizin karakteristik özelliklerini listeleyin</p>
              {data && renderList(data.earlyAdopters)}
            </div>
          </div>

        </div>

        {/* Bottom Section: 2 Columns */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 min-h-[150px]">
          <div className="p-4">
            <h3 className="font-bold text-slate-900">Maliyet Yapısı</h3>
            <p className="text-xs text-slate-500 mb-2">Sabit ve değişken maliyetlerinizi listeleyin</p>
            {data && renderList(data.costStructure)}
          </div>
          <div className="p-4">
            <h3 className="font-bold text-slate-900">Gelir Kalemleri</h3>
            <p className="text-xs text-slate-500 mb-2">Gelir kaynaklarınızı listeleyin</p>
            {data && renderList(data.revenueStreams)}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
