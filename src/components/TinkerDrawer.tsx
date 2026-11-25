import React from 'react';
import {
  AMBIANCE_OPTIONS,
  CURATED_DRAW_PALETTES,
  JAR_SHAPE_OPTIONS,
  LAYOUT_OPTIONS,
} from '../data/themes';
import {
  AmbianceMode,
  ComfortScale,
  JarShape,
  LayoutArchetype,
  ShadowStyle,
  StyleOverrides,
  SurfaceTexture,
  ThemeFeedback,
  ThemeSpec,
} from '../types';
import { cozyTap } from '../utils/haptics';
import { resolvePalette } from '../utils/themeCss';
import { HeartIcon, StarIcon } from './Icons';

interface TinkerDrawerProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeSpec;
  overrides: StyleOverrides;
  feedback: ThemeFeedback;
  layout: LayoutArchetype;
  jarShape: JarShape;
  ambiance: AmbianceMode;
  drawPaletteId: string;
  onChangeOverrides: (next: StyleOverrides) => void;
  onResetOverrides: () => void;
  onChangeFeedback: (next: ThemeFeedback) => void;
  onChangeLayout: (next: LayoutArchetype) => void;
  onChangeJarShape: (next: JarShape) => void;
  onChangeAmbiance: (next: AmbianceMode) => void;
  onChangeDrawPalette: (id: string) => void;
}

