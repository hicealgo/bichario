import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ArenaPreview } from './components/ArenaPreview';
import { ExportLabView } from './components/ExportLabView';
import {
  HeartIcon,
  JarIcon,
  ScribbleIcon,
  SlidersIcon,
  StarIcon,
  ZipExportIcon,
} from './components/Icons';
import { MenuScribbler } from './components/MenuScribbler';
import { TinkerDrawer } from './components/TinkerDrawer';
import { CURATED_DRAW_PALETTES, LAYOUT_OPTIONS, THEMES } from './data/themes';
import {
  LabTab,
  LayoutArchetype,
  MenuSketch,
  PreviewScreen,
  StyleOverrides,
  ThemeFeedback,
} from './types';
import { cozyTap } from './utils/haptics';
import {
  buildThemeVars,
  defaultOverridesForTheme,
  resolvePalette,
} from './utils/themeCss';

const APP_VERSION = '0.1.0';
const STORAGE_KEY = 'bichario.lab1.state.v1';

interface PersistedState {
  activeThemeId: string;
  activeLayout: LayoutArchetype;
  activeDrawPaletteId: string;
  overridesByTheme: Record<string, StyleOverrides>;
  feedbackByTheme: Record<string, ThemeFeedback>;
  sketches: MenuSketch[];
  globalNotes: string;
}

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

