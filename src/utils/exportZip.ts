import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import JSZip from 'jszip';
import {
  AMBIANCE_OPTIONS,
  CURATED_DRAW_PALETTES,
  JAR_SHAPE_OPTIONS,
  LAYOUT_OPTIONS,
  THEMES,
} from '../data/themes';
import {
  AmbianceMode,
  CustomBicho,
  CustomDecor,
  JarShape,
  LayoutArchetype,
  MenuSketch,
  StyleOverrides,
  ThemeFeedback,
} from '../types';

export interface LabExportPayload {
  appVersion: string;
  activeThemeId: string;
  activeLayout: LayoutArchetype;
  activeJarShape: JarShape;
  activeAmbiance: AmbianceMode;
  activeDrawPaletteId: string;
  overridesByTheme: Record<string, StyleOverrides>;
  feedbackByTheme: Record<string, ThemeFeedback>;
  sketches: MenuSketch[];
  customBichos: CustomBicho[];
  customDecors: CustomDecor[];
  mossCount: number;
  globalNotes: string;
  pointerTypesSeen: string[];
}

export interface ExportResult {
  filename: string;
  mode: 'android-share' | 'web-download';
  savedUri?: string;
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'item'
  );
}

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function renderSketchToDataUrl(sketch: MenuSketch, width = 900): string {
  const aspect = sketch.aspect || 0.62;
  const height = Math.round(width / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FAF5E9';
  ctx.fillRect(0, 0, width, height);

  drawSketchTemplateGhost(ctx, sketch.template, width, height);

  for (const stroke of sketch.strokes) {
    if (stroke.points.length === 0) continue;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.strokeStyle = '#FAF5E9';
      ctx.globalAlpha = 1;
    } else if (stroke.tool === 'highlighter') {
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.34;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.96;
    }

    const baseWidth = (stroke.size / 400) * width * (stroke.tool === 'highlighter' ? 2.6 : 1);

    if (stroke.points.length === 1) {
      const pt = stroke.points[0];
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, Math.max(1.5, baseWidth * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i];
        const midX = ((p0.x + p1.x) * 0.5) * width;
        const midY = ((p0.y + p1.y) * 0.5) * height;
        const prevMidX =
          i === 1 ? p0.x * width : ((stroke.points[i - 2].x + p0.x) * 0.5) * width;
        const prevMidY =
          i === 1 ? p0.y * height : ((stroke.points[i - 2].y + p0.y) * 0.5) * height;
        const pressure = Math.max(0.35, Math.min(1.55, (p0.p + p1.p) * 0.5 || 0.75));
        ctx.lineWidth = Math.max(1.5, baseWidth * pressure);
        ctx.beginPath();
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p0.x * width, p0.y * height, midX, midY);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(58, 46, 40, 0.65)';
  ctx.font = `600 ${Math.round(width * 0.022)}px sans-serif`;
  ctx.fillText(
    `Bichario Lab 1.1 Sketch — "${sketch.title}" (template: ${sketch.template})`,
    Math.round(width * 0.03),
    height - Math.round(width * 0.025)
  );

  return canvas.toDataURL('image/png');
}

export function drawSketchTemplateGhost(
  ctx: CanvasRenderingContext2D,
  template: MenuSketch['template'],
  w: number,
  h: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(110, 96, 84, 0.24)';
  ctx.fillStyle = 'rgba(110, 96, 84, 0.16)';
  ctx.lineWidth = Math.max(1.5, w * 0.003);

  if (template === 'grid') {
    const step = Math.max(18, Math.round(w / 18));
    for (let y = step; y < h; y += step) {
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, w * 0.0022), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  if (template === 'blank') {
    ctx.restore();
    return;
  }

  ctx.setLineDash([w * 0.015, w * 0.012]);
  ctx.strokeRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
  ctx.setLineDash([]);

  if (template === 'terrarium') {
    const jx = w * 0.14;
    const jy = h * 0.18;
    const jw = w * 0.72;
    const jh = h * 0.62;
    ctx.beginPath();
    ctx.roundRect(jx, jy, jw, jh, w * 0.12);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(w * 0.34, h * 0.125, w * 0.32, h * 0.055, w * 0.03);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(jx + w * 0.02, jy + jh * 0.72);
    ctx.quadraticCurveTo(w * 0.5, jy + jh * 0.6, jx + jw - w * 0.02, jy + jh * 0.74);
    ctx.stroke();

    ctx.font = `600 ${Math.round(w * 0.032)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TERRARIUM JAR AREA', w * 0.5, h * 0.48);
    ctx.font = `500 ${Math.round(w * 0.024)}px sans-serif`;
    ctx.fillText('scribble where buttons, badges & drawers should go!', w * 0.5, h * 0.53);
  } else if (template === 'draw') {
    ctx.beginPath();
    ctx.roundRect(w * 0.09, h * 0.14, w * 0.82, h * 0.56, w * 0.05);
    ctx.stroke();
    ctx.font = `600 ${Math.round(w * 0.032)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BICHO DRAWING CANVAS', w * 0.5, h * 0.41);
    ctx.font = `500 ${Math.round(w * 0.024)}px sans-serif`;
    ctx.fillText('sketch your dream brush bar, colors & undo placement', w * 0.5, h * 0.46);
  } else if (template === 'bichodex') {
    const cols = 2;
    const rows = 3;
    const padX = w * 0.1;
    const gap = w * 0.05;
    const cardW = (w - padX * 2 - gap) / cols;
    const cardH = h * 0.19;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        ctx.roundRect(
          padX + c * (cardW + gap),
          h * 0.16 + r * (cardH + h * 0.03),
          cardW,
          cardH,
          w * 0.04
        );
        ctx.stroke();
      }
    }
    ctx.font = `600 ${Math.round(w * 0.03)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BICHODEX / FIELD GUIDE', w * 0.5, h * 0.11);
  }

  ctx.restore();
}

function buildFeedbackMarkdown(payload: LabExportPayload, exportedAt: string): string {
  const activeTheme = THEMES.find((t) => t.id === payload.activeThemeId);
  const activeLayout = LAYOUT_OPTIONS.find((l) => l.id === payload.activeLayout);
  const activeJar = JAR_SHAPE_OPTIONS.find((j) => j.id === payload.activeJarShape);
  const activeAmb = AMBIANCE_OPTIONS.find((a) => a.id === payload.activeAmbiance);
  const activePalette = CURATED_DRAW_PALETTES.find((p) => p.id === payload.activeDrawPaletteId);

  const lines: string[] = [
    `# Bichario Lab 1.1 — Exported Feedback & Creations`,
    ``,
    `- **Exported:** ${exportedAt}`,
    `- **App Version:** ${payload.appVersion}`,
    `- **Selected Theme:** ${activeTheme?.name ?? payload.activeThemeId} (\`${payload.activeThemeId}\`)`,
    `- **Selected Jar Shape:** ${activeJar?.name ?? payload.activeJarShape} (\`${payload.activeJarShape}\`)`,
    `- **Selected Ambiance:** ${activeAmb?.label ?? payload.activeAmbiance}`,
    `- **Selected Menu Layout:** ${activeLayout?.name ?? payload.activeLayout} (\`${payload.activeLayout}\`)`,
    `- **Selected Drawing Palette:** ${activePalette?.name ?? payload.activeDrawPaletteId}`,
    `- **Custom Drawn Bichos:** ${payload.customBichos.length}`,
    `- **Custom Drawn Plants/Rocks:** ${payload.customDecors.length}`,
    `- **Painted Moss Tufts:** ${payload.mossCount}`,
    `- **Menu Sketches Included:** ${payload.sketches.length}`,
    `- **Pointer Types Observed:** ${payload.pointerTypesSeen.length ? payload.pointerTypesSeen.join(', ') : 'none yet'}`,
    ``,
    `## Global Notes`,
    payload.globalNotes.trim() ? payload.globalNotes.trim() : `_No global notes entered._`,
    ``,
  ];

  if (payload.customBichos.length > 0) {
    lines.push(`## Hand-Drawn Bichos`);
    payload.customBichos.forEach((b, i) => {
      lines.push(
        `${i + 1}. **${b.name}** by ${b.creator} — movement: \`${b.movement}\`, status: \`${b.status}\`, scale: ${b.scale}`
      );
    });
    lines.push('');
  }

  if (payload.customDecors.length > 0) {
    lines.push(`## Hand-Drawn Plants & Rocks`);
    payload.customDecors.forEach((d, i) => {
      lines.push(
        `${i + 1}. **${d.name}** (${d.kind}) by ${d.creator} — smartExpand: ${d.smartExpand}, inJar: ${d.inJar}`
      );
    });
    lines.push('');
  }

  lines.push(`## Theme Ratings & Notes`);
  for (const theme of THEMES) {
    const fb = payload.feedbackByTheme[theme.id];
    const ov = payload.overridesByTheme[theme.id];
    const stars = fb?.stars ? '★'.repeat(fb.stars) + '☆'.repeat(5 - fb.stars) : 'unrated';
    const fav = fb?.favorite ? ' ❤️ FAVORITE' : '';
    lines.push(`### ${theme.name} (${theme.subtitle}) — ${stars}${fav}`);
    if (fb?.note?.trim()) {
      lines.push(`> ${fb.note.trim()}`);
    }
    if (ov) {
      lines.push(
        `- Tweaks: radius=${ov.radius}px, border=${ov.borderWidth}px, shadow=${ov.shadowStyle}, texture=${ov.texture}, scale=${ov.comfortScale}, squish=${ov.squish}, organic=${ov.organicRadius}`
      );
      const customEntries = Object.entries(ov.customColors).filter(([, v]) => Boolean(v));
      if (customEntries.length) {
        lines.push(
          `- Custom colors: ${customEntries.map(([k, v]) => `${k}=${v}`).join(', ')}`
        );
      }
    }
    lines.push('');
  }

  if (payload.sketches.length > 0) {
    lines.push(`## Hand-Scribbled Menu Sketches`);
    payload.sketches.forEach((sk, i) => {
      lines.push(
        `${i + 1}. **${sk.title}** (\`sketches/sketch-${String(i + 1).padStart(2, '0')}-${slugify(sk.title)}.png\`) — template: \`${sk.template}\`${sk.note ? ` — Note: ${sk.note}` : ''}`
      );
    });
  }

  return lines.join('\n');
}

export async function exportLabZip(payload: LabExportPayload): Promise<ExportResult> {
  const now = new Date();
  const stamp = formatTimestamp(now);
  const filename = `bichario-lab1.1-${stamp}.zip`;
  const exportedAt = now.toISOString();

  const zip = new JSZip();

  const manifest = {
    schemaVersion: 2,
    lab: 'lab-1.1-arena-draw-jars-scribbler',
    appVersion: payload.appVersion,
    exportedAt,
    device: {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio,
      },
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      pointerTypesSeen: payload.pointerTypesSeen,
    },
    selections: {
      activeThemeId: payload.activeThemeId,
      activeLayout: payload.activeLayout,
      activeJarShape: payload.activeJarShape,
      activeAmbiance: payload.activeAmbiance,
      activeDrawPaletteId: payload.activeDrawPaletteId,
      activeOverrides: payload.overridesByTheme[payload.activeThemeId] ?? null,
    },
    overridesByTheme: payload.overridesByTheme,
    feedbackByTheme: payload.feedbackByTheme,
    globalNotes: payload.globalNotes,
    counts: {
      sketches: payload.sketches.length,
      customBichos: payload.customBichos.length,
      customDecors: payload.customDecors.length,
      mossBlobs: payload.mossCount,
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('feedback.md', buildFeedbackMarkdown(payload, exportedAt));

  if (payload.customBichos.length > 0) {
    const folder = zip.folder('bichos');
    const meta = payload.customBichos.map((b, idx) => {
      const pngName = `bicho-${String(idx + 1).padStart(2, '0')}-${slugify(b.name)}.png`;
      if (folder && b.spriteDataUrl) {
        folder.file(pngName, dataUrlToBase64(b.spriteDataUrl), { base64: true });
      }
      return {
        file: pngName,
        name: b.name,
        creator: b.creator,
        movement: b.movement,
        status: b.status,
        scale: b.scale,
        stickerOutline: b.stickerOutline,
        birthday: b.birthday,
      };
    });
    folder?.file('bichos-meta.json', JSON.stringify(meta, null, 2));
  }

  if (payload.customDecors.length > 0) {
    const folder = zip.folder('decor');
    const meta = payload.customDecors.map((d, idx) => {
      const pngName = `${d.kind}-${String(idx + 1).padStart(2, '0')}-${slugify(d.name)}.png`;
      if (folder && d.spriteDataUrl) {
        folder.file(pngName, dataUrlToBase64(d.spriteDataUrl), { base64: true });
      }
      return {
        file: pngName,
        kind: d.kind,
        name: d.name,
        creator: d.creator,
        smartExpand: d.smartExpand,
        inJar: d.inJar,
      };
    });
    folder?.file('decor-meta.json', JSON.stringify(meta, null, 2));
  }

  if (payload.sketches.length > 0) {
    const sketchFolder = zip.folder('sketches');
    const meta = payload.sketches.map((sk, idx) => {
      const pngName = `sketch-${String(idx + 1).padStart(2, '0')}-${slugify(sk.title)}.png`;
      const pngUrl = renderSketchToDataUrl(sk, 1080);
      if (sketchFolder && pngUrl) {
        sketchFolder.file(pngName, dataUrlToBase64(pngUrl), { base64: true });
      }
      return {
        file: pngName,
        id: sk.id,
        title: sk.title,
        note: sk.note,
        template: sk.template,
        strokeCount: sk.strokes.length,
        updatedAt: sk.updatedAt,
      };
    });
    sketchFolder?.file('sketches-meta.json', JSON.stringify(meta, null, 2));
  }

  if (Capacitor.isNativePlatform()) {
    const base64Zip = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64Zip,
      directory: Directory.Cache,
    });

    await Share.share({
      title: 'Bichario Lab 1.1 Export',
      text: 'My Bichario UI preferences, drawn bichos, jar picks & menu sketches!',
      url: written.uri,
      dialogTitle: 'Save or share Bichario Lab 1.1 ZIP',
    });

    return {
      filename,
      mode: 'android-share',
      savedUri: written.uri,
    };
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return {
    filename,
    mode: 'web-download',
  };
}
