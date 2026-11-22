import type { CSSProperties } from 'react';
import { StyleOverrides, ThemePalette, ThemeSpec } from '../types';

export function defaultOverridesForTheme(theme: ThemeSpec): StyleOverrides {
  return {
    radius: theme.radius,
    borderWidth: theme.borderWidth,
    shadowStyle: theme.shadowStyle,
    texture: theme.texture,
    comfortScale: 'balanced',
    squish: theme.squish,
    organicRadius: theme.organicRadius,
    customColors: {},
  };
}

export function resolvePalette(theme: ThemeSpec, overrides: StyleOverrides): ThemePalette {
  return {
    ...theme.palette,
    ...overrides.customColors,
  };
}

export function buildThemeVars(theme: ThemeSpec, overrides: StyleOverrides): CSSProperties {
  const p = resolvePalette(theme, overrides);
  const r = overrides.radius;
  const bw = overrides.borderWidth;

  const cardRadius = overrides.organicRadius
    ? `${Math.max(6, r + 3)}px ${Math.max(6, r - 4)}px ${Math.max(6, r + 2)}px ${Math.max(6, r - 3)}px / ${Math.max(6, r - 3)}px ${Math.max(6, r + 2)}px ${Math.max(6, r - 4)}px ${Math.max(6, r + 3)}px`
    : `${r}px`;

  const btnRadius = overrides.organicRadius
    ? `${Math.max(8, r + 2)}px ${Math.max(8, r - 2)}px ${Math.max(8, r + 1)}px ${Math.max(8, r - 3)}px`
    : `${Math.min(999, Math.round(r * 1.15))}px`;

  const borderStyle = theme.borderDashed && bw > 0 ? 'dashed' : 'solid';

  let cardShadow = 'none';
  let btnShadow = 'none';
  let btnActiveShadow = 'none';

  if (overrides.shadowStyle === 'cartoon') {
    cardShadow = `0 5px 0 ${p.border}`;
    btnShadow = `0 4px 0 ${p.border}`;
    btnActiveShadow = `0 1px 0 ${p.border}`;
  } else if (overrides.shadowStyle === 'clay') {
    const shade = p.isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(58, 42, 32, 0.14)';
    const hi = p.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.85)';
    const rim = p.isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(68, 47, 39, 0.14)';
    cardShadow = `0 10px 24px -6px ${shade}, inset 0 2px 0 ${hi}, inset 0 -3px 0 ${rim}`;
    btnShadow = `0 7px 14px -4px ${shade}, inset 0 2px 0 ${hi}, inset 0 -3px 0 ${rim}`;
    btnActiveShadow = `0 2px 5px -2px ${shade}, inset 0 2px 3px ${rim}`;
  } else if (overrides.shadowStyle === 'soft') {
    const shade = p.isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(54, 42, 32, 0.12)';
    cardShadow = `0 10px 26px -8px ${shade}, 0 2px 6px -2px ${shade}`;
    btnShadow = `0 6px 14px -4px ${shade}`;
    btnActiveShadow = `0 2px 4px -2px ${shade}`;
  } else {
    cardShadow = 'none';
    btnShadow = 'none';
    btnActiveShadow = 'none';
  }

  const scaleFactor =
    overrides.comfortScale === 'compact'
      ? 0.92
      : overrides.comfortScale === 'cozy'
        ? 1.1
        : 1.0;

  const squishPx = Math.round((overrides.squish / 100) * 3.5 * 10) / 10;
  const squishScale = (1 - (overrides.squish / 100) * 0.045).toFixed(3);

  return {
    '--b-bg': p.bg,
    '--b-bg-alt': p.bgAlt,
    '--b-surface': p.surface,
    '--b-surface-tint': p.surfaceTint,
    '--b-ink': p.ink,
    '--b-ink-muted': p.inkMuted,
    '--b-accent': p.accent,
    '--b-accent-ink': p.accentInk,
    '--b-secondary': p.secondary,
    '--b-secondary-ink': p.secondaryInk,
    '--b-warm': p.warm,
    '--b-border': p.border,
    '--b-font-display': theme.displayFont,
    '--b-font-body': theme.bodyFont,
    '--b-font-mono': theme.monoFont,
    '--b-radius': `${r}px`,
    '--b-card-radius': cardRadius,
    '--b-btn-radius': btnRadius,
    '--b-border-w': `${bw}px`,
    '--b-border-style': borderStyle,
    '--b-card-shadow': cardShadow,
    '--b-btn-shadow': btnShadow,
    '--b-btn-active-shadow': btnActiveShadow,
    '--b-scale': `${scaleFactor}`,
    '--b-squish-y': `${squishPx}px`,
    '--b-squish-scale': squishScale,
    '--b-backdrop-blur': theme.glassSurface ? '12px' : '0px',
    '--b-sticker-ring': theme.stickerRim ? `0 0 0 3px #ffffff` : 'none',
  } as CSSProperties;
}