export const App: React.FC = () => {
  const initial = useMemo(() => loadPersisted(), []);

  const [tab, setTab] = useState<LabTab>('arena');
  const [activeThemeId, setActiveThemeId] = useState<string>(
    initial.activeThemeId && THEMES.some((t) => t.id === initial.activeThemeId)
      ? initial.activeThemeId
      : THEMES[0].id
  );
  const [activeLayout, setActiveLayout] = useState<LayoutArchetype>(
    initial.activeLayout ?? 'dock'
  );
  const [activeScreen, setActiveScreen] = useState<PreviewScreen>('terrarium');
  const [activeDrawPaletteId, setActiveDrawPaletteId] = useState<string>(
    initial.activeDrawPaletteId ?? CURATED_DRAW_PALETTES[0].id
  );
  const [overridesByTheme, setOverridesByTheme] = useState<
    Record<string, StyleOverrides>
  >(initial.overridesByTheme ?? {});
  const [feedbackByTheme, setFeedbackByTheme] = useState<
    Record<string, ThemeFeedback>
  >(initial.feedbackByTheme ?? {});
  const [sketches, setSketches] = useState<MenuSketch[]>(initial.sketches ?? []);
  const [globalNotes, setGlobalNotes] = useState<string>(
    initial.globalNotes ?? ''
  );
  const [tinkerOpen, setTinkerOpen] = useState<boolean>(false);
  const [pointerTypesSeen, setPointerTypesSeen] = useState<string[]>([]);

  const activeTheme = useMemo(
    () => THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0],
    [activeThemeId]
  );

  const activeOverrides = useMemo(
    () => overridesByTheme[activeTheme.id] ?? defaultOverridesForTheme(activeTheme),
    [overridesByTheme, activeTheme]
  );

  const activeFeedback = useMemo<ThemeFeedback>(
    () =>
      feedbackByTheme[activeTheme.id] ?? {
        stars: 0,
        favorite: false,
        note: '',
      },
    [feedbackByTheme, activeTheme.id]
  );

  const themeVars = useMemo(
    () => buildThemeVars(activeTheme, activeOverrides),
    [activeTheme, activeOverrides]
  );

  const resolvedPalette = useMemo(
    () => resolvePalette(activeTheme, activeOverrides),
    [activeTheme, activeOverrides]
  );

  // Persist user tinkering automatically
  useEffect(() => {
    try {
      const payload: PersistedState = {
        activeThemeId,
        activeLayout,
        activeDrawPaletteId,
        overridesByTheme,
        feedbackByTheme,
        sketches,
        globalNotes,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    activeThemeId,
    activeLayout,
    activeDrawPaletteId,
    overridesByTheme,
    feedbackByTheme,
    sketches,
    globalNotes,
  ]);

  // Keep Android Status Bar harmonized
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const isDark = tab === 'arena' && Boolean(resolvedPalette.isDark);
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({
      color: tab === 'arena' ? resolvedPalette.bg : '#F6EFE2',
    }).catch(() => {});
  }, [tab, resolvedPalette.bg, resolvedPalette.isDark]);

  const handlePointerSeen = useCallback((pt: string) => {
    setPointerTypesSeen((prev) => (prev.includes(pt) ? prev : [...prev, pt]));
  }, []);

  const cycleLayout = () => {
    cozyTap('light');
    const idx = LAYOUT_OPTIONS.findIndex((l) => l.id === activeLayout);
    const next = LAYOUT_OPTIONS[(idx + 1) % LAYOUT_OPTIONS.length];
    setActiveLayout(next.id);
  };

  const nonEmptySketchCount = sketches.filter((s) => s.strokes.length > 0).length;

  return (
    <div
      className={`app-root ${tab === 'arena' && resolvedPalette.isDark ? 'is-dark-shell' : ''}`}
      onPointerDown={(e) => handlePointerSeen(e.pointerType || 'unknown')}
    >
      {/* Top Slim Lab Hub Switcher (leaves bottom free for testing Bichario's real mobile nav!) */}
      <header className="lab-topbar">
        <div className="lab-brand">
          <span className="brand-dot" />
          <strong>Bichario</strong>
          <small>Lab 1</small>
        </div>

        <nav className="lab-tabs" aria-label="Lab sections">
          <button
            type="button"
            className={`lab-tab-btn ${tab === 'arena' ? 'is-active' : ''}`}
            onClick={() => {
              cozyTap('light');
              setTab('arena');
            }}
          >
            <JarIcon size={15} />
            <span>Arena</span>
          </button>
          <button
            type="button"
            className={`lab-tab-btn ${tab === 'scribbler' ? 'is-active' : ''}`}
            onClick={() => {
              cozyTap('light');
              setTab('scribbler');
            }}
          >
            <ScribbleIcon size={16} />
            <span>Scribble</span>
            {nonEmptySketchCount > 0 && (
              <em className="tab-count">{nonEmptySketchCount}</em>
            )}
          </button>
          <button
            type="button"
            className={`lab-tab-btn ${tab === 'export' ? 'is-active' : ''}`}
            onClick={() => {
              cozyTap('light');
              setTab('export');
            }}
          >
            <ZipExportIcon size={16} />
            <span>ZIP</span>
          </button>
        </nav>
      </header>

      {/* TAB 1: UI AESTHETIC ARENA */}
      {tab === 'arena' && (
        <main className="arena-main">
          {/* Swipeable 8-Theme Strip */}
          <div className="theme-strip" role="listbox" aria-label="Choose visual theme">
            {THEMES.map((t) => {
              const isSelected = t.id === activeTheme.id;
              const fb = feedbackByTheme[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`theme-pill ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    cozyTap('light');
                    setActiveThemeId(t.id);
                  }}
                >
                  <span
                    className="theme-pill-swatch"
                    style={{
                      background: t.palette.bg,
                      borderColor: t.palette.border,
                    }}
                  >
                    <i style={{ background: t.palette.accent }} />
                  </span>
                  <span className="theme-pill-label">{t.name}</span>
                  {fb?.favorite && (
                    <span className="pill-badge-heart">
                      <HeartIcon size={11} filled />
                    </span>
                  )}
                  {(fb?.stars ?? 0) > 0 && !fb?.favorite && (
                    <span className="pill-badge-star">
                      <StarIcon size={11} filled />
                      {fb.stars}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Compact Arena Control Ribbon */}
          <div className="arena-ribbon">
            <div className="screen-seg">
              {(
                [
                  { id: 'terrarium', label: 'Jar' },
                  { id: 'draw', label: 'Draw' },
                  { id: 'bichodex', label: 'Dex' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`seg-mini ${activeScreen === s.id ? 'is-active' : ''}`}
                  onClick={() => {
                    cozyTap('light');
                    setActiveScreen(s.id);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="ribbon-right">
              <button
                type="button"
                className="ribbon-pill"
                onClick={cycleLayout}
                title="Cycle menu layout pattern"
              >
                {LAYOUT_OPTIONS.find((l) => l.id === activeLayout)?.short} ↻
              </button>
              <button
                type="button"
                className="ribbon-pill tinker-trigger"
                onClick={() => {
                  cozyTap('medium');
                  setTinkerOpen(true);
                }}
              >
                <SlidersIcon size={15} />
                <span>Tinker</span>
                {activeFeedback.stars > 0 && (
                  <em>★{activeFeedback.stars}</em>
                )}
              </button>
            </div>
          </div>

          {/* LIVE INTERACTIVE BICHARIO STAGE */}
          <div className="arena-stage-wrap" style={themeVars}>
            <ArenaPreview
              theme={activeTheme}
              overrides={activeOverrides}
              layout={activeLayout}
              screen={activeScreen}
              drawPaletteId={activeDrawPaletteId}
              onChangeScreen={setActiveScreen}
            />
          </div>

          <TinkerDrawer
            open={tinkerOpen}
            onClose={() => setTinkerOpen(false)}
            theme={activeTheme}
            overrides={activeOverrides}
            feedback={activeFeedback}
            layout={activeLayout}
            drawPaletteId={activeDrawPaletteId}
            onChangeOverrides={(next) =>
              setOverridesByTheme((prev) => ({ ...prev, [activeTheme.id]: next }))
            }
            onResetOverrides={() =>
              setOverridesByTheme((prev) => {
                const copy = { ...prev };
                delete copy[activeTheme.id];
                return copy;
              })
            }
            onChangeFeedback={(next) =>
              setFeedbackByTheme((prev) => ({ ...prev, [activeTheme.id]: next }))
            }
            onChangeLayout={setActiveLayout}
            onChangeDrawPalette={setActiveDrawPaletteId}
          />
        </main>
      )}

      {/* TAB 2: MENU SCRIBBLER STUDIO */}
      {tab === 'scribbler' && (
        <main className="scribbler-main">
          <MenuScribbler
            sketches={sketches}
            onSaveSketches={setSketches}
            onPointerSeen={handlePointerSeen}
          />
        </main>
      )}

      {/* TAB 3: EXPORT ZIP & ROADMAP */}
      {tab === 'export' && (
        <main className="export-main">
          <ExportLabView
            appVersion={APP_VERSION}
            activeThemeId={activeThemeId}
            activeLayout={activeLayout}
            activeDrawPaletteId={activeDrawPaletteId}
            overridesByTheme={overridesByTheme}
            feedbackByTheme={feedbackByTheme}
            sketches={sketches}
            globalNotes={globalNotes}
            pointerTypesSeen={pointerTypesSeen}
            onChangeGlobalNotes={setGlobalNotes}
            onJumpToTheme={(id) => {
              setActiveThemeId(id);
              setTab('arena');
              setTinkerOpen(true);
            }}
            onJumpToScribbler={() => setTab('scribbler')}
          />
        </main>
      )}
    </div>
  );
};

export default App;
