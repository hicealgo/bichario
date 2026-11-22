import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SCRIBBLE_COLORS } from '../data/themes';
import { MenuSketch, SketchStroke, SketchTemplate } from '../types';
import { drawSketchTemplateGhost, renderSketchToDataUrl } from '../utils/exportZip';
import { cozyTap } from '../utils/haptics';
import { EraserIcon, RedoIcon, UndoIcon } from './Icons';

interface MenuScribblerProps {
  sketches: MenuSketch[];
  onSaveSketches: (next: MenuSketch[]) => void;
  onPointerSeen: (pointerType: string) => void;
}

const TEMPLATES: { id: SketchTemplate; label: string }[] = [
  { id: 'terrarium', label: 'Terrarium' },
  { id: 'draw', label: 'Draw UI' },
  { id: 'bichodex', label: 'Bichodex' },
  { id: 'grid', label: 'Dot Grid' },
  { id: 'blank', label: 'Blank' },
];

const SIZES = [
  { id: 's', label: 'S', value: 3.2 },
  { id: 'm', label: 'M', value: 6.2 },
  { id: 'l', label: 'L', value: 11.5 },
];

function createBlankSketch(index: number): MenuSketch {
  return {
    id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `Menu Idea ${index}`,
    note: '',
    template: 'terrarium',
    strokes: [],
    aspect: 0.64,
    updatedAt: new Date().toISOString(),
  };
}

