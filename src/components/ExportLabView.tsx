import React, { useState } from 'react';
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
import { exportLabZip, ExportResult } from '../utils/exportZip';
import { cozyTap } from '../utils/haptics';
import { HeartIcon, StarIcon, ZipExportIcon } from './Icons';

interface ExportLabViewProps {
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
  onChangeGlobalNotes: (val: string) => void;
  onJumpToTheme: (id: string) => void;
  onJumpToScribbler: () => void;
}

const ROADMAP = [
  { v: 'v0.1.0', title: 'Lab 1 · UI Aesthetic Arena & Menu Scribbler', state: 'DONE' },
  {
    v: 'v0.1.1',
    title: 'Lab 1.1 · Local Bicho/Plant/Rock Drawing, 6 Jars, Pet Rock & Fullscreen',
    state: 'LIVE',
  },
  { v: 'v0.2.0', title: 'Lab 2 · Pro Brushes, Multi-part Wings/Legs & Sound', state: 'NEXT' },
  { v: 'v0.3.0', title: 'Lab 3 · Deep Animation & Cozy-Light Physics Sandbox', state: 'SOON' },
  { v: 'v0.4.0', title: 'Lab 4 · Firebase Shared Family Jars, Passports & Admin', state: 'SOON' },
];

export const ExportLabView: React.FC<ExportLabViewProps> = ({
  appVersion,
  activeThemeId,
  activeLayout,
  activeJarShape,
  activeAmbiance,
  activeDrawPaletteId,
  overridesByTheme,
  feedbackByTheme,
  sketches,
  customBichos,
  customDecors,
  mossCount,
  globalNotes,
  pointerTypesSeen,
  onChangeGlobalNotes,
  onJumpToTheme,
  onJumpToScribbler,
}) => {
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];
  const activeLayoutInfo =
    LAYOUT_OPTIONS.find((l) => l.id === activeLayout) ?? LAYOUT_OPTIONS[0];
  const activeJarInfo =
    JAR_SHAPE_OPTIONS.find((j) => j.id === activeJarShape) ?? JAR_SHAPE_OPTIONS[0];
  const activeAmbInfo =
    AMBIANCE_OPTIONS.find((a) => a.id === activeAmbiance) ?? AMBIANCE_OPTIONS[0];
  const activePalette =
    CURATED_DRAW_PALETTES.find((p) => p.id === activeDrawPaletteId) ??
    CURATED_DRAW_PALETTES[0];

  const nonEmptySketches = sketches.filter((s) => s.strokes.length > 0);
  const ratedThemes = THEMES.filter(
    (t) =>
      (feedbackByTheme[t.id]?.stars ?? 0) > 0 ||
      feedbackByTheme[t.id]?.favorite ||
      Boolean(feedbackByTheme[t.id]?.note?.trim())
  );

  const handleExport = async () => {
    cozyTap('medium');
    setExporting(true);
    setErrorMsg(null);
    try {
      const res = await exportLabZip({
        appVersion,
        activeThemeId,
        activeLayout,
        activeJarShape,
        activeAmbiance,
        activeDrawPaletteId,
        overridesByTheme,
        feedbackByTheme,
        sketches: nonEmptySketches,
        customBichos,
        customDecors,
        mossCount,
        globalNotes,
        pointerTypesSeen,
      });
      setLastResult(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-view">
      <div className="export-card hero-export-card">
        <div className="export-badge-row">
          <span className="version-badge">Bichario Lab · v{appVersion}</span>
          <span className="zip-contents-tag">manifest + bichos + decor + sketches</span>
        </div>
        <h2>Export Your Taste Pack</h2>
        <p>
          Generates a single <code>.zip</code> with your active theme, jar shape, sliders,
          ratings, hand-drawn bichos/plants/rocks, and every menu sketch you drew!
        </p>

        <button
          type="button"
          className="export-cta-btn"
          onClick={handleExport}
          disabled={exporting}
        >
          <ZipExportIcon size={21} />
          <span>{exporting ? 'Packing .zip...' : 'Export Lab 1.1 (.zip)'}</span>
        </button>

        {lastResult && (
          <div className="export-success-box">
            <strong>Packed: {lastResult.filename}</strong>
            <small>
              {lastResult.mode === 'android-share'
                ? 'Opened Android Share Sheet — save to Downloads/Drive or send directly to your PC!'
                : 'Downloaded directly to your browser Downloads folder.'}
            </small>
          </div>
        )}

        {errorMsg && <div className="export-error-box">{errorMsg}</div>}
      </div>

      {/* Current selections summary */}
      <div className="export-card">
        <h3>Current Snapshot</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <small>Active Theme</small>
            <strong>{activeTheme.name}</strong>
          </div>
          <div className="summary-item">
            <small>Jar Shape & Mood</small>
            <strong>
              {activeJarInfo.short} · {activeAmbInfo.icon}
            </strong>
          </div>
          <div className="summary-item">
            <small>Menu Layout</small>
            <strong>{activeLayoutInfo.name}</strong>
          </div>
          <div className="summary-item">
            <small>Draw Palette</small>
            <strong>{activePalette.name}</strong>
          </div>
          <div className="summary-item">
            <small>Our Bichos</small>
            <strong>{customBichos.length} drawn</strong>
          </div>
          <div className="summary-item">
            <small>Plants, Rocks & Moss</small>
            <strong>
              {customDecors.length} · {mossCount} moss
            </strong>
          </div>
        </div>

        <label className="global-note-label">
          <span>Overall thoughts / wild ideas for Bichario</span>
          <textarea
            className="cozy-textarea"
            rows={3}
            placeholder="e.g. Love Bell Dome jar + Pet Rock mode! Let's make bichos sleep under plants next..."
            value={globalNotes}
            onChange={(e) => onChangeGlobalNotes(e.target.value)}
          />
        </label>
      </div>

      {/* Hand-drawn Bichos preview */}
      {customBichos.length > 0 && (
        <div className="export-card">
          <h3>Our Drawn Bichos ({customBichos.length})</h3>
          <div className="sketch-thumb-grid">
            {customBichos.map((b) => (
              <div key={b.id} className="sketch-thumb-card">
                <img
                  src={b.spriteDataUrl}
                  alt={b.name}
                  style={{ objectFit: 'contain', background: '#FAF4E6', padding: 8 }}
                />
                <strong>{b.name}</strong>
                <small>
                  {b.movement} · by {b.creator}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme ratings digest */}
      <div className="export-card">
        <div className="card-head-row">
          <h3>
            Theme Ratings ({ratedThemes.length}/{THEMES.length})
          </h3>
        </div>
        <div className="ratings-list">
          {THEMES.map((t) => {
            const fb = feedbackByTheme[t.id];
            return (
              <button
                key={t.id}
                type="button"
                className="rating-row-item"
                onClick={() => onJumpToTheme(t.id)}
              >
                <span
                  className="rating-swatch"
                  style={{
                    background: t.palette.bg,
                    borderColor: t.palette.border,
                  }}
                >
                  <i style={{ background: t.palette.accent }} />
                </span>
                <div className="rating-row-text">
                  <strong>{t.name}</strong>
                  <small>{fb?.note?.trim() || t.vibeTag}</small>
                </div>
                <div className="rating-row-score">
                  {fb?.favorite && (
                    <span className="mini-heart">
                      <HeartIcon size={14} filled />
                    </span>
                  )}
                  <span className="mini-stars">
                    <StarIcon size={14} filled={(fb?.stars ?? 0) > 0} />
                    {fb?.stars ?? 0}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu sketches digest */}
      <div className="export-card">
        <div className="card-head-row">
          <h3>Scribbled Menu Sketches ({nonEmptySketches.length})</h3>
          <button type="button" className="link-btn" onClick={onJumpToScribbler}>
            Open Scribbler →
          </button>
        </div>
        {nonEmptySketches.length === 0 ? (
          <p className="empty-hint">
            No sketches drawn yet! Hop into the <strong>Scribble</strong> tab to sketch your
            own menu ideas on top of the jar.
          </p>
        ) : (
          <div className="sketch-thumb-grid">
            {nonEmptySketches.map((sk) => (
              <div key={sk.id} className="sketch-thumb-card">
                {sk.previewDataUrl ? (
                  <img src={sk.previewDataUrl} alt={sk.title} />
                ) : (
                  <div className="sketch-thumb-fallback">{sk.strokes.length} strokes</div>
                )}
                <strong>{sk.title}</strong>
                <small>{sk.template}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lab Roadmap */}
      <div className="export-card roadmap-card">
        <h3>Bichario Lab Roadmap</h3>
        <ul className="roadmap-list">
          {ROADMAP.map((item) => (
            <li key={item.v} className={item.state === 'LIVE' ? 'is-live' : ''}>
              <span className="rm-ver">{item.v}</span>
              <span className="rm-title">{item.title}</span>
              <span className={`rm-pill state-${item.state.toLowerCase()}`}>
                {item.state}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
