import { type TemplateLayer } from '@/config/studioTemplates';
import { loadImage } from './imageOverlay';

export async function exportStudioCanvas(layers: TemplateLayer[], shotImageUrl: string, width = 1080, height = 1920): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context oluşturulamadı');

  // Arka planı temizle
  ctx.clearRect(0, 0, width, height);

  // Layers'ı zIndex'e göre sırala
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sortedLayers) {
    const x = typeof layer.x === 'string' && layer.x.includes('%') ? (parseFloat(layer.x) / 100) * width : Number(layer.x) * (width / 400); // 400 is UI preview width
    const y = typeof layer.y === 'string' && layer.y.includes('%') ? (parseFloat(layer.y) / 100) * height : Number(layer.y) * (height / 711); // 711 is UI preview height
    const w = typeof layer.width === 'string' && layer.width.includes('%') ? (parseFloat(layer.width) / 100) * width : Number(layer.width) * (width / 400);
    const h = typeof layer.height === 'string' && layer.height.includes('%') ? (parseFloat(layer.height) / 100) * height : Number(layer.height) * (height / 711);

    ctx.save();

    if (layer.type === 'background') {
      ctx.fillStyle = layer.properties.backgroundColor || '#14231F';
      ctx.fillRect(x, y, w, h);
    } else if (layer.type === 'character') {
      try {
        const img = await loadImage(shotImageUrl);
        
        // Handle border radius (circle)
        if (layer.properties.borderRadius === '50%') {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        }
        
        ctx.drawImage(img, x, y, w, h);
        
        // Handle border
        if (layer.properties.border) {
          const borderParts = layer.properties.border.split(' ');
          if (borderParts.length >= 3) {
            ctx.lineWidth = parseInt(borderParts[0]);
            ctx.strokeStyle = borderParts[2];
            if (layer.properties.borderRadius === '50%') {
              ctx.beginPath();
              ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, w, h);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load character image for export', e);
      }
    } else if (layer.type === 'text' || layer.type === 'subtitle') {
      if (layer.properties.backgroundColor) {
        ctx.fillStyle = layer.properties.backgroundColor;
        ctx.fillRect(x, y, w, h);
      }

      const text = layer.properties.text || (layer.type === 'subtitle' ? 'Altyazı buraya gelecek...' : 'Metin');
      const fontSizePreview = typeof layer.properties.fontSize === 'string' ? parseFloat(layer.properties.fontSize) : 24;
      const fontSizeExport = fontSizePreview * (width / 400); // Scale font size
      
      ctx.font = `${layer.properties.fontWeight || 'normal'} ${fontSizeExport}px ${layer.properties.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = layer.properties.color || '#000000';
      ctx.textAlign = layer.properties.textAlign === 'center' ? 'center' : 'left';
      ctx.textBaseline = 'middle';
      
      const textX = layer.properties.textAlign === 'center' ? x + w / 2 : x + 16; // Add some padding
      const textY = y + h / 2;
      
      ctx.fillText(text, textX, textY);
    }

    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Export failed'));
    }, 'image/png', 0.9);
  });
}