export const MenuScribbler: React.FC<MenuScribblerProps> = ({
  sketches,
  onSaveSketches,
  onPointerSeen,
}) => {
  const [activeId, setActiveId] = useState<string>(() => {
    if (sketches.length > 0) return sketches[0].id;
    return '';
  });

  // Ensure at least one active page exists
  useEffect(() => {
    if (sketches.length === 0) {
      const first = createBlankSketch(1);
      onSaveSketches([first]);
      setActiveId(first.id);
    } else if (!sketches.some((s) => s.id === activeId)) {
      setActiveId(sketches[0].id);
    }
  }, [sketches, activeId, onSaveSketches]);

  const activeSketch =
    sketches.find((s) => s.id === activeId) ?? sketches[0] ?? createBlankSketch(1);

  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState(SCRIBBLE_COLORS[0].hex);
  const [size, setSize] = useState(SIZES[1].value);
  const [redoStack, setRedoStack] = useState<SketchStroke[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveStrokeRef = useRef<SketchStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePenDownRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const updateActiveSketch = useCallback(
    (updater: (prev: MenuSketch) => MenuSketch) => {
      onSaveSketches(
        sketches.map((sk) => (sk.id === activeSketch.id ? updater(sk) : sk))
      );
    },
    [sketches, activeSketch.id, onSaveSketches]
  );

  const redrawCanvas = useCallback(
    (extraStroke?: SketchStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Warm cream paper background
      ctx.fillStyle = '#FAF5E9';
      ctx.fillRect(0, 0, w, h);

      drawSketchTemplateGhost(ctx, activeSketch.template, w, h);

      const all = extraStroke
        ? [...activeSketch.strokes, extraStroke]
        : activeSketch.strokes;

      for (const stroke of all) {
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

        const baseWidth =
          (stroke.size / 400) * w * (stroke.tool === 'highlighter' ? 2.6 : 1);

        if (stroke.points.length === 1) {
          const pt = stroke.points[0];
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, Math.max(1.5, baseWidth * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            const p0 = stroke.points[i - 1];
            const p1 = stroke.points[i];
            const midX = ((p0.x + p1.x) * 0.5) * w;
            const midY = ((p0.y + p1.y) * 0.5) * h;
            const prevMidX =
              i === 1 ? p0.x * w : ((stroke.points[i - 2].x + p0.x) * 0.5) * w;
            const prevMidY =
              i === 1 ? p0.y * h : ((stroke.points[i - 2].y + p0.y) * 0.5) * h;
            const pressure = Math.max(0.35, Math.min(1.55, (p0.p + p1.p) * 0.5 || 0.78));
            ctx.lineWidth = Math.max(1.5, baseWidth * pressure);
            ctx.beginPath();
            ctx.moveTo(prevMidX, prevMidY);
            ctx.quadraticCurveTo(p0.x * w, p0.y * h, midX, midY);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    },
    [activeSketch.strokes, activeSketch.template]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      redrawCanvas(liveStrokeRef.current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas(liveStrokeRef.current);
  }, [redrawCanvas]);

  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, p: 0.75 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));

    let p = 0.8;
    if (e.pointerType === 'pen' && e.pressure > 0) {
      // Smooth organic stylus pressure curve (completely automatic & silent)
      p = 0.35 + Math.pow(e.pressure, 0.85) * 1.15;
    } else if (lastPointRef.current) {
      // Subtle velocity feel for finger/mouse strokes
      const dt = Math.max(8, performance.now() - lastPointRef.current.t);
      const dist = Math.hypot(x - lastPointRef.current.x, y - lastPointRef.current.y);
      const speed = dist / dt;
      p = Math.max(0.58, Math.min(1.05, 1.0 - speed * 90));
    }
    lastPointRef.current = { x, y, t: performance.now() };
    return { x, y, p };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    onPointerSeen(e.pointerType || 'unknown');

    // Silent palm rejection when stylus is drawing
    if (e.pointerType === 'pen') {
      activePenDownRef.current = true;
    } else if (activePenDownRef.current && e.pointerType === 'touch') {
      return;
    }

    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    lastPointRef.current = null;
    const pt = getNormalizedPoint(e);
    const stroke: SketchStroke = {
      tool,
      color,
      size,
      points: [pt],
    };
    liveStrokeRef.current = stroke;
    redrawCanvas(stroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !liveStrokeRef.current) return;
    const pt = getNormalizedPoint(e);
    const pts = liveStrokeRef.current.points;
    const prev = pts[pts.length - 1];
    if (prev && Math.hypot(pt.x - prev.x, pt.y - prev.y) < 0.0028) return;
    pts.push(pt);
    redrawCanvas(liveStrokeRef.current);
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') {
      activePenDownRef.current = false;
    }
    if (activePointerIdRef.current !== e.pointerId || !liveStrokeRef.current) return;
    activePointerIdRef.current = null;
    const committed = liveStrokeRef.current;
    liveStrokeRef.current = null;

    const canvas = canvasRef.current;
    const aspect =
      canvas && canvas.height > 0 ? canvas.width / canvas.height : activeSketch.aspect;

    setRedoStack([]);
    updateActiveSketch((prev) => {
      const next: MenuSketch = {
        ...prev,
        aspect,
        strokes: [...prev.strokes, committed],
        updatedAt: new Date().toISOString(),
      };
      next.previewDataUrl = renderSketchToDataUrl(next, 320);
      return next;
    });
  };

  const handleUndo = () => {
    if (activeSketch.strokes.length === 0) return;
    cozyTap('light');
    const last = activeSketch.strokes[activeSketch.strokes.length - 1];
    setRedoStack((r) => [...r, last]);
    updateActiveSketch((prev) => {
      const next = {
        ...prev,
        strokes: prev.strokes.slice(0, -1),
        updatedAt: new Date().toISOString(),
      };
      next.previewDataUrl = renderSketchToDataUrl(next, 320);
      return next;
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    cozyTap('light');
    const popped = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    updateActiveSketch((prev) => {
      const next = {
        ...prev,
        strokes: [...prev.strokes, popped],
        updatedAt: new Date().toISOString(),
      };
      next.previewDataUrl = renderSketchToDataUrl(next, 320);
      return next;
    });
  };

  const handleClear = () => {
    if (activeSketch.strokes.length === 0) return;
    cozyTap('medium');
    setRedoStack([]);
    updateActiveSketch((prev) => ({
      ...prev,
      strokes: [],
      previewDataUrl: undefined,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddPage = () => {
    cozyTap('light');
    const next = createBlankSketch(sketches.length + 1);
    onSaveSketches([...sketches, next]);
    setActiveId(next.id);
    setRedoStack([]);
  };

  const handleDeletePage = () => {
    if (sketches.length <= 1) {
      handleClear();
      return;
    }
    cozyTap('medium');
    const remaining = sketches.filter((s) => s.id !== activeSketch.id);
    onSaveSketches(remaining);
    setActiveId(remaining[0].id);
    setRedoStack([]);
  };

  return (
    <div className="scribbler-shell">
      {/* Page switcher strip */}
      <div className="scribble-pages-bar">
        <div className="pages-scroll">
          {sketches.map((sk, i) => (
            <button
              key={sk.id}
              type="button"
              className={`page-pill ${sk.id === activeSketch.id ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setActiveId(sk.id);
                setRedoStack([]);
              }}
            >
              <span>{sk.title || `Page ${i + 1}`}</span>
              {sk.strokes.length > 0 && <em className="dot-live" />}
            </button>
          ))}
          <button type="button" className="page-pill add-pill" onClick={handleAddPage}>
            + Page
          </button>
        </div>

        <button
          type="button"
          className={`note-toggle-btn ${notesOpen ? 'is-active' : ''}`}
          onClick={() => {
            cozyTap('light');
            setNotesOpen((v) => !v);
          }}
        >
          {notesOpen ? 'Hide Info' : 'Title & Note'}
        </button>
      </div>

      {/* Optional collapsible Title / Template / Note bar */}
      {notesOpen && (
        <div className="scribble-meta-card">
          <div className="meta-row">
            <input
              type="text"
              className="cozy-input"
              value={activeSketch.title}
              placeholder="Sketch title (e.g. My Main Menu)"
              onChange={(e) =>
                updateActiveSketch((prev) => ({ ...prev, title: e.target.value }))
              }
            />
            <button type="button" className="danger-mini-btn" onClick={handleDeletePage}>
              Delete
            </button>
          </div>
          <textarea
            className="cozy-textarea"
            rows={2}
            placeholder="Explain your menu idea (optional)..."
            value={activeSketch.note}
            onChange={(e) =>
              updateActiveSketch((prev) => ({ ...prev, note: e.target.value }))
            }
          />
        </div>
      )}

      {/* Faint ghost template selector */}
      <div className="template-strip">
        <span className="strip-label">Guide:</span>
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className={`mini-chip ${activeSketch.template === tpl.id ? 'is-active' : ''}`}
            onClick={() => {
              cozyTap('light');
              updateActiveSketch((prev) => ({ ...prev, template: tpl.id }));
            }}
          >
            {tpl.label}
          </button>
        ))}
      </div>

      {/* Main full-bleed drawing surface */}
      <div className="scribble-canvas-frame">
        <canvas
          ref={canvasRef}
          className="scribble-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      </div>

      {/* Compact cozy drawing toolbar */}
      <div className="scribble-toolbar">
        <div className="tool-row-top">
          <div className="swatch-row">
            {SCRIBBLE_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                className={`scribble-dot ${color === c.hex && tool !== 'eraser' ? 'is-picked' : ''}`}
                style={{ background: c.hex }}
                title={c.name}
                onClick={() => {
                  cozyTap('light');
                  setColor(c.hex);
                  if (tool === 'eraser') setTool('pen');
                }}
              />
            ))}
          </div>

          <div className="size-row">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`size-pill ${size === s.value ? 'is-active' : ''}`}
                onClick={() => {
                  cozyTap('light');
                  setSize(s.value);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tool-row-bottom">
          <div className="mode-pills">
            <button
              type="button"
              className={`tool-btn ${tool === 'pen' ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setTool('pen');
              }}
            >
              Pen
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === 'highlighter' ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setTool('highlighter');
              }}
            >
              Marker
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === 'eraser' ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setTool('eraser');
              }}
            >
              <EraserIcon size={15} />
              <span>Erase</span>
            </button>
          </div>

          <div className="action-pills">
            <button
              type="button"
              className="icon-tool-btn"
              onClick={handleUndo}
              disabled={activeSketch.strokes.length === 0}
              aria-label="Undo"
            >
              <UndoIcon size={17} />
            </button>
            <button
              type="button"
              className="icon-tool-btn"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              aria-label="Redo"
            >
              <RedoIcon size={17} />
            </button>
            <button
              type="button"
              className="tool-btn subtle-clear"
              onClick={handleClear}
              disabled={activeSketch.strokes.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
