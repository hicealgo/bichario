import React, { useEffect, useRef } from 'react';
import { SAMPLE_BICHOS } from '../data/themes';
import {
  AmbianceMode,
  CustomBicho,
  CustomDecor,
  JarShape,
  MossBlob,
  MovementStyle,
  SampleBicho,
  ThemePalette,
} from '../types';
import { cozyTap } from '../utils/haptics';
import {
  buildStickerCanvas,
  buildTintedCanvas,
  seededRand,
} from '../utils/spriteProcess';

export interface ActiveBichoSelection {
  id: string;
  isCustom: boolean;
  name: string;
  creator: string;
  movement: MovementStyle;
  note: string;
  spriteDataUrl?: string;
  color?: string;
  stamps: { jar: string; icon: string }[];
}

interface TerrariumCanvasProps {
  palette: ThemePalette;
  jarShape: JarShape;
  ambiance: AmbianceMode;
  customBichos: CustomBicho[];
  customDecors: CustomDecor[];
  mossBlobs: MossBlob[];
  starterStatuses: Record<string, SampleBicho['status']>;
  showStarters: boolean;
  selectedBichoId: string | null;
  mossPaintMode: boolean;
  mistPulse: number;
  onSelectBicho: (sel: ActiveBichoSelection) => void;
  onAddMossBlob: (blob: MossBlob) => void;
}

interface SimActor {
  id: string;
  isCustom: boolean;
  movement: MovementStyle;
  x: number; // normalized 0..1 inside jar box
  y: number;
  vx: number;
  vy: number;
  dir: number;
  phase: number;
  hop: number;
  hopCooldown: number;
  perchTimer: number;
  wallMode: 'floor' | 'left' | 'right';
  wallY: number;
  emote: string | null;
  emoteTimer: number;
  wobble: number;
  // Metadata
  sample?: SampleBicho;
  custom?: CustomBicho;
}

interface CachedSprite {
  raw: HTMLImageElement;
  sticker: HTMLCanvasElement;
  tinted: HTMLCanvasElement;
  ready: boolean;
}

interface Ripple {
  x: number;
  y: number;
  t: number;
}

interface MistDrop {
  x: number;
  y: number;
  vy: number;
  life: number;
}

interface RainStreak {
  x: number;
  y: number;
  speed: number;
  len: number;
}

function mossHeightAt(nx: number, shape: JarShape): number {
  const baseFloor =
    shape === 'terrarium_box'
      ? 0.72
      : shape === 'orb' || shape === 'teardrop'
        ? 0.75
        : 0.74;
  return (
    baseFloor -
    Math.sin(nx * Math.PI) * 0.068 +
    Math.sin(nx * Math.PI * 3.1 + 0.6) * 0.02
  );
}

function traceVesselPath(
  ctx: CanvasRenderingContext2D,
  shape: JarShape,
  jx: number,
  jy: number,
  jw: number,
  jh: number
) {
  ctx.beginPath();
  if (shape === 'mason') {
    const r = Math.min(jw, jh) * 0.22;
    ctx.roundRect(jx, jy, jw, jh, r);
  } else if (shape === 'dome') {
    const topR = jw * 0.5;
    const baseY = jy + jh * 0.92;
    ctx.moveTo(jx, baseY);
    ctx.lineTo(jx, jy + topR);
    ctx.arc(jx + topR, jy + topR, topR, Math.PI, 0, false);
    ctx.lineTo(jx + jw, baseY);
    ctx.quadraticCurveTo(jx + jw, jy + jh, jx + jw - jw * 0.08, jy + jh);
    ctx.lineTo(jx + jw * 0.08, jy + jh);
    ctx.quadraticCurveTo(jx, jy + jh, jx, baseY);
    ctx.closePath();
  } else if (shape === 'orb') {
    const cx = jx + jw * 0.5;
    const cy = jy + jh * 0.54;
    const rx = jw * 0.5;
    const ry = jh * 0.46;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  } else if (shape === 'hex') {
    const cx = jx + jw * 0.5;
    ctx.moveTo(cx, jy);
    ctx.lineTo(jx + jw * 0.94, jy + jh * 0.26);
    ctx.lineTo(jx + jw, jy + jh * 0.76);
    ctx.lineTo(jx + jw * 0.78, jy + jh);
    ctx.lineTo(jx + jw * 0.22, jy + jh);
    ctx.lineTo(jx, jy + jh * 0.76);
    ctx.lineTo(jx + jw * 0.06, jy + jh * 0.26);
    ctx.closePath();
  } else if (shape === 'teardrop') {
    const cx = jx + jw * 0.5;
    ctx.moveTo(cx, jy);
    ctx.bezierCurveTo(
      jx + jw * 0.88,
      jy + jh * 0.28,
      jx + jw * 1.06,
      jy + jh * 0.72,
      jx + jw * 0.82,
      jy + jh * 0.92
    );
    ctx.quadraticCurveTo(cx, jy + jh * 1.04, jx + jw * 0.18, jy + jh * 0.92);
    ctx.bezierCurveTo(
      jx - jw * 0.06,
      jy + jh * 0.72,
      jx + jw * 0.12,
      jy + jh * 0.28,
      cx,
      jy
    );
    ctx.closePath();
  } else {
    // terrarium_box
    const r = Math.min(jw, jh) * 0.1;
    ctx.roundRect(jx, jy, jw, jh, r);
  }
}