export const TinkerDrawer: React.FC<TinkerDrawerProps> = ({
  open,
  onClose,
  theme,
  overrides,
  feedback,
  layout,
  jarShape,
  ambiance,
  drawPaletteId,
  onChangeOverrides,
  onResetOverrides,
  onChangeFeedback,
  onChangeLayout,
  onChangeJarShape,
  onChangeAmbiance,
  onChangeDrawPalette,
}) => {
  if (!open) return null;

  const pal = resolvePalette(theme, overrides);

  const patch = (partial: Partial<StyleOverrides>) =>
    onChangeOverrides({ ...overrides, ...partial });

  const patchColor = (key: 'bg' | 'surface' | 'accent' | 'ink', value: string) =>
    onChangeOverrides({
      ...overrides,
      customColors: {
        ...overrides.customColors,
        [key]: value,
      },
    });

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <section
        className="tinker-sheet"
        onClick={(e) => e.stopPropagation()}
        aria-label="Tinker and rate theme"
      >
        <div className="sheet-header">
          <div>
            <h3>
              {theme.name} <small>({theme.subtitle})</small>
            </h3>
            <p className="sheet-desc">{theme.description}</p>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close tinker sheet"
          >
            Done
          </button>
        </div>

        <div className="sheet-scroll">
          {/* Rate & Note this Theme */}
          <div className="sheet-block">
            <div className="block-title-row">
              <strong>Rate this vibe</strong>
              <button
                type="button"
                className={`fav-pill ${feedback.favorite ? 'is-fav' : ''}`}
                onClick={() => {
                  cozyTap('medium');
                  onChangeFeedback({ ...feedback, favorite: !feedback.favorite });
                }}
              >
                <HeartIcon size={15} filled={feedback.favorite} />
                <span>{feedback.favorite ? 'Top Pick' : 'Favorite'}</span>
              </button>
            </div>
            <div className="star-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star-btn ${feedback.stars >= n ? 'is-lit' : ''}`}
                  onClick={() => {
                    cozyTap('light');
                    onChangeFeedback({
                      ...feedback,
                      stars: feedback.stars === n ? 0 : n,
                    });
                  }}
                  aria-label={`Rate ${n} stars`}
                >
                  <StarIcon size={24} filled={feedback.stars >= n} />
                </button>
              ))}
              <span className="star-label">
                {feedback.stars ? `${feedback.stars}/5` : 'Tap to rate'}
              </span>
            </div>
            <textarea
              className="cozy-textarea"
              rows={2}
              placeholder={`Notes on "${theme.name}" (e.g. love the font, want warmer moss...)`}
              value={feedback.note}
              onChange={(e) => onChangeFeedback({ ...feedback, note: e.target.value })}
            />
          </div>

          {/* Jar Vessel Shape Variants (6!) */}
          <div className="sheet-block">
            <strong>Terrarium Jar Shape (6 Variants)</strong>
            <div className="chip-grid">
              {JAR_SHAPE_OPTIONS.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  className={`tinker-chip ${jarShape === j.id ? 'is-active' : ''}`}
                  onClick={() => {
                    cozyTap('light');
                    onChangeJarShape(j.id);
                  }}
                >
                  {j.short}
                </button>
              ))}
            </div>
            <small className="helper-text">
              {JAR_SHAPE_OPTIONS.find((j) => j.id === jarShape)?.desc}
            </small>

            <div className="sub-row" style={{ marginTop: 4 }}>
              <span>Weather & Ambiance</span>
              <div className="seg-row">
                {AMBIANCE_OPTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`seg-btn ${ambiance === a.id ? 'is-active' : ''}`}
                    onClick={() => {
                      cozyTap('light');
                      onChangeAmbiance(a.id);
                    }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Menu Layout Archetype */}
          <div className="sheet-block">
            <strong>Menu Layout Pattern</strong>
            <div className="chip-grid">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`tinker-chip ${layout === opt.id ? 'is-active' : ''}`}
                  onClick={() => {
                    cozyTap('light');
                    onChangeLayout(opt.id);
                  }}
                >
                  <span>{opt.short}</span>
                </button>
              ))}
            </div>
            <small className="helper-text">
              {LAYOUT_OPTIONS.find((l) => l.id === layout)?.desc}
            </small>
          </div>

          {/* Live Feel Sliders */}
          <div className="sheet-block">
            <div className="block-title-row">
              <strong>Live UI Feel Sliders</strong>
              <button
                type="button"
                className="text-reset-btn"
                onClick={() => {
                  cozyTap('light');
                  onResetOverrides();
                }}
              >
                Reset defaults
              </button>
            </div>

            <label className="slider-row">
              <span>
                Roundness <b>{overrides.radius}px</b>
              </span>
              <input
                type="range"
                min={6}
                max={34}
                step={1}
                value={overrides.radius}
                onChange={(e) => patch({ radius: Number(e.target.value) })}
              />
            </label>

            <label className="slider-row">
              <span>
                Outline Weight <b>{overrides.borderWidth}px</b>
              </span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.5}
                value={overrides.borderWidth}
                onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
              />
            </label>

            <label className="slider-row">
              <span>
                Button Squishiness <b>{overrides.squish}%</b>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={overrides.squish}
                onChange={(e) => patch({ squish: Number(e.target.value) })}
              />
            </label>

            <div className="sub-row">
              <span>Shadow Feel</span>
              <div className="seg-row">
                {(['cartoon', 'clay', 'soft', 'flat'] as ShadowStyle[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`seg-btn ${overrides.shadowStyle === s ? 'is-active' : ''}`}
                    onClick={() => {
                      cozyTap('light');
                      patch({ shadowStyle: s });
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="sub-row">
              <span>Paper / Surface Texture</span>
              <div className="seg-row">
                {(['none', 'paper', 'dots', 'linen'] as SurfaceTexture[]).map((tx) => (
                  <button
                    key={tx}
                    type="button"
                    className={`seg-btn ${overrides.texture === tx ? 'is-active' : ''}`}
                    onClick={() => {
                      cozyTap('light');
                      patch({ texture: tx });
                    }}
                  >
                    {tx}
                  </button>
                ))}
              </div>
            </div>

            <div className="sub-row">
              <span>Finger Comfort Size</span>
              <div className="seg-row">
                {(['compact', 'balanced', 'cozy'] as ComfortScale[]).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    className={`seg-btn ${overrides.comfortScale === sc ? 'is-active' : ''}`}
                    onClick={() => {
                      cozyTap('light');
                      patch({ comfortScale: sc });
                    }}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={overrides.organicRadius}
                onChange={(e) => patch({ organicRadius: e.target.checked })}
              />
              <span>Hand-drawn slightly uneven corners</span>
            </label>
          </div>

          {/* Core Swatch Tweaks */}
          <div className="sheet-block">
            <strong>Nudge Theme Colors</strong>
            <div className="swatch-edit-grid">
              {(
                [
                  { key: 'bg', label: 'Backdrop', val: pal.bg },
                  {
                    key: 'surface',
                    label: 'Cards',
                    val: pal.surface.startsWith('#') ? pal.surface : '#FFFDF7',
                  },
                  { key: 'accent', label: 'Accent', val: pal.accent },
                  { key: 'ink', label: 'Ink', val: pal.ink },
                ] as const
              ).map((item) => (
                <label key={item.key} className="swatch-picker">
                  <input
                    type="color"
                    value={item.val}
                    onChange={(e) => patchColor(item.key, e.target.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Curated Drawing Palettes */}
          <div className="sheet-block">
            <strong>Curated Bicho Drawing Palette</strong>
            <div className="draw-pal-list">
              {CURATED_DRAW_PALETTES.map((dp) => (
                <button
                  key={dp.id}
                  type="button"
                  className={`draw-pal-card ${drawPaletteId === dp.id ? 'is-active' : ''}`}
                  onClick={() => {
                    cozyTap('light');
                    onChangeDrawPalette(dp.id);
                  }}
                >
                  <div className="draw-pal-head">
                    <strong>{dp.name}</strong>
                    <small>{dp.tagline}</small>
                  </div>
                  <div className="draw-pal-dots">
                    {dp.colors.map((c) => (
                      <span key={c.hex} style={{ background: c.hex }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
