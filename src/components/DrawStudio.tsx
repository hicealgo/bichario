import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CURATED_DRAW_PALETTES,
  MOVEMENT_OPTIONS,
  RANDOM_BICHO_NAMES,
  RANDOM_PLANT_NAMES,
  RANDOM_ROCK_NAMES,
} from '../data/themes';
import {
  CustomBicho,
  CustomDecor,
  DrawEntityKind,
  MovementStyle,
} from '../types';
import { cozyTap } from '../utils/haptics';
import { cropCanvasToSpriteDataUrl } from '../utils/spriteProcess';
import {
  BrushIcon,
  EraserIcon,
  MirrorIcon,
  MossLeafIcon,
  RedoIcon,
  RockIcon,
  SparkleIcon,
  UndoIcon,
} from './Icons';

type DrawBrush = 'crayon' | 'ink' | 'marker' | 'glow' | 'eraser';

interface DrawStroke {
  brush: DrawBrush;
  color: string;
  size: number;
  mirror: boolean;
  points: { x: number; y: number; p: number }[];
}

interface DrawStudioProps {
  drawPaletteId: string;
  lastCreator: string;
  onChangeDrawPalette: (id: string) => void;
  onSaveBicho: (bicho: CustomBicho) => void;
  onSaveDecor: (decor: CustomDecor) => void;
  onBackToJar: () => void;
  onPointerSeen: (pt: string) => void;
}

const BRUSH_SIZES = [
  { id: 's', label: 'S', value: 5.5 },
  { id: 'm', label: 'M', value: 11 },
  { id: 'l', label: 'L', value: 20 },
];

function formatShortDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

