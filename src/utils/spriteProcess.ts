export function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cropCanvasToSpriteDataUrl(
  source: HTMLCanvasElement,
  maxSize = 256
): string | null {
  const w = source.width;
  const h = source.height;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx || w === 0 || h === 0) return null;

  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const pad = Math.max(8, Math.round(Math.max(maxX - minX, maxY - minY) * 0.08));
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const outW = Math.max(16, Math.round(sw * scale));
  const outH = Math.max(16, Math.round(sh * scale));

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d');
  if (!octx) return null;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);
  return out.toDataURL('image/png');
}

export function buildStickerCanvas(
  img: HTMLImageElement,
  outlinePx = 6,
  outlineColor = '#FFFDF8'
): HTMLCanvasElement {
  const pad = outlinePx + 3;
  const w = img.naturalWidth || img.width || 128;
  const h = img.naturalHeight || img.height || 128;

  // Build solid silhouette first
  const sil = document.createElement('canvas');
  sil.width = w;
  sil.height = h;
  const sctx = sil.getContext('2d');
  if (sctx) {
    sctx.drawImage(img, 0, 0, w, h);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = outlineColor;
    sctx.fillRect(0, 0, w, h);
  }

  const out = document.createElement('canvas');
  out.width = w + pad * 2;
  out.height = h + pad * 2;
  const ctx = out.getContext('2d');
  if (ctx) {
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.drawImage(
        sil,
        pad + Math.cos(a) * outlinePx,
        pad + Math.sin(a) * outlinePx
      );
    }
    ctx.drawImage(img, pad, pad, w, h);
  }
  return out;
}

export function buildTintedCanvas(
  img: HTMLImageElement,
  tintColor: string,
  tintAlpha: number
): HTMLCanvasElement {
  const w = img.naturalWidth || img.width || 128;
  const h = img.naturalHeight || img.height || 128;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  ctx.drawImage(img, 0, 0, w, h);
  if (tintAlpha > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tintColor;
    ctx.globalAlpha = tintAlpha;
    ctx.fillRect(0, 0, w, h);
  }
  return out;
}
