'use client';

import { useState, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { X, Save, Download, LayoutTemplate, Palette, Type } from 'lucide-react';
import { type CharacterShot } from '../config/characters';
import { STUDIO_TEMPLATES, type StudioTemplate, type TemplateLayer } from '../config/studioTemplates';
import { exportStudioCanvas } from '../utils/studioImageRenderer';
import { downloadBlob } from '../utils/imageOverlay';

type Props = {
  shot: CharacterShot;
  onClose: () => void;
  onSaved?: (shot: CharacterShot) => void;
};

export default function StudioOverlayEditor({ shot, onClose, onSaved }: Props) {
  const [layers, setLayers] = useState<TemplateLayer[]>(STUDIO_TEMPLATES[0].layers);
  const [activeTemplate, setActiveTemplate] = useState<string>(STUDIO_TEMPLATES[0].id);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [busy, setBusy] = useState<boolean>(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await exportStudioCanvas(layers, shot.image_url);
      downloadBlob(blob, `${shot.character_id}-studio-${Date.now()}.png`);
    } catch (e) {
      console.error(e);
      alert('İndirme başarısız oldu.');
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = (template: StudioTemplate) => {
    setActiveTemplate(template.id);
    setLayers(template.layers);
    setSelectedLayerId(null);
  };

  const updateLayer = (id: string, updates: Partial<TemplateLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateLayerProperty = (id: string, key: string, value: any) => {
    setLayers(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, properties: { ...l.properties, [key]: value } };
      }
      return l;
    }));
  };

  const renderLayerContent = (layer: TemplateLayer) => {
    switch (layer.type) {
      case 'background':
        return <div style={{ width: '100%', height: '100%', backgroundColor: layer.properties.backgroundColor || '#14231F' }} />;
      case 'character':
        return (
          <img 
            src={shot.image_url} 
            alt="Character" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: layer.properties.borderRadius, border: layer.properties.border }} 
            draggable={false}
          />
        );
      case 'text':
      case 'subtitle':
        return (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            fontFamily: layer.properties.fontFamily, 
            fontSize: layer.properties.fontSize,
            color: layer.properties.color,
            backgroundColor: layer.properties.backgroundColor,
            textAlign: layer.properties.textAlign || 'left',
            fontWeight: layer.properties.fontWeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: layer.properties.textAlign === 'center' ? 'center' : 'flex-start',
            padding: '8px'
          }}>
            {layer.properties.text || (layer.type === 'subtitle' ? 'Altyazı buraya gelecek...' : 'Metin')}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Gelişmiş Stüdyo Editörü
            </h2>
            <p className="text-sm text-slate-500">
              Canva esnekliğinde katmanları yönetin, şablonları uygulayın.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownload}
              disabled={busy}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {busy ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Download className="w-4 h-4" />}
              İndir
            </button>
            <button className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg flex items-center gap-2 transition-colors">
              <Save className="w-4 h-4" />
              Kaydet
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar - Templates */}
          <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <LayoutTemplate className="w-4 h-4" /> Şablonlar
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {STUDIO_TEMPLATES.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${activeTemplate === t.id ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <div className="font-semibold text-slate-800 text-sm mb-1">{t.name}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-slate-100 flex items-center justify-center p-8 overflow-hidden relative">
            <div 
              ref={containerRef}
              className="bg-white shadow-xl relative"
              style={{ width: '400px', height: '711px' }} // 9:16 aspect ratio (Reels/TikTok)
              onClick={() => setSelectedLayerId(null)}
            >
              {layers.map(layer => {
                const isSelected = selectedLayerId === layer.id;
                
                // Parse percent values for Rnd fallback if needed, but Rnd accepts % strings
                
                return (
                  <Rnd
                    key={layer.id}
                    bounds="parent"
                    size={{ width: layer.width, height: layer.height }}
                    position={{ 
                      x: typeof layer.x === 'string' && layer.x.includes('%') ? (parseFloat(layer.x) / 100) * 400 : Number(layer.x), 
                      y: typeof layer.y === 'string' && layer.y.includes('%') ? (parseFloat(layer.y) / 100) * 711 : Number(layer.y) 
                    }}
                    onDragStop={(e, d) => {
                      updateLayer(layer.id, { x: d.x, y: d.y });
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateLayer(layer.id, {
                        width: ref.style.width,
                        height: ref.style.height,
                        ...position,
                      });
                    }}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                    }}
                    style={{ zIndex: layer.zIndex }}
                    className={`${isSelected ? 'ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : ''}`}
                    enableResizing={isSelected}
                    disableDragging={!isSelected}
                  >
                    {renderLayerContent(layer)}
                  </Rnd>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              Özellikler
            </h3>
            
            {!selectedLayerId ? (
              <div className="text-sm text-slate-500 text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Düzenlemek için canvas üzerinden bir katman seçin.
              </div>
            ) : (
              <div className="space-y-6">
                {layers.filter(l => l.id === selectedLayerId).map(layer => (
                  <div key={layer.id} className="space-y-4">
                    <div className="px-3 py-2 bg-indigo-50 text-indigo-800 text-xs font-semibold rounded uppercase tracking-wide">
                      {layer.type} Katmanı
                    </div>
                    
                    {/* Size & Position */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Genişlik</label>
                        <input 
                          type="text" 
                          value={layer.width}
                          onChange={(e) => updateLayer(layer.id, { width: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Yükseklik</label>
                        <input 
                          type="text" 
                          value={layer.height}
                          onChange={(e) => updateLayer(layer.id, { height: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Common Properties based on Type */}
                    {(layer.type === 'background' || layer.type === 'subtitle') && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Arka Plan Rengi</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={layer.properties.backgroundColor || '#ffffff'}
                            onChange={(e) => updateLayerProperty(layer.id, 'backgroundColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                          />
                          <input 
                            type="text" 
                            value={layer.properties.backgroundColor || ''}
                            onChange={(e) => updateLayerProperty(layer.id, 'backgroundColor', e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 uppercase"
                          />
                        </div>
                      </div>
                    )}

                    {(layer.type === 'text' || layer.type === 'subtitle') && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Metin</label>
                          <textarea 
                            value={layer.properties.text || ''}
                            onChange={(e) => updateLayerProperty(layer.id, 'text', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                            placeholder="Metni buraya girin..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Metin Rengi</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={layer.properties.color || '#000000'}
                              onChange={(e) => updateLayerProperty(layer.id, 'color', e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                            <input 
                              type="text" 
                              value={layer.properties.color || ''}
                              onChange={(e) => updateLayerProperty(layer.id, 'color', e.target.value)}
                              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 uppercase"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Yazı Tipi Boyutu</label>
                          <input 
                            type="text" 
                            value={layer.properties.fontSize || '24px'}
                            onChange={(e) => updateLayerProperty(layer.id, 'fontSize', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
