import React, { useState } from 'react';
import { CURATED_DRAW_PALETTES, LAYOUT_OPTIONS, THEMES } from '../data/themes';
import {
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
  activeDrawPaletteId: string;
  overridesByTheme: Record<string, StyleOverrides>;
  feedbackByTheme: Record<string, ThemeFeedback>;
  sketches: MenuSketch[];
  globalNotes: string;
  pointerTypesSeen: string[];
  onChangeGlobalNotes: (val: string) => void;
  onJumpToTheme: (id: string) => void;
  onJumpToScribbler: () => void;
}

const ROADMAP = [
  { v: 'v0.1.0', title: 'Lab 1 · UI Aesthetic Arena & Menu Scribbler', state: 'LIVE' },
  { v: 'v0.2.0', title: 'Lab 2 · Bicho Drawing, Brushes & Curated Palettes', state: 'NEXT' },
  { v: 'v0.3.0', title: 'Lab 3 · Bring-It-To-Life Animation & Cozy Physics', state: 'SOON' },
  { v: 'v0.4.0', title: 'Lab 4 · Living Terrarium, Moss Brush & Plants', state: 'SOON' },
  { v: 'v0.5.0', title: 'Lab 5 · Bichodex, Passports & Firebase Family Jars', state: 'SOON' },
];

export const ExportLabView: React.FC<ExportLabViewProps> = ({
  appVersion,
  activeThemeId,
  activeLayout,
  activeDrawPaletteId,
  overridesByTheme,
  feedbackByTheme,
  sketches,
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
        activeDrawPaletteId,
        overridesByTheme,
        feedbackByTheme,
        sketches: nonEmptySketches,
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
          <span className="zip-contents-tag">manifest.json + feedback.md + PNGs</span>
        </div>
        <h2>Export Your Taste Pack</h2>
        <p>
          Generates a single <code>.zip</code> with your active theme, feel sliders, star
          ratings, notes, and every menu sketch you drew — ready to send right back!
        </p>

        <button
          type="button"
          className="export-cta-btn"
          onClick={handleExport}
          disabled={exporting}
        >
          <ZipExportIcon size={21} />
          <span>{exporting ? 'Packing .zip...' : 'Export Lab 1 (.zip)'}</span>
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
            <small>Menu Layout</small>
            <strong>{activeLayoutInfo.name}</strong>
          </div>
          <div className="summary-item">
            <small>Draw Palette</small>
            <strong>{activePalette.name}</strong>
          </div>
          <div className="summary-item">
            <small>Menu Sketches</small>
            <strong>{nonEmptySketches.length} drawn</strong>
          </div>
        </div>

        <label className="global-note-label">
          <span>Overall thoughts / wild ideas for Bichario</span>
          <textarea
            className="cozy-textarea"
            rows={3}
            placeholder="e.g. Combine Stickerbook outlines with Musgo & Papel colors, put Draw button bigger for my daughters..."
            value={globalNotes}
            onChange={(e) => onChangeGlobalNotes(e.target.value)}
          />
        </label>
      </div>

      {/* Theme ratings digest */}
      <div className="export-card">
        <div className="card-head-row">
          <h3>Theme Ratings ({ratedThemes.length}/{THEMES.length})</h3>
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