export const DrawStudio: React.FC<DrawStudioProps> = ({
  drawPaletteId,
  lastCreator,
  onChangeDrawPalette,
  onSaveBicho,
  onSaveDecor,
  onBackToJar,
  onPointerSeen,
}) => {
  const palette =
    CURATED_DRAW_PALETTES.find((p) => p.id === drawPaletteId) ??
    CURATED_DRAW_PALETTES[0];

  const [entityKind, setEntityKind] = useState<DrawEntityKind>('bicho');
  const [brush, setBrush] = useState<DrawBrush>('crayon');
  const [color, setColor] = useState<string>(palette.colors[2].hex);
  const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZES[1].value);
  const [mirrorOn, setMirrorOn] = useState<boolean>(false);
  const [stickerOn, setStickerOn] = useState<boolean>(true);
  const [proOpen, setProOpen] = useState<boolean>(false);

  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [redoStack, setRedoStack] = useState<DrawStroke[]>([]);

  // Save/Name modal step
  const [saveOpen, setSaveOpen] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');
  const [creatorName, setCreatorName] = useState<string>(lastCreator || 'Familia');
  const [movement, setMovement] = useState<MovementStyle>('crawler');
  const [bichoScale, setBichoScale] = useState<number>(1);
  const [smartExpand, setSmartExpand] = useState<boolean>(true);
  const [emptyWarn, setEmptyWarn] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveStrokeRef = useRef<DrawStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePenDownRef = useRef<boolean>(false);
  const lastPtRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // Keep active color valid if palette changes
  useEffect(() => {
    if (!palette.colors.some((c) => c.hex === color)) {
      setColor(palette.colors[2].hex);
    }
  }, [palette, color]);

  const drawSinglePath = (
    ctx: CanvasRenderingContext2D,
    stroke: DrawStroke,
    w: number,
    h: number,
    flipX: boolean
  ) => {
    const pts = stroke.points;
    if (pts.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const px = (x: number) => (flipX ? (1 - x) * w : x * w);
    const py = (y: number) => y * h;
    const baseW = (stroke.size / 360) * Math.min(w, h);

    if (stroke.brush === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else if (stroke.brush === 'marker') {
      ctx.globalAlpha = 0.52;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
    } else if (stroke.brush === 'glow') {
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = Math.max(8, baseW * 1.35);
      ctx.globalAlpha = 0.92;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = 0.98;
    }

    if (stroke.brush === 'crayon') {
      // Textured waxy crayon grain along interpolated steps
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p0 = i === 0 ? p1 : pts[i - 1];
        const x0 = px(p0.x);
        const y0 = py(p0.y);
        const x1 = px(p1.x);
        const y1 = py(p1.y);
        const dist = Math.hypot(x1 - x0, y1 - y0);
        const radius = Math.max(2, baseW * 0.62 * (p1.p || 0.85));
        const steps = Math.max(1, Math.ceil(dist / Math.max(1.5, radius * 0.35)));

        for (let s = 0; s <= steps; s++) {
          const t = steps === 0 ? 0 : s / steps;
          const cx = x0 + (x1 - x0) * t;
          const cy = y0 + (y1 - y0) * t;

          // Core waxy body
          ctx.globalAlpha = 0.42;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
          ctx.fill();

          // Deterministic organic crayon grain speckles
          ctx.globalAlpha = 0.72;
          for (let g = 0; g < 6; g++) {
            const hash = Math.sin((cx * 12.9898 + cy * 78.233 + g * 37.7) * 1.1) * 43758.5453;
            const frac1 = hash - Math.floor(hash);
            const hash2 = Math.sin((cx * 39.346 + cy * 11.135 + g * 91.3) * 1.3) * 24634.6345;
            const frac2 = hash2 - Math.floor(hash2);
            const angle = frac1 * Math.PI * 2;
            const rad = Math.sqrt(frac2) * radius * 1.05;
            ctx.beginPath();
            ctx.arc(
              cx + Math.cos(angle) * rad,
              cy + Math.sin(angle) * rad,
              Math.max(1.1, radius * 0.24),
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
      ctx.restore();
      return;
    }

    const widthMult = stroke.brush === 'marker' ? 1.85 : stroke.brush === 'eraser' ? 1.8 : 1;

    if (pts.length === 1) {
      const p0 = pts[0];
      ctx.beginPath();
      ctx.arc(px(p0.x), py(p0.y), Math.max(2, baseW * widthMult * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const midX = (px(p0.x) + px(p1.x)) * 0.5;
        const midY = (py(p0.y) + py(p1.y)) * 0.5;
        const prevMidX =
          i === 1 ? px(p0.x) : (px(pts[i - 2].x) + px(p0.x)) * 0.5;
        const prevMidY =
          i === 1 ? py(p0.y) : (py(pts[i - 2].y) + py(p0.y)) * 0.5;

        const pressure = Math.max(0.4, Math.min(1.5, (p0.p + p1.p) * 0.5 || 0.85));
        ctx.lineWidth = Math.max(2, baseW * widthMult * pressure);
        ctx.beginPath();
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(px(p0.x), py(p0.y), midX, midY);
        ctx.stroke();
      }
    }

    // Little sparkle dots for glow brush
    if (stroke.brush === 'glow') {
      ctx.fillStyle = '#FFFDF5';
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < pts.length; i += 6) {
        const pt = pts[i];
        ctx.beginPath();
        ctx.arc(px(pt.x), py(pt.y), Math.max(1.4, baseW * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const redraw = useCallback(
    (extra?: DrawStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const all = extra ? [...strokes, extra] : strokes;
      for (const s of all) {
        drawSinglePath(ctx, s, w, h, false);
        if (s.mirror) {
          drawSinglePath(ctx, s, w, h, true);
        }
      }
    },
    [strokes]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      redraw(liveStrokeRef.current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw(liveStrokeRef.current);
  }, [redraw]);

  const readPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5, p: 0.85 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));

    let p = 0.85;
    if (e.pointerType === 'pen' && e.pressure > 0) {
      p = 0.35 + Math.pow(e.pressure, 0.82) * 1.15;
    } else if (lastPtRef.current) {
      const dt = Math.max(8, performance.now() - lastPtRef.current.t);
      const dist = Math.hypot(x - lastPtRef.current.x, y - lastPtRef.current.y);
      const speed = dist / dt;
      p = Math.max(0.62, Math.min(1.08, 1.02 - speed * 85));
    }
    lastPtRef.current = { x, y, t: performance.now() };
    return { x, y, p };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    onPointerSeen(e.pointerType || 'unknown');
    if (e.pointerType === 'pen') {
      activePenDownRef.current = true;
    } else if (activePenDownRef.current && e.pointerType === 'touch') {
      return;
    }
    if (activePointerIdRef.current !== null) return;

    setEmptyWarn(false);
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    lastPtRef.current = null;
    const pt = readPoint(e);
    const stroke: DrawStroke = {
      brush,
      color,
      size: brushSize,
      mirror: mirrorOn,
      points: [pt],
    };
    liveStrokeRef.current = stroke;
    redraw(stroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !liveStrokeRef.current) return;
    const pt = readPoint(e);
    const pts = liveStrokeRef.current.points;
    const prev = pts[pts.length - 1];
    if (prev && Math.hypot(pt.x - prev.x, pt.y - prev.y) < 0.003) return;
    pts.push(pt);
    redraw(liveStrokeRef.current);
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') {
      activePenDownRef.current = false;
    }
    if (activePointerIdRef.current !== e.pointerId || !liveStrokeRef.current) return;
    activePointerIdRef.current = null;
    const committed = liveStrokeRef.current;
    liveStrokeRef.current = null;
    setRedoStack([]);
    setStrokes((prev) => [...prev, committed]);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    cozyTap('light');
    const last = strokes[strokes.length - 1];
    setRedoStack((r) => [...r, last]);
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    cozyTap('light');
    const popped = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setStrokes((prev) => [...prev, popped]);
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    cozyTap('medium');
    setStrokes([]);
    setRedoStack([]);
  };

  const cyclePalette = () => {
    cozyTap('light');
    const idx = CURATED_DRAW_PALETTES.findIndex((p) => p.id === palette.id);
    const next = CURATED_DRAW_PALETTES[(idx + 1) % CURATED_DRAW_PALETTES.length];
    onChangeDrawPalette(next.id);
  };

  const openSaveDialog = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = cropCanvasToSpriteDataUrl(canvas, 256);
    if (!dataUrl) {
      cozyTap('light');
      setEmptyWarn(true);
      setTimeout(() => setEmptyWarn(false), 1800);
      return;
    }
    cozyTap('medium');
    setPreviewUrl(dataUrl);
    if (entityKind === 'bicho') {
      setEntityName(pickRandom(RANDOM_BICHO_NAMES));
    } else if (entityKind === 'plant') {
      setEntityName(pickRandom(RANDOM_PLANT_NAMES));
    } else {
      setEntityName(pickRandom(RANDOM_ROCK_NAMES));
    }
    setSaveOpen(true);
  };

  const confirmSave = () => {
    if (!previewUrl) return;
    cozyTap('medium');
    const cleanName =
      entityName.trim() ||
      (entityKind === 'bicho'
        ? pickRandom(RANDOM_BICHO_NAMES)
        : entityKind === 'plant'
          ? pickRandom(RANDOM_PLANT_NAMES)
          : pickRandom(RANDOM_ROCK_NAMES));
    const cleanCreator = creatorName.trim() || 'Familia';
    const now = new Date();

    if (entityKind === 'bicho') {
      const bicho: CustomBicho = {
        id: `cb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        creator: cleanCreator,
        movement,
        status: 'in_jar',
        birthday: formatShortDate(now),
        spriteDataUrl: previewUrl,
        stickerOutline: stickerOn,
        scale: bichoScale,
        note:
          movement === 'pet_rock'
            ? 'Certified cozy pet rock. Loves chilling on soft moss.'
            : `Hand-drawn ${MOVEMENT_OPTIONS.find((m) => m.id === movement)?.name.toLowerCase() ?? 'bicho'}!`,
        stamps: [{ jar: 'Casa Jar', icon: '🌿' }],
        createdAt: now.toISOString(),
      };
      onSaveBicho(bicho);
    } else {
      const decor: CustomDecor = {
        id: `cd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: entityKind,
        name: cleanName,
        creator: cleanCreator,
        spriteDataUrl: previewUrl,
        anchorX: 0.22 + Math.random() * 0.56,
        smartExpand,
        seed: Math.floor(Math.random() * 100000),
        inJar: true,
        createdAt: now.toISOString(),
      };
      onSaveDecor(decor);
    }

    setSaveOpen(false);
    setStrokes([]);
    setRedoStack([]);
  };

  const placeholderHint =
    entityKind === 'bicho'
      ? 'Draw your bicho here (facing right →)'
      : entityKind === 'plant'
        ? 'Draw a leaf, grass tuft or mushroom — it will grow into a cozy cluster!'
        : 'Draw a mossy stone or crystal — companion pebbles will grow around it!';

  return (
    <div className="mock-draw-screen">
      {/* Entity Mode Switcher: Bicho | Plant | Rock */}
      <div className="draw-kind-tabs">
        <button
          type="button"
          className={`b-btn draw-kind-btn ${entityKind === 'bicho' ? 'is-active' : ''}`}
          onClick={() => {
            cozyTap('light');
            setEntityKind('bicho');
          }}
        >
          <span>🐞 Bicho</span>
        </button>
        <button
          type="button"
          className={`b-btn draw-kind-btn ${entityKind === 'plant' ? 'is-active' : ''}`}
          onClick={() => {
            cozyTap('light');
            setEntityKind('plant');
          }}
        >
          <MossLeafIcon size={15} />
          <span>Plant</span>
        </button>
        <button
          type="button"
          className={`b-btn draw-kind-btn ${entityKind === 'rock' ? 'is-active' : ''}`}
          onClick={() => {
            cozyTap('light');
            setEntityKind('rock');
          }}
        >
          <RockIcon size={15} />
          <span>Rock</span>
        </button>
      </div>

      {/* Real Interactive Drawing Canvas */}
      <div className="b-card live-draw-canvas-box">
        <div className="draw-canvas-header">
          <div className="draw-header-left">
            <button
              type="button"
              className="mini-canvas-action"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              aria-label="Undo"
            >
              <UndoIcon size={15} />
            </button>
            <button
              type="button"
              className="mini-canvas-action"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              aria-label="Redo"
            >
              <RedoIcon size={15} />
            </button>
            <button
              type="button"
              className="mini-canvas-action"
              onClick={handleClear}
              disabled={strokes.length === 0}
            >
              Clear
            </button>
          </div>

          <button
            type="button"
            className="b-chip palette-cycle-chip"
            onClick={cyclePalette}
            title="Switch curated cozy palette"
          >
            {palette.name} ↻
          </button>
        </div>

        <div className="live-draw-stage">
          {mirrorOn && <div className="mirror-axis" />}
          {strokes.length === 0 && (
            <div className="canvas-empty-prompt">
              <span>{placeholderHint}</span>
            </div>
          )}
          {emptyWarn && (
            <div className="canvas-warn-pill">Draw something first!</div>
          )}
          <canvas
            ref={canvasRef}
            className="live-draw-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          />
        </div>
      </div>

      {/* Curated Cozy Color Blobs */}
      <div className="b-card mock-palette-bar">
        <div className="palette-blobs">
          {palette.colors.map((c) => (
            <button
              key={c.hex}
              type="button"
              className={`color-blob ${color === c.hex && brush !== 'eraser' ? 'is-picked' : ''}`}
              style={{ background: c.hex }}
              title={c.name}
              onClick={() => {
                cozyTap('light');
                setColor(c.hex);
                if (brush === 'eraser') setBrush('crayon');
              }}
            />
          ))}
        </div>
      </div>

      {/* Clean Kid/Cozy Tool Row + Expandable Pro Drawer */}
      <div className="mock-tool-row">
        {(['crayon', 'ink', 'marker', 'glow'] as const).map((b) => (
          <button
            key={b}
            type="button"
            className={`b-btn mock-tool-pill ${brush === b ? 'is-active' : ''}`}
            onClick={() => {
              cozyTap('light');
              setBrush(b);
            }}
          >
            {b === 'glow' ? <SparkleIcon size={14} /> : <BrushIcon size={14} />}
            <span>{b}</span>
          </button>
        ))}
        <button
          type="button"
          className={`b-btn mock-tool-pill ${brush === 'eraser' ? 'is-active' : ''}`}
          onClick={() => {
            cozyTap('light');
            setBrush(brush === 'eraser' ? 'crayon' : 'eraser');
          }}
        >
          <EraserIcon size={14} />
          <span>Erase</span>
        </button>
      </div>

      {/* Compact Secondary Row: Size S/M/L + Mirror + Pro */}
      <div className="draw-sub-controls">
        <div className="draw-size-group">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`b-btn draw-size-btn ${brushSize === s.value ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setBrushSize(s.value);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`b-btn mini-toggle ${mirrorOn ? 'is-active' : ''}`}
          onClick={() => {
            cozyTap('light');
            setMirrorOn((v) => !v);
          }}
        >
          <MirrorIcon size={14} />
          <span>Mirror</span>
        </button>

        <button
          type="button"
          className={`b-btn mini-toggle ${proOpen ? 'is-active' : ''}`}
          onClick={() => {
            cozyTap('light');
            setProOpen((v) => !v);
          }}
        >
          <span>{proOpen ? 'Less' : 'More +'}</span>
        </button>
      </div>

      {proOpen && (
        <div className="b-card mock-pro-drawer">
          <button
            type="button"
            className={`b-btn mini-toggle ${stickerOn ? 'is-active' : ''}`}
            onClick={() => {
              cozyTap('light');
              setStickerOn((v) => !v);
            }}
          >
            <SparkleIcon size={14} />
            <span>Sticker Outline {stickerOn ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            className="b-btn mini-toggle"
            onClick={cyclePalette}
          >
            <span>Palette: {palette.name}</span>
          </button>
        </div>
      )}

      {/* Footer Save Action */}
      <div className="mock-draw-footer">
        <button
          type="button"
          className="b-btn secondary-btn"
          onClick={onBackToJar}
        >
          Back to Jar
        </button>
        <button
          type="button"
          className="b-btn primary-btn"
          onClick={openSaveDialog}
        >
          {entityKind === 'bicho'
            ? 'Name & Bring Alive →'
            : entityKind === 'plant'
              ? 'Grow in Jar →'
              : 'Place in Jar →'}
        </button>
      </div>

      {/* Save / Name / Movement Picker Sheet */}
      {saveOpen && (
        <div className="drawer-backdrop" onClick={() => setSaveOpen(false)}>
          <div
            className="tinker-sheet save-entity-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-header">
              <div className="save-preview-head">
                <div className="save-sprite-thumb">
                  <img src={previewUrl} alt="Your drawing preview" />
                </div>
                <div>
                  <h3>
                    {entityKind === 'bicho'
                      ? 'Bring Your Bicho to Life!'
                      : entityKind === 'plant'
                        ? 'Plant in Your Jar!'
                        : 'Place Your Rock!'}
                  </h3>
                  <p className="sheet-desc">Saved locally in your Bichodex.</p>
                </div>
              </div>
              <button
                type="button"
                className="sheet-close-btn"
                onClick={() => setSaveOpen(false)}
              >
                Edit
              </button>
            </div>

            <div className="sheet-scroll">
              <div className="sheet-block">
                <div className="name-input-row">
                  <input
                    type="text"
                    className="cozy-input"
                    value={entityName}
                    placeholder="Give it a name..."
                    onChange={(e) => setEntityName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="dice-btn"
                    title="Random cozy name"
                    onClick={() => {
                      cozyTap('light');
                      setEntityName(
                        pickRandom(
                          entityKind === 'bicho'
                            ? RANDOM_BICHO_NAMES
                            : entityKind === 'plant'
                              ? RANDOM_PLANT_NAMES
                              : RANDOM_ROCK_NAMES
                        )
                      );
                    }}
                  >
                    🎲
                  </button>
                </div>

                <div className="creator-row">
                  <small>Drawn by:</small>
                  <input
                    type="text"
                    className="cozy-input creator-input"
                    value={creatorName}
                    placeholder="Your name"
                    onChange={(e) => setCreatorName(e.target.value)}
                  />
                </div>
              </div>

              {entityKind === 'bicho' && (
                <>
                  <div className="sheet-block">
                    <strong>How does {entityName || 'it'} move?</strong>
                    <div className="move-grid">
                      {MOVEMENT_OPTIONS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`move-card ${movement === m.id ? 'is-active' : ''}`}
                          onClick={() => {
                            cozyTap('light');
                            setMovement(m.id);
                          }}
                        >
                          <span className="move-emoji">{m.emoji}</span>
                          <strong>{m.name}</strong>
                          <small>{m.tagline}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sheet-block">
                    <label className="slider-row">
                      <span>
                        Bicho Size{' '}
                        <b>
                          {bichoScale < 0.88
                            ? 'Tiny'
                            : bichoScale > 1.12
                              ? 'Chonky'
                              : 'Just Right'}
                        </b>
                      </span>
                      <input
                        type="range"
                        min={0.7}
                        max={1.35}
                        step={0.05}
                        value={bichoScale}
                        onChange={(e) => setBichoScale(Number(e.target.value))}
                      />
                    </label>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={stickerOn}
                        onChange={(e) => setStickerOn(e.target.checked)}
                      />
                      <span>Cozy die-cut white sticker outline</span>
                    </label>
                  </div>
                </>
              )}

              {entityKind !== 'bicho' && (
                <div className="sheet-block">
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={smartExpand}
                      onChange={(e) => setSmartExpand(e.target.checked)}
                    />
                    <span>
                      <strong>Smart Procedural Expansion</strong>
                    </span>
                  </label>
                  <small className="helper-text">
                    {entityKind === 'plant'
                      ? 'Cleverly grows varied sibling sprouts & swaying shoots around your drawing instead of stamping identical clones.'
                      : 'Nests your stone into the soil and generates varied companion pebbles & soft moss caps around it.'}
                  </small>
                </div>
              )}

              <button
                type="button"
                className="export-cta-btn"
                onClick={confirmSave}
              >
                <span>
                  {entityKind === 'bicho'
                    ? `Drop ${entityName || 'Bicho'} into Jar!`
                    : `Add ${entityName || 'Decor'} to Jar!`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