function drawOrganicStone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  fill: string,
  highlight: string,
  shadow: string,
  outline: string,
  dpr: number
) {
  const rand = seededRand(seed);
  const pts: { x: number; y: number }[] = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.28;
    const radScale = 0.82 + rand() * 0.28;
    pts.push({
      x: cx + Math.cos(angle) * rx * radScale,
      y: cy + Math.sin(angle) * ry * radScale,
    });
  }

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % count];
    const mx = (p0.x + p1.x) * 0.5;
    const my = (p0.y + p1.y) * 0.5;
    if (i === 0) {
      const prev = pts[count - 1];
      ctx.moveTo((prev.x + p0.x) * 0.5, (prev.y + p0.y) * 0.5);
    }
    ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
  }
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();

  // Clip inside stone for warm top highlight & lower shadow
  ctx.save();
  ctx.clip();
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.18, cy - ry * 0.34, rx * 0.72, ry * 0.42, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.12, cy + ry * 0.48, rx * 0.9, ry * 0.44, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Tiny mineral speckles
  ctx.fillStyle = 'rgba(42, 32, 24, 0.18)';
  for (let s = 0; s < 3; s++) {
    ctx.beginPath();
    ctx.arc(
      cx + (rand() - 0.5) * rx * 1.1,
      cy + (rand() - 0.5) * ry * 0.9,
      Math.max(1, 1.3 * dpr),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4 * dpr;
  ctx.stroke();
  ctx.restore();
}

export const TerrariumCanvas: React.FC<TerrariumCanvasProps> = ({
  palette,
  jarShape,
  ambiance,
  customBichos,
  customDecors,
  mossBlobs,
  starterStatuses,
  showStarters,
  selectedBichoId,
  mossPaintMode,
  mistPulse,
  onSelectBicho,
  onAddMossBlob,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({
    palette,
    jarShape,
    ambiance,
    customBichos,
    customDecors,
    mossBlobs,
    starterStatuses,
    showStarters,
    selectedBichoId,
    mossPaintMode,
    onSelectBicho,
    onAddMossBlob,
  });
  propsRef.current = {
    palette,
    jarShape,
    ambiance,
    customBichos,
    customDecors,
    mossBlobs,
    starterStatuses,
    showStarters,
    selectedBichoId,
    mossPaintMode,
    onSelectBicho,
    onAddMossBlob,
  };

  const actorsRef = useRef<Map<string, SimActor>>(new Map());
  const spriteCacheRef = useRef<Map<string, CachedSprite>>(new Map());
  const ripplesRef = useRef<Ripple[]>([]);
  const mistDropsRef = useRef<MistDrop[]>([]);
  const rainRef = useRef<RainStreak[]>(
    Array.from({ length: 24 }, (_, i) => ({
      x: ((i * 37) % 100) / 100,
      y: ((i * 53) % 100) / 100,
      speed: 0.28 + (i % 5) * 0.08,
      len: 0.045 + (i % 3) * 0.018,
    }))
  );
  const jarBoxRef = useRef({ x: 0, y: 0, w: 1, h: 1 });
  const paintingMossRef = useRef(false);
  const lastMossPosRef = useRef<{ x: number; y: number } | null>(null);
  const plantExciteRef = useRef(0);

  // Trigger mist burst when mistPulse increments
  useEffect(() => {
    if (mistPulse === 0) return;
    plantExciteRef.current = 1.6;
    for (let i = 0; i < 24; i++) {
      mistDropsRef.current.push({
        x: 0.18 + Math.random() * 0.64,
        y: 0.08 + Math.random() * 0.25,
        vy: 0.25 + Math.random() * 0.22,
        life: 1,
      });
    }
    const happyEmotes = ['💧', '✨', '🌿', '♥', 'ahhh'];
    for (const actor of actorsRef.current.values()) {
      if (actor.movement === 'pet_rock') {
        actor.wobble = 1;
        actor.emote = Math.random() < 0.5 ? 'shiny' : '💧';
        actor.emoteTimer = 2.0;
      } else {
        actor.hop = Math.max(actor.hop, 0.7);
        actor.emote = happyEmotes[Math.floor(Math.random() * happyEmotes.length)];
        actor.emoteTimer = 1.7;
      }
    }
  }, [mistPulse]);

  // Helper to ensure an image + sticker/tinted cache entry exists
  const ensureSprite = (dataUrl: string, outlineHex: string) => {
    const key = `${dataUrl.slice(0, 48)}:${dataUrl.length}:${outlineHex}`;
    const existing = spriteCacheRef.current.get(key);
    if (existing) return existing;

    const img = new Image();
    const entry: CachedSprite = {
      raw: img,
      sticker: document.createElement('canvas'),
      tinted: document.createElement('canvas'),
      ready: false,
    };
    spriteCacheRef.current.set(key, entry);
    img.onload = () => {
      entry.sticker = buildStickerCanvas(img, 7, outlineHex);
      entry.tinted = buildTintedCanvas(img, '#3A4F38', 0.16);
      entry.ready = true;
    };
    img.src = dataUrl;
    return entry;
  };

  // Keep simulation actors synchronized with starters + customBichos
  useEffect(() => {
    const map = actorsRef.current;
    const wantedIds = new Set<string>();

    if (showStarters) {
      SAMPLE_BICHOS.forEach((b, idx) => {
        const st = starterStatuses[b.id] ?? b.status;
        if (st !== 'in_jar') return;
        wantedIds.add(b.id);
        const existing = map.get(b.id);
        if (existing) {
          existing.sample = b;
        } else {
          map.set(b.id, {
            id: b.id,
            isCustom: false,
            movement: b.movement,
            x: 0.24 + idx * 0.18,
            y: b.movement === 'flyer' ? 0.36 : 0.73,
            vx: (idx % 2 === 0 ? 1 : -1) * (0.032 + idx * 0.008),
            vy: 0,
            dir: idx % 2 === 0 ? 1 : -1,
            phase: idx * 1.4,
            hop: 0,
            hopCooldown: 1.5,
            perchTimer: 0,
            wallMode: 'floor',
            wallY: 0.72,
            emote: null,
            emoteTimer: 0,
            wobble: 0,
            sample: b,
          });
        }
      });
    }

    customBichos.forEach((cb, idx) => {
      if (cb.status !== 'in_jar') return;
      wantedIds.add(cb.id);
      const existing = map.get(cb.id);
      if (existing) {
        existing.custom = cb;
        existing.movement = cb.movement;
      } else {
        const startX = 0.24 + ((idx * 0.23 + 0.17) % 0.54);
        map.set(cb.id, {
          id: cb.id,
          isCustom: true,
          movement: cb.movement,
          x: startX,
          y: cb.movement === 'flyer' ? 0.35 : 0.72,
          vx: (idx % 2 === 0 ? 1 : -1) * (cb.movement === 'pet_rock' ? 0 : 0.048),
          vy: 0,
          dir: idx % 2 === 0 ? 1 : -1,
          phase: Math.random() * Math.PI * 2,
          hop: cb.movement === 'pet_rock' ? 0 : 0.9,
          hopCooldown: 1.2 + Math.random() * 1.6,
          perchTimer: 0,
          wallMode: 'floor',
          wallY: 0.72,
          emote: cb.movement === 'pet_rock' ? '🪨' : 'hi!',
          emoteTimer: 2.0,
          wobble: 1,
          custom: cb,
        });
      }
    });

    for (const id of Array.from(map.keys())) {
      if (!wantedIds.has(id)) map.delete(id);
    }
  }, [customBichos, showStarters, starterStatuses]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawFern = (
      ctx: CanvasRenderingContext2D,
      bx: number,
      by: number,
      len: number,
      angle: number,
      sway: number,
      color: string
    ) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angle + sway);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(2, len * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.14, -len * 0.5, len * 0.05, -len);
      ctx.stroke();

      const pairs = 5;
      for (let i = 1; i <= pairs; i++) {
        const t = i / (pairs + 0.6);
        const ly = -len * t;
        const lx = len * 0.08 * Math.sin(t * Math.PI);
        const leafLen = len * (0.26 - t * 0.14);
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(
            lx + side * leafLen * 0.65,
            ly,
            leafLen * 0.65,
            leafLen * 0.28,
            side * -0.42,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawSampleBug = (
      ctx: CanvasRenderingContext2D,
      actor: SimActor,
      scale: number,
      time: number,
      pal: ThemePalette
    ) => {
      const bicho = actor.sample!;
      const ink = '#332722';
      const strokeOutline = (drawShape: () => void) => {
        ctx.save();
        ctx.lineWidth = 7.2 * scale;
        ctx.strokeStyle = pal.isDark ? 'rgba(250,244,230,0.88)' : '#FFFDF8';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        drawShape();
        ctx.stroke();
        ctx.restore();
      };

      if (bicho.kind === 'beetle') {
        const bob = Math.sin(time * 9 + actor.phase) * 1.4 * scale;
        ctx.translate(0, bob);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.2 * scale;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const swing = Math.sin(time * 12 + actor.phase + i * 1.4) * 2.5 * scale;
          ctx.beginPath();
          ctx.moveTo(i * 6 * scale, 5 * scale);
          ctx.lineTo(i * 7 * scale + swing, 12 * scale);
          ctx.stroke();
        }
        const shell = () => {
          ctx.beginPath();
          ctx.ellipse(0, 0, 15 * scale, 11.5 * scale, 0, 0, Math.PI * 2);
        };
        strokeOutline(shell);
        ctx.fillStyle = bicho.color;
        shell();
        ctx.fill();
        ctx.lineWidth = 2.2 * scale;
        ctx.strokeStyle = ink;
        ctx.stroke();

        ctx.fillStyle = bicho.spotColor;
        ctx.beginPath();
        ctx.arc(-5 * scale, -3 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.arc(1 * scale, 2 * scale, 2.3 * scale, 0, Math.PI * 2);
        ctx.arc(-8 * scale, 3 * scale, 1.9 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(12 * scale, -1 * scale, 6.2 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFDF8';
        ctx.beginPath();
        ctx.arc(14 * scale, -2.5 * scale, 1.8 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(15 * scale, -6 * scale);
        ctx.quadraticCurveTo(19 * scale, -13 * scale, 22 * scale, -11 * scale);
        ctx.stroke();
      } else if (bicho.kind === 'inchworm') {
        const arch = (Math.sin(time * 5.2 + actor.phase) + 1) * 0.5;
        const segments = 5;
        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          const sx = (t - 0.5) * (24 - arch * 6) * scale;
          const sy = -Math.sin(t * Math.PI) * arch * 8 * scale + 3 * scale;
          ctx.fillStyle = pal.isDark ? 'rgba(250,244,230,0.88)' : '#FFFDF8';
          ctx.beginPath();
          ctx.arc(sx, sy, 8.6 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          const sx = (t - 0.5) * (24 - arch * 6) * scale;
          const sy = -Math.sin(t * Math.PI) * arch * 8 * scale + 3 * scale;
          const r = (5.4 + (i === segments - 1 ? 1.3 : 0)) * scale;
          ctx.fillStyle = i % 2 === 0 ? bicho.color : bicho.spotColor;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2 * scale;
          ctx.strokeStyle = ink;
          ctx.stroke();
          if (i === segments - 1) {
            ctx.fillStyle = ink;
            ctx.beginPath();
            ctx.arc(sx + 2.3 * scale, sy - 1.2 * scale, 1.5 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (bicho.kind === 'moth') {
        const flap = Math.sin(time * 14 + actor.phase);
        const wingScaleY = 0.55 + Math.abs(flap) * 0.55;
        const wings = () => {
          ctx.beginPath();
          ctx.ellipse(-6 * scale, -3 * scale, 11 * scale, 8 * scale * wingScaleY, -0.35, 0, Math.PI * 2);
          ctx.ellipse(6 * scale, -3 * scale, 11 * scale, 8 * scale * wingScaleY, 0.35, 0, Math.PI * 2);
        };
        strokeOutline(wings);
        ctx.fillStyle = bicho.color;
        wings();
        ctx.fill();
        ctx.lineWidth = 2 * scale;
        ctx.strokeStyle = ink;
        ctx.stroke();

        ctx.fillStyle = bicho.spotColor;
        ctx.beginPath();
        ctx.arc(-8 * scale, -3 * scale, 2.7 * scale, 0, Math.PI * 2);
        ctx.arc(8 * scale, -3 * scale, 2.7 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4B3A33';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * scale, 9 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sleepy pillbug
        const curled = actor.wobble > 0.15 || actor.hop > 0.05;
        const body = () => {
          ctx.beginPath();
          if (curled) {
            ctx.arc(0, 1 * scale, 11 * scale, 0, Math.PI * 2);
          } else {
            ctx.ellipse(0, 3 * scale, 14 * scale, 9.5 * scale, 0, Math.PI, 0);
            ctx.lineTo(14 * scale, 8 * scale);
            ctx.lineTo(-14 * scale, 8 * scale);
            ctx.closePath();
          }
        };
        strokeOutline(body);
        ctx.fillStyle = bicho.color;
        body();
        ctx.fill();
        ctx.lineWidth = 2.1 * scale;
        ctx.strokeStyle = ink;
        ctx.stroke();

        ctx.strokeStyle = bicho.spotColor;
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(-4 * scale, -3 * scale);
        ctx.lineTo(-4 * scale, 6 * scale);
        ctx.moveTo(3 * scale, -3 * scale);
        ctx.lineTo(3 * scale, 6 * scale);
        ctx.stroke();

        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.arc(9 * scale, 2 * scale, 2.2 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const {
        palette: pal,
        jarShape: shape,
        ambiance: amb,
        customDecors: decors,
        mossBlobs: blobs,
        selectedBichoId: selId,
      } = propsRef.current;

      if (plantExciteRef.current > 0) {
        plantExciteRef.current = Math.max(0, plantExciteRef.current - dt * 1.1);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      ctx.clearRect(0, 0, w, h);

      // Compute vessel dimensions tailored to jarShape
      const padX = w * 0.065;
      const topPad = Math.min(h * 0.1, 44 * dpr);
      const bottomSafe = Math.min(h * 0.145, 84 * dpr);
      const availH = Math.max(120 * dpr, h - bottomSafe - topPad);
      const availW = Math.max(120 * dpr, w - padX * 2);

      let jw = Math.min(availW, availH * 0.86);
      let jh = Math.min(availH * 0.94, jw * 1.16);

      if (shape === 'terrarium_box') {
        jw = Math.min(availW, availH * 1.18);
        jh = Math.min(availH * 0.78, jw * 0.74);
      } else if (shape === 'orb') {
        const d = Math.min(availW * 0.95, availH * 0.9);
        jw = d;
        jh = d * 0.96;
      } else if (shape === 'dome') {
        jw = Math.min(availW * 0.9, availH * 0.82);
        jh = Math.min(availH * 0.94, jw * 1.24);
      } else if (shape === 'teardrop') {
        jw = Math.min(availW * 0.88, availH * 0.8);
        jh = Math.min(availH * 0.92, jw * 1.24);
      }

      const jx = (w - jw) * 0.5;
      const jy = topPad + (availH - jh) * (shape === 'teardrop' ? 0.56 : 0.46);
      jarBoxRef.current = { x: jx, y: jy, w: jw, h: jh };

      const isNightFeel = Boolean(pal.isDark) || amb === 'night';

      // Hanging twine for teardrop
      if (shape === 'teardrop') {
        ctx.save();
        ctx.strokeStyle = pal.isDark ? '#A98967' : '#9B7653';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.moveTo(jx + jw * 0.5, 0);
        ctx.lineTo(jx + jw * 0.5, jy + 4 * dpr);
        ctx.stroke();
        ctx.fillStyle = '#C79667';
        ctx.strokeStyle = pal.border;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(jx + jw * 0.5, jy + 2 * dpr, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Soft ground shadow under vessel
      if (shape !== 'teardrop') {
        ctx.save();
        ctx.fillStyle = isNightFeel ? 'rgba(0,0,0,0.42)' : 'rgba(60, 48, 36, 0.12)';
        ctx.beginPath();
        ctx.ellipse(
          jx + jw * 0.5,
          jy + jh + (shape === 'dome' ? 14 : 9) * dpr,
          jw * (shape === 'orb' ? 0.34 : 0.45),
          10 * dpr,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      // Top lid / hardware behind jar rim
      if (shape === 'mason' || shape === 'orb') {
        const corkW = jw * (shape === 'orb' ? 0.34 : 0.46);
        const corkH = Math.max(17 * dpr, jh * 0.08);
        const corkX = jx + (jw - corkW) * 0.5;
        const corkY = jy + (shape === 'orb' ? jh * 0.03 : 0) - corkH * 0.72;
        ctx.save();
        ctx.fillStyle = isNightFeel ? '#8C6245' : '#C79667';
        ctx.strokeStyle = pal.border;
        ctx.lineWidth = 2.4 * dpr;
        ctx.beginPath();
        ctx.roundRect(corkX, corkY, corkW, corkH, [12 * dpr, 12 * dpr, 5 * dpr, 5 * dpr]);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(60, 38, 22, 0.22)';
        for (let i = 0; i < 7; i++) {
          ctx.beginPath();
          ctx.arc(
            corkX + corkW * (0.14 + ((i * 0.13) % 0.76)),
            corkY + corkH * (0.3 + ((i * 37) % 45) / 100),
            1.4 * dpr,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      } else if (shape === 'dome') {
        // Glass finial knob on top of bell cloche
        ctx.save();
        ctx.fillStyle = isNightFeel
          ? 'rgba(255,255,255,0.16)'
          : 'rgba(255,255,255,0.68)';
        ctx.strokeStyle = pal.border;
        ctx.lineWidth = 2.3 * dpr;
        ctx.beginPath();
        ctx.arc(jx + jw * 0.5, jy - 8 * dpr, 9.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // ===== INTERIOR CLIPPED VESSEL =====
      ctx.save();
      traceVesselPath(ctx, shape, jx, jy, jw, jh);
      ctx.clip();

      // Sky gradient adapted to ambiance
      const skyGrad = ctx.createLinearGradient(jx, jy, jx, jy + jh);
      if (amb === 'night') {
        skyGrad.addColorStop(0, '#162520');
        skyGrad.addColorStop(1, '#274036');
      } else if (amb === 'golden') {
        skyGrad.addColorStop(0, '#FDE9C9');
        skyGrad.addColorStop(1, '#E8D9B5');
      } else if (amb === 'rain') {
        skyGrad.addColorStop(0, pal.isDark ? '#1D2B2C' : '#E3EFEF');
        skyGrad.addColorStop(1, pal.isDark ? '#273A39' : '#D2E4DE');
      } else {
        skyGrad.addColorStop(0, pal.jarSkyTop);
        skyGrad.addColorStop(1, pal.jarSkyBottom);
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(jx, jy, jw, jh);

      // Sunbeam or Moonlight beam
      if (amb !== 'rain') {
        ctx.save();
        ctx.fillStyle =
          amb === 'golden'
            ? 'rgba(255, 200, 112, 0.24)'
            : isNightFeel
              ? 'rgba(242, 204, 108, 0.08)'
              : 'rgba(255, 252, 232, 0.44)';
        ctx.beginPath();
        ctx.moveTo(jx + jw * 0.16, jy);
        ctx.lineTo(jx + jw * 0.48, jy);
        ctx.lineTo(jx + jw * 0.76, jy + jh);
        ctx.lineTo(jx + jw * 0.32, jy + jh);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Default cozy ferns (softer if user already planted their own plants!)
      const activePlants = decors.filter((d) => d.kind === 'plant' && d.inJar);
      const activeRocks = decors.filter((d) => d.kind === 'rock' && d.inJar);
      const swayBoost = 1 + plantExciteRef.current * 1.6;
      const sway1 = Math.sin(t * 1.45) * 0.075 * swayBoost;
      const sway2 = Math.sin(t * 1.15 + 1.4) * 0.085 * swayBoost;

      ctx.save();
      if (activePlants.length > 0) ctx.globalAlpha = 0.65;
      drawFern(ctx, jx + jw * 0.22, jy + jh * 0.78, jh * 0.34, -0.26, sway1, pal.mossLight);
      drawFern(ctx, jx + jw * 0.78, jy + jh * 0.79, jh * 0.31, 0.3, sway2, pal.mossMain);
      ctx.restore();

      // Cozy wooden twig perch
      ctx.save();
      ctx.strokeStyle = pal.soil;
      ctx.lineWidth = 5.5 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(jx + jw * 0.14, jy + jh * 0.73);
      ctx.quadraticCurveTo(jx + jw * 0.4, jy + jh * 0.63, jx + jw * 0.6, jy + jh * 0.58);
      ctx.stroke();
      ctx.restore();

      // USER-DRAWN PLANTS (BACK LAYER with smart procedural expansion!)
      for (const plant of activePlants) {
        const spr = ensureSprite(plant.spriteDataUrl, '#FFFDF8');
        if (!spr.ready) continue;
        const rand = seededRand(plant.seed);
        const copies = plant.smartExpand ? 4 : 1;
        const baseSize = Math.min(jw, jh) * 0.24;

        for (let c = 0; c < copies; c++) {
          const isHero = c === copies - 1;
          const spread = isHero ? 0 : (rand() - 0.5) * 0.24;
          const nx = Math.max(0.14, Math.min(0.86, plant.anchorX + spread));
          const ny = mossHeightAt(nx, shape) + (isHero ? 0.015 : 0.025);
          const sc = isHero ? 1.0 : 0.58 + rand() * 0.36;
          const flip = !isHero && rand() > 0.5 ? -1 : 1;
          const tilt = isHero ? 0 : (rand() - 0.5) * 0.34;
          const phase = rand() * Math.PI * 2;
          const sw = Math.sin(t * (1.4 + rand() * 0.7) + phase) * 0.08 * swayBoost;

          const drawImg = isHero ? spr.raw : spr.tinted;
          const aspect = (drawImg.width || 1) / Math.max(1, drawImg.height || 1);
          const ph = baseSize * sc;
          const pw = ph * aspect;

          ctx.save();
          ctx.translate(jx + nx * jw, jy + ny * jh);
          ctx.rotate(tilt + sw);
          ctx.scale(flip, 1);
          if (!isHero) ctx.globalAlpha = 0.88;
          ctx.drawImage(drawImg, -pw * 0.5, -ph * 0.92, pw, ph);
          ctx.restore();

          // Tiny clever procedural sprout shoots peeking around expanded plants!
          if (plant.smartExpand && !isHero) {
            ctx.save();
            ctx.translate(jx + nx * jw + (rand() - 0.5) * 14 * dpr, jy + ny * jh);
            ctx.rotate(sw * 1.4 + (rand() - 0.5) * 0.4);
            ctx.strokeStyle = pal.mossLight;
            ctx.lineWidth = 2 * dpr;
            ctx.lineCap = 'round';
            const sh = (12 + rand() * 14) * dpr;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(4 * dpr, -sh * 0.55, 0, -sh);
            ctx.stroke();
            ctx.fillStyle = pal.mossLight;
            ctx.beginPath();
            ctx.arc(0, -sh, 2.4 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Rich textured soil layer
      ctx.fillStyle = pal.soil;
      ctx.beginPath();
      ctx.moveTo(jx, jy + jh * 0.79);
      ctx.quadraticCurveTo(jx + jw * 0.5, jy + jh * 0.72, jx + jw, jy + jh * 0.8);
      ctx.lineTo(jx + jw, jy + jh);
      ctx.lineTo(jx, jy + jh);
      ctx.closePath();
      ctx.fill();

      // Subtle darker deep earth band + cozy soil speckles
      ctx.fillStyle = 'rgba(34, 22, 14, 0.22)';
      ctx.beginPath();
      ctx.moveTo(jx, jy + jh * 0.88);
      ctx.quadraticCurveTo(jx + jw * 0.5, jy + jh * 0.84, jx + jw, jy + jh * 0.89);
      ctx.lineTo(jx + jw, jy + jh);
      ctx.lineTo(jx, jy + jh);
      ctx.closePath();
      ctx.fill();

      // HAND-ILLUSTRATED ORGANIC RIVER BOULDERS (replaces old uniform pebbles!)
      const stonePalette = isNightFeel
        ? [
            { f: '#665D56', h: 'rgba(182,175,162,0.22)', s: 'rgba(24,20,18,0.34)' },
            { f: '#535B54', h: 'rgba(155,175,158,0.22)', s: 'rgba(20,24,22,0.36)' },
            { f: '#74665A', h: 'rgba(195,180,164,0.2)', s: 'rgba(28,22,18,0.34)' },
          ]
        : [
            { f: '#C7B8A6', h: 'rgba(255,251,242,0.48)', s: 'rgba(82,66,52,0.22)' },
            { f: '#A99C8E', h: 'rgba(250,245,235,0.42)', s: 'rgba(66,54,44,0.24)' },
            { f: '#B8B2A2', h: 'rgba(255,252,244,0.44)', s: 'rgba(72,64,54,0.22)' },
          ];
      const stoneSpecs = [
        { nx: 0.14, ny: 0.91, rx: 0.082, ry: 0.044, seed: 101 },
        { nx: 0.28, ny: 0.94, rx: 0.064, ry: 0.036, seed: 202 },
        { nx: 0.43, ny: 0.91, rx: 0.092, ry: 0.048, seed: 303 },
        { nx: 0.6, ny: 0.945, rx: 0.072, ry: 0.038, seed: 404 },
        { nx: 0.74, ny: 0.91, rx: 0.088, ry: 0.046, seed: 505 },
        { nx: 0.87, ny: 0.935, rx: 0.068, ry: 0.036, seed: 606 },
      ];
      stoneSpecs.forEach((st, i) => {
        const sp = stonePalette[i % stonePalette.length];
        drawOrganicStone(
          ctx,
          jx + st.nx * jw,
          jy + st.ny * jh,
          st.rx * jw,
          st.ry * jh,
          st.seed,
          sp.f,
          sp.h,
          sp.s,
          'rgba(58, 44, 34, 0.35)',
          dpr
        );
      });

      // Rolling soft moss floor
      ctx.fillStyle = pal.mossMain;
      ctx.beginPath();
      ctx.moveTo(jx, jy + jh * 0.83);
      for (let s = 0; s <= 26; s++) {
        const nx = s / 26;
        ctx.lineTo(jx + nx * jw, jy + mossHeightAt(nx, shape) * jh);
      }
      ctx.lineTo(jx + jw, jy + jh * 0.85);
      ctx.closePath();
      ctx.fill();

      // Velvety moss highlight cushions
      ctx.fillStyle = pal.mossLight;
      for (let i = 0; i < 8; i++) {
        const nx = 0.12 + i * 0.11;
        ctx.beginPath();
        ctx.arc(
          jx + nx * jw,
          jy + mossHeightAt(nx, shape) * jh + 3 * dpr,
          jw * 0.045,
          Math.PI,
          0
        );
        ctx.fill();
      }

      // USER-PAINTED LIVING MOSS BLOBS
      const mossTones = [pal.mossMain, pal.mossLight, isNightFeel ? '#63A876' : '#85B869'];
      for (const blob of blobs) {
        ctx.fillStyle = mossTones[blob.tone % mossTones.length];
        ctx.beginPath();
        ctx.arc(
          jx + blob.x * jw,
          jy + blob.y * jh,
          blob.r * Math.min(jw, jh),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // USER-DRAWN ROCKS (with smart procedural companion stones + moss caps!)
      for (const rock of activeRocks) {
        const spr = ensureSprite(rock.spriteDataUrl, '#FFFDF8');
        if (!spr.ready) continue;
        const rand = seededRand(rock.seed);
        const count = rock.smartExpand ? 3 : 1;
        const baseSize = Math.min(jw, jh) * 0.17;

        for (let c = 0; c < count; c++) {
          const isHero = c === count - 1;
          const offset = isHero ? 0 : (c === 0 ? -1 : 1) * (0.07 + rand() * 0.06);
          const nx = Math.max(0.16, Math.min(0.84, rock.anchorX + offset));
          const ny = mossHeightAt(nx, shape) + (isHero ? 0.025 : 0.035);
          const sc = isHero ? 1.0 : 0.48 + rand() * 0.25;
          const flip = !isHero && rand() > 0.5 ? -1 : 1;
          const rot = isHero ? 0 : (rand() - 0.5) * 0.32;

          const drawImg = isHero ? spr.raw : spr.tinted;
          const aspect = (drawImg.width || 1) / Math.max(1, drawImg.height || 1);
          const rh = baseSize * sc;
          const rw = rh * aspect;

          ctx.save();
          ctx.translate(jx + nx * jw, jy + ny * jh);
          ctx.rotate(rot);
          ctx.scale(flip, 1);
          ctx.drawImage(drawImg, -rw * 0.5, -rh * 0.78, rw, rh);
          // Cozy little moss cap hugging the rock shoulder!
          if (rock.smartExpand) {
            ctx.fillStyle = pal.mossLight;
            ctx.beginPath();
            ctx.ellipse(-rw * 0.12, -rh * 0.72, rw * 0.26, rh * 0.14, -0.15, Math.PI, 0);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // ===== UPDATE & DRAW ALL LIVING BICHOS =====
      const bugScale = Math.max(0.66, Math.min(1.16, jw / (320 * dpr))) * dpr;

      for (const actor of actorsRef.current.values()) {
        if (actor.hop > 0) actor.hop = Math.max(0, actor.hop - dt * 2.0);
        if (actor.wobble > 0) actor.wobble = Math.max(0, actor.wobble - dt * 2.4);
        if (actor.emoteTimer > 0) actor.emoteTimer = Math.max(0, actor.emoteTimer - dt);

        let rot = 0;
        let sx = 1;
        let sy = 1;
        let hopLiftPx = Math.sin(actor.hop * Math.PI) * 22 * bugScale;

        if (actor.movement === 'pet_rock') {
          // Peaceful iconic Pet Rock! Never wanders, cozy breathe + poke wobble!
          actor.y = mossHeightAt(actor.x, shape) - 0.016;
          rot = Math.sin(actor.wobble * Math.PI * 3) * 0.16 * actor.wobble;
          sx = 1 + Math.sin(t * 1.4 + actor.phase) * 0.015;
          sy = 1 - Math.sin(t * 1.4 + actor.phase) * 0.015;
          hopLiftPx = Math.sin(actor.hop * Math.PI) * 8 * bugScale;
        } else if (actor.movement === 'flyer') {
          if (actor.perchTimer > 0) {
            actor.perchTimer -= dt;
            actor.y = mossHeightAt(actor.x, shape) - 0.03;
            sy = 1 + Math.sin(t * 4 + actor.phase) * 0.04;
          } else {
            actor.x += Math.cos(t * 0.75 + actor.phase) * 0.18 * dt;
            actor.x = Math.max(0.16, Math.min(0.84, actor.x));
            actor.y = 0.34 + Math.sin(t * 1.35 + actor.phase) * 0.14;
            actor.dir = Math.cos(t * 0.75 + actor.phase) >= 0 ? 1 : -1;
            const flutter = Math.sin(t * 16 + actor.phase);
            sy = 0.9 + Math.abs(flutter) * 0.18;
            rot = Math.sin(t * 3 + actor.phase) * 0.09;
            // Occasional rest on moss
            if (Math.random() < dt * 0.07) {
              actor.perchTimer = 2.4 + Math.random() * 2;
            }
          }
        } else if (actor.movement === 'hopper') {
          actor.hopCooldown -= dt;
          if (actor.hop <= 0 && actor.hopCooldown <= 0) {
            actor.hop = 1;
            actor.hopCooldown = 1.1 + Math.random() * 1.5;
            if (actor.x > 0.78) actor.dir = -1;
            else if (actor.x < 0.22) actor.dir = 1;
            else if (Math.random() < 0.35) actor.dir *= -1;
          }
          if (actor.hop > 0) {
            actor.x = Math.max(0.16, Math.min(0.84, actor.x + actor.dir * 0.16 * dt));
            hopLiftPx = Math.sin(actor.hop * Math.PI) * 52 * bugScale;
            sx = 0.88;
            sy = 1.16;
          } else if (actor.hopCooldown < 0.22) {
            // Anticipation squash before leaping!
            sx = 1.16;
            sy = 0.84;
          }
          actor.y = mossHeightAt(actor.x, shape) - 0.024;
        } else if (actor.movement === 'inchworm') {
          const cycle = (Math.sin(t * 4.8 + actor.phase) + 1) * 0.5;
          const stepSpeed = cycle > 0.45 ? 0.055 : 0.008;
          actor.x += actor.dir * stepSpeed * dt;
          if (actor.x > 0.82) {
            actor.x = 0.82;
            actor.dir = -1;
          } else if (actor.x < 0.18) {
            actor.x = 0.18;
            actor.dir = 1;
          }
          actor.y = mossHeightAt(actor.x, shape) - 0.022;
          sx = 0.84 + cycle * 0.34;
          sy = 1.18 - cycle * 0.28;
        } else if (actor.movement === 'climber') {
          const speed = 0.068;
          if (actor.wallMode === 'floor') {
            actor.x += actor.dir * speed * dt;
            actor.y = mossHeightAt(actor.x, shape) - 0.022;
            if (actor.x >= 0.88) {
              actor.x = 0.88;
              actor.wallMode = 'right';
              actor.wallY = actor.y;
              actor.vy = -speed * 1.1;
            } else if (actor.x <= 0.12) {
              actor.x = 0.12;
              actor.wallMode = 'left';
              actor.wallY = actor.y;
              actor.vy = -speed * 1.1;
            }
          } else if (actor.wallMode === 'right') {
            actor.wallY += actor.vy * dt;
            actor.x = 0.91;
            actor.y = actor.wallY;
            rot = actor.vy < 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
            if (actor.wallY < 0.26) actor.vy = Math.abs(actor.vy);
            if (actor.wallY >= mossHeightAt(0.88, shape) - 0.02) {
              actor.wallMode = 'floor';
              actor.dir = -1;
            }
          } else {
            actor.wallY += actor.vy * dt;
            actor.x = 0.09;
            actor.y = actor.wallY;
            rot = actor.vy < 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
            if (actor.wallY < 0.26) actor.vy = Math.abs(actor.vy);
            if (actor.wallY >= mossHeightAt(0.12, shape) - 0.02) {
              actor.wallMode = 'floor';
              actor.dir = 1;
            }
          }
          rot += Math.sin(t * 11 + actor.phase) * 0.05;
        } else {
          // Default Crawler
          actor.x += actor.vx * dt;
          if (actor.x > 0.82) {
            actor.x = 0.82;
            actor.vx = -Math.abs(actor.vx || 0.042);
            actor.dir = -1;
          } else if (actor.x < 0.18) {
            actor.x = 0.18;
            actor.vx = Math.abs(actor.vx || 0.042);
            actor.dir = 1;
          }
          actor.y = mossHeightAt(actor.x, shape) - 0.024;
          rot = Math.sin(t * 9 + actor.phase) * 0.07;
        }

        const px = jx + actor.x * jw;
        const py = jy + actor.y * jh;
        const isSelected = selId === actor.id;

        ctx.save();
        ctx.translate(px, py - hopLiftPx);

        // Contact shadow (skip when climbing wall)
        if (actor.wallMode === 'floor') {
          ctx.fillStyle = isNightFeel ? 'rgba(0,0,0,0.34)' : 'rgba(54,40,30,0.16)';
          ctx.beginPath();
          ctx.ellipse(
            0,
            13 * bugScale + hopLiftPx * 0.9,
            17 * bugScale * (1 - Math.min(0.4, actor.hop * 0.3)),
            4.5 * bugScale,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        if (isSelected) {
          ctx.strokeStyle = pal.accent;
          ctx.lineWidth = 2.4 * bugScale;
          ctx.setLineDash([4 * bugScale, 4 * bugScale]);
          ctx.beginPath();
          ctx.arc(0, -2 * bugScale, 28 * bugScale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.save();
        ctx.rotate(rot);
        const flip = actor.movement === 'pet_rock' ? 1 : actor.dir >= 0 ? 1 : -1;
        ctx.scale(flip * sx, sy);

        if (actor.isCustom && actor.custom) {
          const outlineColor = isNightFeel ? 'rgba(250,244,230,0.9)' : '#FFFDF8';
          const spr = ensureSprite(actor.custom.spriteDataUrl, outlineColor);
          if (spr.ready) {
            const imgToDraw = actor.custom.stickerOutline ? spr.sticker : spr.raw;
            const targetSize = 54 * bugScale * (actor.custom.scale || 1);
            const aspect =
              (imgToDraw.width || 1) / Math.max(1, imgToDraw.height || 1);
            const dw = aspect >= 1 ? targetSize : targetSize * aspect;
            const dh = aspect >= 1 ? targetSize / aspect : targetSize;
            ctx.drawImage(imgToDraw, -dw * 0.5, -dh * 0.62, dw, dh);
          }
        } else if (actor.sample) {
          drawSampleBug(ctx, actor, bugScale, t, pal);
        }
        ctx.restore();

        // Cozy emote bubble!
        if (actor.emote && actor.emoteTimer > 0) {
          const alpha = Math.min(1, actor.emoteTimer * 2);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#FFFDF8';
          ctx.strokeStyle = '#3A2E28';
          ctx.lineWidth = 1.8 * bugScale;
          const bw = Math.max(36, actor.emote.length * 9 + 18) * bugScale;
          const bh = 22 * bugScale;
          ctx.beginPath();
          ctx.roundRect(-bw / 2, -46 * bugScale, bw, bh, 10 * bugScale);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#3A2E28';
          ctx.font = `700 ${Math.round(11.5 * bugScale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(actor.emote, 0, -35 * bugScale);
          ctx.restore();
        }

        ctx.restore();
      }

      // AMBIANCE PARTICLES: Fireflies / Dust / Rain / Mist
      if (amb === 'rain') {
        ctx.save();
        ctx.strokeStyle = isNightFeel
          ? 'rgba(180, 224, 224, 0.35)'
          : 'rgba(105, 152, 168, 0.45)';
        ctx.lineWidth = 2 * dpr;
        ctx.lineCap = 'round';
        for (const r of rainRef.current) {
          r.y += r.speed * dt;
          if (r.y > 1.05) {
            r.y = -0.05;
            r.x = Math.random();
          }
          const rx = jx + r.x * jw;
          const ry = jy + r.y * jh;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3 * dpr, ry + r.len * jh);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        const moteCount = amb === 'night' ? 14 : 9;
        for (let i = 0; i < moteCount; i++) {
          const fx =
            jx + jw * (0.14 + ((i * 0.17 + Math.sin(t * 0.55 + i) * 0.07) % 0.72));
          const fy =
            jy + jh * (0.16 + ((i * 0.13 + Math.cos(t * 0.48 + i * 2) * 0.08) % 0.54));
          const glow = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.9 + i * 1.7));
          if (isNightFeel) {
            ctx.fillStyle = `rgba(247, 212, 98, ${0.26 * glow})`;
            ctx.beginPath();
            ctx.arc(fx, fy, 8 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 232, 130, ${0.95 * glow})`;
            ctx.beginPath();
            ctx.arc(fx, fy, 2.8 * dpr, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle =
              amb === 'golden'
                ? `rgba(255, 222, 132, ${0.8 * glow})`
                : `rgba(255, 250, 210, ${0.72 * glow})`;
            ctx.beginPath();
            ctx.arc(fx, fy, 2.3 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Active Mist Spritzer Droplets
      mistDropsRef.current = mistDropsRef.current.filter((m) => m.life > 0);
      for (const m of mistDropsRef.current) {
        m.y += m.vy * dt;
        m.life -= dt * 0.85;
        ctx.fillStyle = `rgba(170, 224, 240, ${Math.max(0, m.life * 0.85)})`;
        ctx.beginPath();
        ctx.arc(jx + m.x * jw, jy + m.y * jh, 3.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tap Ripples
      ripplesRef.current = ripplesRef.current.filter((r) => r.t < 0.7);
      for (const r of ripplesRef.current) {
        r.t += dt;
        const p = r.t / 0.7;
        ctx.strokeStyle = isNightFeel
          ? `rgba(242, 197, 92, ${1 - p})`
          : `rgba(255, 255, 255, ${0.9 * (1 - p)})`;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(r.x, r.y, (8 + p * 26) * dpr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Glass Reflections
      ctx.strokeStyle = isNightFeel
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(255, 255, 255, 0.64)';
      ctx.lineWidth = 5.5 * dpr;
      ctx.lineCap = 'round';
      if (shape === 'orb' || shape === 'teardrop') {
        ctx.beginPath();
        ctx.arc(
          jx + jw * 0.5,
          jy + jh * 0.55,
          jw * 0.41,
          Math.PI * 0.92,
          Math.PI * 1.24
        );
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(jx + 15 * dpr, jy + jh * 0.22);
        ctx.lineTo(jx + 15 * dpr, jy + jh * 0.56);
        ctx.stroke();
      }

      // Hex facet inner brass-feel lines
      if (shape === 'hex') {
        ctx.strokeStyle = isNightFeel
          ? 'rgba(240, 210, 140, 0.22)'
          : 'rgba(90, 74, 52, 0.2)';
        ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath();
        ctx.moveTo(jx + jw * 0.5, jy);
        ctx.lineTo(jx + jw * 0.28, jy + jh * 0.34);
        ctx.lineTo(jx + jw * 0.22, jy + jh);
        ctx.moveTo(jx + jw * 0.5, jy);
        ctx.lineTo(jx + jw * 0.72, jy + jh * 0.34);
        ctx.lineTo(jx + jw * 0.78, jy + jh);
        ctx.stroke();
      }

      ctx.restore(); // End vessel clip

      // ===== OUTER VESSEL RIM & BASE HARDWARE =====
      ctx.save();
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = (shape === 'terrarium_box' ? 4 : 2.6) * dpr;
      traceVesselPath(ctx, shape, jx, jy, jw, jh);
      ctx.stroke();

      if (shape === 'mason') {
        ctx.fillStyle = isNightFeel
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.roundRect(jx + jw * 0.22, jy - 5 * dpr, jw * 0.56, 12 * dpr, 6 * dpr);
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'dome') {
        // Warm turned wooden base plinth
        ctx.fillStyle = isNightFeel ? '#6B4A34' : '#9C6D49';
        ctx.beginPath();
        ctx.roundRect(
          jx - 10 * dpr,
          jy + jh - 6 * dpr,
          jw + 20 * dpr,
          18 * dpr,
          9 * dpr
        );
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'terrarium_box') {
        // Cozy wooden top & bottom diorama rails
        ctx.fillStyle = isNightFeel ? '#6B4A34' : '#A67852';
        ctx.beginPath();
        ctx.roundRect(jx - 5 * dpr, jy + jh - 8 * dpr, jw + 10 * dpr, 14 * dpr, 6 * dpr);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(jx - 5 * dpr, jy - 6 * dpr, jw + 10 * dpr, 11 * dpr, 5 * dpr);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const paintMossAtClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    const box = jarBoxRef.current;
    const nx = (px - box.x) / Math.max(1, box.w);
    const ny = (py - box.y) / Math.max(1, box.h);
    if (nx < 0.05 || nx > 0.95 || ny < 0.1 || ny > 0.96) return;

    if (
      lastMossPosRef.current &&
      Math.hypot(nx - lastMossPosRef.current.x, ny - lastMossPosRef.current.y) < 0.025
    ) {
      return;
    }
    lastMossPosRef.current = { x: nx, y: ny };
    propsRef.current.onAddMossBlob({
      x: nx,
      y: ny,
      r: 0.028 + Math.random() * 0.022,
      tone: Math.floor(Math.random() * 3) as 0 | 1 | 2,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (propsRef.current.mossPaintMode) {
      paintingMossRef.current = true;
      lastMossPosRef.current = null;
      e.currentTarget.setPointerCapture(e.pointerId);
      cozyTap('light');
      paintMossAtClient(e.clientX, e.clientY);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;

    ripplesRef.current.push({ x: px, y: py, t: 0 });
    const box = jarBoxRef.current;

    let hit: SimActor | null = null;
    let bestDist = 52 * dpr;

    for (const actor of actorsRef.current.values()) {
      const bx = box.x + actor.x * box.w;
      const by = box.y + actor.y * box.h;
      const dist = Math.hypot(px - bx, py - by);
      if (dist < bestDist) {
        bestDist = dist;
        hit = actor;
      }
    }

    if (hit) {
      cozyTap('medium');
      if (hit.movement === 'pet_rock') {
        const rockEmotes = ['...', '🪨', 'cozy', '♥', 'vibing', '🌿'];
        hit.wobble = 1;
        hit.hop = 0.4;
        hit.emote = rockEmotes[Math.floor(Math.random() * rockEmotes.length)];
        hit.emoteTimer = 2.2;
      } else {
        const bugEmotes = ['♥', 'hi!', '🌿', '✨', 'boing!'];
        hit.hop = 1;
        hit.emote = bugEmotes[Math.floor(Math.random() * bugEmotes.length)];
        hit.emoteTimer = 1.8;
      }

      if (hit.isCustom && hit.custom) {
        propsRef.current.onSelectBicho({
          id: hit.custom.id,
          isCustom: true,
          name: hit.custom.name,
          creator: hit.custom.creator,
          movement: hit.custom.movement,
          note: hit.custom.note,
          spriteDataUrl: hit.custom.spriteDataUrl,
          stamps: hit.custom.stamps,
        });
      } else if (hit.sample) {
        propsRef.current.onSelectBicho({
          id: hit.sample.id,
          isCustom: false,
          name: hit.sample.name,
          creator: hit.sample.creator,
          movement: hit.sample.movement,
          note: hit.sample.note,
          color: hit.sample.color,
          stamps: hit.sample.stamps,
        });
      }
    } else {
      cozyTap('light');
      plantExciteRef.current = 0.7;
      for (const actor of actorsRef.current.values()) {
        if (actor.movement !== 'pet_rock' && Math.random() < 0.45) {
          actor.hop = 0.5;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!paintingMossRef.current || !propsRef.current.mossPaintMode) return;
    paintMossAtClient(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    paintingMossRef.current = false;
    lastMossPosRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`terrarium-canvas ${mossPaintMode ? 'is-moss-painting' : ''}`}
      aria-label="Interactive Bichario terrarium"
    />
  );
};
