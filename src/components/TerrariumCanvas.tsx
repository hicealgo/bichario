import React, { useEffect, useRef } from 'react';
import { SAMPLE_BICHOS } from '../data/themes';
import { SampleBicho, ThemePalette } from '../types';
import { cozyTap } from '../utils/haptics';

interface TerrariumCanvasProps {
  palette: ThemePalette;
  selectedBichoId: string | null;
  onSelectBicho: (bicho: SampleBicho) => void;
  stickerOutline?: boolean;
}

interface LiveBug {
  bicho: SampleBicho;
  x: number; // normalized 0..1 inside jar
  y: number;
  vx: number;
  dir: number;
  phase: number;
  hop: number;
  emote: string | null;
  emoteTimer: number;
}

interface Ripple {
  x: number;
  y: number;
  t: number;
}

export const TerrariumCanvas: React.FC<TerrariumCanvasProps> = ({
  palette,
  selectedBichoId,
  onSelectBicho,
  stickerOutline = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef(palette);
  const selectedRef = useRef(selectedBichoId);
  const stickerRef = useRef(stickerOutline);
  const onSelectRef = useRef(onSelectBicho);

  paletteRef.current = palette;
  selectedRef.current = selectedBichoId;
  stickerRef.current = stickerOutline;
  onSelectRef.current = onSelectBicho;

  const bugsRef = useRef<LiveBug[]>([
    {
      bicho: SAMPLE_BICHOS[0], // Rolo beetle
      x: 0.34,
      y: 0.72,
      vx: 0.045,
      dir: 1,
      phase: 0.4,
      hop: 0,
      emote: null,
      emoteTimer: 0,
    },
    {
      bicho: SAMPLE_BICHOS[1], // Mimi inchworm
      x: 0.64,
      y: 0.76,
      vx: -0.032,
      dir: -1,
      phase: 2.1,
      hop: 0,
      emote: null,
      emoteTimer: 0,
    },
    {
      bicho: SAMPLE_BICHOS[2], // Lulú moth
      x: 0.52,
      y: 0.36,
      vx: 0.05,
      dir: 1,
      phase: 1.2,
      hop: 0,
      emote: null,
      emoteTimer: 0,
    },
    {
      bicho: SAMPLE_BICHOS[3], // Boli pillbug
      x: 0.22,
      y: 0.79,
      vx: 0.022,
      dir: 1,
      phase: 4.0,
      hop: 0,
      emote: null,
      emoteTimer: 0,
    },
  ]);

  const ripplesRef = useRef<Ripple[]>([]);
  const jarBoxRef = useRef({ x: 0, y: 0, w: 1, h: 1 });

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

    const mossHeightAt = (nx: number) => {
      // Gentle rolling mossy floor inside jar (normalized jar Y)
      return (
        0.74 -
        Math.sin(nx * Math.PI) * 0.075 +
        Math.sin(nx * Math.PI * 3.2 + 0.7) * 0.024
      );
    };

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

    const drawBug = (
      ctx: CanvasRenderingContext2D,
      bug: LiveBug,
      px: number,
      py: number,
      scale: number,
      time: number,
      pal: ThemePalette
    ) => {
      const isSelected = selectedRef.current === bug.bicho.id;
      const hopOffset = Math.sin(bug.hop * Math.PI) * 20 * scale;

      ctx.save();
      ctx.translate(px, py - hopOffset);

      // Soft contact shadow
      ctx.fillStyle = pal.isDark ? 'rgba(0,0,0,0.34)' : 'rgba(54,40,30,0.16)';
      ctx.beginPath();
      ctx.ellipse(
        0,
        13 * scale + hopOffset * 0.9,
        16 * scale * (1 - bug.hop * 0.25),
        4.5 * scale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Selection soft halo
      if (isSelected) {
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 2.5 * scale;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.beginPath();
        ctx.arc(0, -2 * scale, 26 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const flip = bug.dir >= 0 ? 1 : -1;
      ctx.scale(flip, 1);

      const ink = '#332722';
      const strokeOutline = (drawShape: () => void) => {
        if (stickerRef.current) {
          ctx.save();
          ctx.lineWidth = 7.5 * scale;
          ctx.strokeStyle = pal.isDark ? 'rgba(250,244,230,0.88)' : '#FFFDF8';
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          drawShape();
          ctx.stroke();
          ctx.restore();
        }
      };

      if (bug.bicho.kind === 'beetle') {
        const bob = Math.sin(time * 9 + bug.phase) * 1.4 * scale;
        ctx.translate(0, bob);

        // Little wiggling legs
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.2 * scale;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const swing = Math.sin(time * 12 + bug.phase + i * 1.4) * 2.5 * scale;
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
        ctx.fillStyle = bug.bicho.color;
        shell();
        ctx.fill();
        ctx.lineWidth = 2.2 * scale;
        ctx.strokeStyle = ink;
        ctx.stroke();

        // Cozy polka spots
        ctx.fillStyle = bug.bicho.spotColor;
        ctx.beginPath();
        ctx.arc(-5 * scale, -3 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.arc(1 * scale, 2 * scale, 2.3 * scale, 0, Math.PI * 2);
        ctx.arc(-8 * scale, 3 * scale, 1.9 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Cute head + antennae + eyes
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
      } else if (bug.bicho.kind === 'inchworm') {
        const arch = (Math.sin(time * 5.2 + bug.phase) + 1) * 0.5;
        const segments = 5;
        const drawSegs = () => {
          for (let i = 0; i < segments; i++) {
            const t = i / (segments - 1);
            const sx = (t - 0.5) * (24 - arch * 6) * scale;
            const sy = -Math.sin(t * Math.PI) * arch * 8 * scale + 3 * scale;
            ctx.beginPath();
            ctx.arc(sx, sy, (5.5 + (i === segments - 1 ? 1.2 : 0)) * scale, 0, Math.PI * 2);
            if (i === 0) continue;
          }
        };

        // Sticker halo around each segment
        if (stickerRef.current) {
          for (let i = 0; i < segments; i++) {
            const t = i / (segments - 1);
            const sx = (t - 0.5) * (24 - arch * 6) * scale;
            const sy = -Math.sin(t * Math.PI) * arch * 8 * scale + 3 * scale;
            ctx.fillStyle = pal.isDark ? 'rgba(250,244,230,0.88)' : '#FFFDF8';
            ctx.beginPath();
            ctx.arc(sx, sy, 8.8 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        void drawSegs;

        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          const sx = (t - 0.5) * (24 - arch * 6) * scale;
          const sy = -Math.sin(t * Math.PI) * arch * 8 * scale + 3 * scale;
          const r = (5.4 + (i === segments - 1 ? 1.3 : 0)) * scale;
          ctx.fillStyle = i % 2 === 0 ? bug.bicho.color : bug.bicho.spotColor;
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
      } else if (bug.bicho.kind === 'moth') {
        const flap = Math.sin(time * 14 + bug.phase);
        const wingScaleY = 0.55 + Math.abs(flap) * 0.55;

        const wings = () => {
          ctx.beginPath();
          ctx.ellipse(-6 * scale, -3 * scale, 11 * scale, 8 * scale * wingScaleY, -0.35, 0, Math.PI * 2);
          ctx.ellipse(6 * scale, -3 * scale, 11 * scale, 8 * scale * wingScaleY, 0.35, 0, Math.PI * 2);
        };
        strokeOutline(wings);

        ctx.fillStyle = bug.bicho.color;
        wings();
        ctx.fill();
        ctx.lineWidth = 2 * scale;
        ctx.strokeStyle = ink;
        ctx.stroke();

        // Wing spots
        ctx.fillStyle = bug.bicho.spotColor;
        ctx.beginPath();
        ctx.arc(-8 * scale, -3 * scale, 2.7 * scale, 0, Math.PI * 2);
        ctx.arc(8 * scale, -3 * scale, 2.7 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Fuzzy body
        ctx.fillStyle = '#4B3A33';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * scale, 9 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Plumed antennae
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.moveTo(-1.5 * scale, -8 * scale);
        ctx.quadraticCurveTo(-5 * scale, -14 * scale, -7 * scale, -12 * scale);
        ctx.moveTo(1.5 * scale, -8 * scale);
        ctx.quadraticCurveTo(5 * scale, -14 * scale, 7 * scale, -12 * scale);
        ctx.stroke();
      } else {
        // Sleepy pillbug
        const curled = bug.hop > 0.05;
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
        ctx.fillStyle = bug.bicho.color;
        body();
        ctx.fill();
        ctx.lineWidth = 2.1 * scale;
        ctx.strokeStyle = ink;
        ctx.stroke();

        // Cozy armor stripes
        ctx.strokeStyle = bug.bicho.spotColor;
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(-4 * scale, -3 * scale);
        ctx.lineTo(-4 * scale, 6 * scale);
        ctx.moveTo(3 * scale, -3 * scale);
        ctx.lineTo(3 * scale, 6 * scale);
        ctx.stroke();

        // Sleepy eye
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.arc(9 * scale, 2 * scale, 2.2 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }

      // Cozy emote bubble!
      if (bug.emote && bug.emoteTimer > 0) {
        ctx.scale(flip, 1); // unflip text
        const alpha = Math.min(1, bug.emoteTimer * 2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFFDF8';
        ctx.strokeStyle = '#3A2E28';
        ctx.lineWidth = 1.8 * scale;
        const bw = 34 * scale;
        const bh = 22 * scale;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -40 * scale, bw, bh, 10 * scale);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#3A2E28';
        ctx.font = `700 ${Math.round(12 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bug.emote, 0, -29 * scale);
        ctx.restore();
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const pal = paletteRef.current;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      ctx.clearRect(0, 0, w, h);

      // Compute centered glass jar proportions (room above for cork, room below for dock)
      const padX = w * 0.08;
      const topLidH = Math.min(h * 0.1, 40 * dpr);
      const bottomSafe = Math.min(h * 0.14, 78 * dpr);
      const availH = h - bottomSafe - topLidH;
      const jw = Math.min(w - padX * 2, availH * 0.88);
      const jh = Math.min(availH * 0.94, jw * 1.18);
      const jx = (w - jw) * 0.5;
      const jy = topLidH + (availH - jh) * 0.46;
      jarBoxRef.current = { x: jx, y: jy, w: jw, h: jh };

      // Ground drop shadow under jar
      ctx.save();
      ctx.fillStyle = pal.isDark ? 'rgba(0,0,0,0.42)' : 'rgba(60, 48, 36, 0.11)';
      ctx.beginPath();
      ctx.ellipse(jx + jw * 0.5, jy + jh + 8 * dpr, jw * 0.42, 11 * dpr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cork lid
      const corkW = jw * 0.46;
      const corkH = Math.max(18 * dpr, jh * 0.085);
      const corkX = jx + (jw - corkW) * 0.5;
      const corkY = jy - corkH * 0.72;

      ctx.save();
      ctx.fillStyle = pal.isDark ? '#8C6245' : '#C79667';
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 2.4 * dpr;
      ctx.beginPath();
      ctx.roundRect(corkX, corkY, corkW, corkH, [12 * dpr, 12 * dpr, 5 * dpr, 5 * dpr]);
      ctx.fill();
      ctx.stroke();

      // Subtle cork grain speckles
      ctx.fillStyle = 'rgba(60, 38, 22, 0.22)';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(
          corkX + corkW * (0.14 + (i * 0.11) % 0.78),
          corkY + corkH * (0.28 + ((i * 37) % 50) / 100),
          1.4 * dpr,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();

      // Glass jar interior clip
      const jarR = Math.min(jw, jh) * 0.22;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(jx, jy, jw, jh, jarR);
      ctx.clip();

      // Jar sky/interior gradient
      const skyGrad = ctx.createLinearGradient(jx, jy, jx, jy + jh);
      skyGrad.addColorStop(0, pal.jarSkyTop);
      skyGrad.addColorStop(1, pal.jarSkyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(jx, jy, jw, jh);

      // Soft angled sunbeam
      ctx.save();
      ctx.fillStyle = pal.isDark
        ? 'rgba(242, 197, 92, 0.06)'
        : 'rgba(255, 252, 232, 0.44)';
      ctx.beginPath();
      ctx.moveTo(jx + jw * 0.18, jy);
      ctx.lineTo(jx + jw * 0.48, jy);
      ctx.lineTo(jx + jw * 0.74, jy + jh);
      ctx.lineTo(jx + jw * 0.34, jy + jh);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Background swaying fern fronds
      const sway1 = Math.sin(t * 1.4) * 0.08;
      const sway2 = Math.sin(t * 1.1 + 1.4) * 0.09;
      drawFern(
        ctx,
        jx + jw * 0.24,
        jy + jh * 0.78,
        jh * 0.38,
        -0.28,
        sway1,
        pal.mossLight
      );
      drawFern(
        ctx,
        jx + jw * 0.76,
        jy + jh * 0.79,
        jh * 0.34,
        0.32,
        sway2,
        pal.mossMain
      );
      drawFern(
        ctx,
        jx + jw * 0.56,
        jy + jh * 0.74,
        jh * 0.26,
        0.08,
        -sway1 * 0.8,
        pal.mossLight
      );

      // Cozy wooden twig perch
      ctx.save();
      ctx.strokeStyle = pal.soil;
      ctx.lineWidth = 6 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(jx + jw * 0.14, jy + jh * 0.72);
      ctx.quadraticCurveTo(jx + jw * 0.42, jy + jh * 0.62, jx + jw * 0.62, jy + jh * 0.56);
      ctx.stroke();
      ctx.restore();

      // Soil + pebble layer at bottom
      ctx.fillStyle = pal.soil;
      ctx.beginPath();
      ctx.moveTo(jx, jy + jh * 0.79);
      ctx.quadraticCurveTo(jx + jw * 0.5, jy + jh * 0.71, jx + jw, jy + jh * 0.8);
      ctx.lineTo(jx + jw, jy + jh);
      ctx.lineTo(jx, jy + jh);
      ctx.closePath();
      ctx.fill();

      // Smooth river pebbles at very bottom
      const pebbleColors = pal.isDark
        ? ['#5F564F', '#74675D', '#4A433D']
        : ['#C7B7A3', '#A89784', '#DCD0BE'];
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = pebbleColors[i % pebbleColors.length];
        ctx.beginPath();
        ctx.ellipse(
          jx + jw * (0.1 + i * 0.1),
          jy + jh * (0.925 + (i % 2) * 0.02),
          jw * 0.062,
          jh * 0.032,
          (i % 3 - 1) * 0.18,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Rolling soft moss cushion layer
      ctx.fillStyle = pal.mossMain;
      ctx.beginPath();
      ctx.moveTo(jx, jy + jh * 0.82);
      for (let s = 0; s <= 24; s++) {
        const nx = s / 24;
        ctx.lineTo(jx + nx * jw, jy + mossHeightAt(nx) * jh);
      }
      ctx.lineTo(jx + jw, jy + jh * 0.86);
      ctx.closePath();
      ctx.fill();

      // Highlight tufts on moss
      ctx.fillStyle = pal.mossLight;
      for (let i = 0; i < 7; i++) {
        const nx = 0.15 + i * 0.115;
        ctx.beginPath();
        ctx.arc(
          jx + nx * jw,
          jy + mossHeightAt(nx) * jh + 3 * dpr,
          jw * 0.048,
          Math.PI,
          0
        );
        ctx.fill();
      }

      // Update & draw bichos!
      const bugScale = Math.max(0.68, Math.min(1.18, jw / (320 * dpr))) * dpr;
      for (const bug of bugsRef.current) {
        if (bug.hop > 0) {
          bug.hop = Math.max(0, bug.hop - dt * 2.1);
        }
        if (bug.emoteTimer > 0) {
          bug.emoteTimer = Math.max(0, bug.emoteTimer - dt);
        }

        if (bug.bicho.kind === 'moth') {
          bug.x = 0.5 + Math.sin(t * 0.72 + bug.phase) * 0.27;
          bug.y = 0.36 + Math.sin(t * 1.44 + bug.phase) * 0.11;
          bug.dir = Math.cos(t * 0.72 + bug.phase) >= 0 ? 1 : -1;
        } else {
          bug.x += bug.vx * dt;
          if (bug.x > 0.82) {
            bug.x = 0.82;
            bug.vx = -Math.abs(bug.vx);
            bug.dir = -1;
          } else if (bug.x < 0.18) {
            bug.x = 0.18;
            bug.vx = Math.abs(bug.vx);
            bug.dir = 1;
          }
          bug.y = mossHeightAt(bug.x) - 0.025;
        }

        drawBug(
          ctx,
          bug,
          jx + bug.x * jw,
          jy + bug.y * jh,
          bugScale,
          t,
          pal
        );
      }

      // Floating sunlit dust motes / fireflies
      for (let i = 0; i < 9; i++) {
        const fx = jx + jw * (0.16 + ((i * 0.19 + Math.sin(t * 0.5 + i) * 0.06) % 0.7));
        const fy = jy + jh * (0.18 + ((i * 0.13 + Math.cos(t * 0.45 + i * 2) * 0.07) % 0.52));
        const glow = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.8 + i * 1.7));
        ctx.fillStyle = pal.isDark
          ? `rgba(245, 206, 98, ${0.85 * glow})`
          : `rgba(255, 250, 210, ${0.75 * glow})`;
        ctx.beginPath();
        ctx.arc(fx, fy, (pal.isDark ? 3.2 : 2.2) * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tap dewdrop ripples
      ripplesRef.current = ripplesRef.current.filter((r) => r.t < 0.7);
      for (const r of ripplesRef.current) {
        r.t += dt;
        const p = r.t / 0.7;
        ctx.strokeStyle = pal.isDark
          ? `rgba(242, 197, 92, ${1 - p})`
          : `rgba(255, 255, 255, ${0.9 * (1 - p)})`;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(r.x, r.y, (8 + p * 26) * dpr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Curved glass reflections
      ctx.strokeStyle = pal.isDark
        ? 'rgba(255, 255, 255, 0.16)'
        : 'rgba(255, 255, 255, 0.68)';
      ctx.lineWidth = 6 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(jx + 15 * dpr, jy + jarR * 0.85);
      ctx.lineTo(jx + 15 * dpr, jy + jh * 0.56);
      ctx.stroke();

      ctx.lineWidth = 3 * dpr;
      ctx.beginPath();
      ctx.moveTo(jx + 15 * dpr, jy + jh * 0.62);
      ctx.lineTo(jx + 15 * dpr, jy + jh * 0.68);
      ctx.stroke();

      ctx.restore(); // end interior clip

      // Glass jar outer outline
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 2.6 * dpr;
      ctx.beginPath();
      ctx.roundRect(jx, jy, jw, jh, jarR);
      ctx.stroke();

      // Glass lip collar
      ctx.strokeStyle = pal.border;
      ctx.fillStyle = pal.isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.roundRect(
        jx + jw * 0.22,
        jy - 5 * dpr,
        jw * 0.56,
        12 * dpr,
        6 * dpr
      );
      ctx.fill();
      ctx.stroke();

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;

    ripplesRef.current.push({ x: px, y: py, t: 0 });
    const box = jarBoxRef.current;

    const emotes = ['♥', 'hi!', '🌿', '✨', 'zZz'];
    let hit: LiveBug | null = null;
    let bestDist = 48 * dpr;

    for (const bug of bugsRef.current) {
      const bx = box.x + bug.x * box.w;
      const by = box.y + bug.y * box.h;
      const dist = Math.hypot(px - bx, py - by);
      if (dist < bestDist) {
        bestDist = dist;
        hit = bug;
      }
    }

    if (hit) {
      cozyTap('medium');
      hit.hop = 1;
      hit.emote = emotes[Math.floor(Math.random() * emotes.length)];
      hit.emoteTimer = 1.8;
      onSelectRef.current(hit.bicho);
    } else {
      cozyTap('light');
      // Nearby bugs gently perk up!
      for (const bug of bugsRef.current) {
        if (Math.random() < 0.45) {
          bug.hop = 0.55;
        }
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className="terrarium-canvas"
      aria-label="Interactive Bichario terrarium preview"
    />
  );
};
