import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ArenaPreview } from './components/ArenaPreview';
import { ExportLabView } from './components/ExportLabView';
import {
  FullscreenIcon,
  HeartIcon,
  JarIcon,
  ScribbleIcon,
  SlidersIcon,
  StarIcon,
  ZipExportIcon,
} from './components/Icons';
import { MenuScribbler } from './components/MenuScribbler';
import { TinkerDrawer } from './components/TinkerDrawer';
import {
  AMBIANCE_OPTIONS,
  CURATED_DRAW_PALETTES,
  JAR_SHAPE_OPTIONS,
  LAYOUT_OPTIONS,
  THEMES,
} from './data/themes';
import {
  AmbianceMode,
  CustomBicho,
  CustomDecor,
  JarShape,
  LabTab,
  LayoutArchetype,
  MenuSketch,
  MossBlob,
  MovementStyle,
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

const APP_VERSION = '0.1.1';
const STORAGE_KEY = 'bichario.lab1.state.v1';

interface PersistedState {
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
  mossBlobs: MossBlob[];
  showStarters: boolean;
  lastCreator: string;
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
  const [fullScreen, setFullScreen] = useState<boolean>(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(
    initial.activeThemeId && THEMES.some((t) => t.id === initial.activeThemeId)
      ? initial.activeThemeId
      : THEMES[0].id
  );
  const [activeLayout, setActiveLayout] = useState<LayoutArchetype>(
    initial.activeLayout ?? 'dock'
  );
  const [activeJarShape, setActiveJarShape] = useState<JarShape>(
    initial.activeJarShape ?? 'mason'
  );
  const [activeAmbiance, setActiveAmbiance] = useState<AmbianceMode>(
    initial.activeAmbiance ?? 'sunny'
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
  const [customBichos, setCustomBichos] = useState<CustomBicho[]>(
    initial.customBichos ?? []
  );
  const [customDecors, setCustomDecors] = useState<CustomDecor[]>(
    initial.customDecors ?? []
  );
  const [mossBlobs, setMossBlobs] = useState<MossBlob[]>(initial.mossBlobs ?? []);
  const [showStarters, setShowStarters] = useState<boolean>(
    initial.showStarters ?? true
  );
  const [lastCreator, setLastCreator] = useState<string>(
    initial.lastCreator ?? 'Familia'
  );
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

  // Auto-save everything locally on device
  useEffect(() => {
    try {
      const payload: PersistedState = {
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
        mossBlobs,
        showStarters,
        lastCreator,
        globalNotes,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
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
    mossBlobs,
    showStarters,
    lastCreator,
    globalNotes,
  ]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const isDark = tab === 'arena' && Boolean(resolvedPalette.isDark);
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({
      color: tab === 'arena' && fullScreen ? resolvedPalette.bg : '#F6EFE2',
    }).catch(() => {});
  }, [tab, fullScreen, resolvedPalette.bg, resolvedPalette.isDark]);

  const handlePointerSeen = useCallback((pt: string) => {
    setPointerTypesSeen((prev) => (prev.includes(pt) ? prev : [...prev, pt]));
  }, []);

  const cycleLayout = () => {
    cozyTap('light');
    const idx = LAYOUT_OPTIONS.findIndex((l) => l.id === activeLayout);
    setActiveLayout(LAYOUT_OPTIONS[(idx + 1) % LAYOUT_OPTIONS.length].id);
  };

  const cycleJarShape = () => {
    cozyTap('light');
    const idx = JAR_SHAPE_OPTIONS.findIndex((j) => j.id === activeJarShape);
    setActiveJarShape(JAR_SHAPE_OPTIONS[(idx + 1) % JAR_SHAPE_OPTIONS.length].id);
  };

  const cycleAmbiance = () => {
    cozyTap('light');
    const idx = AMBIANCE_OPTIONS.findIndex((a) => a.id === activeAmbiance);
    setActiveAmbiance(AMBIANCE_OPTIONS[(idx + 1) % AMBIANCE_OPTIONS.length].id);
  };

  const handleSaveBicho = useCallback((bicho: CustomBicho) => {
    setLastCreator(bicho.creator);
    setCustomBichos((prev) => [bicho, ...prev]);
  }, []);

  const handleToggleCustomBichoStatus = useCallback((id: string) => {
    setCustomBichos((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: b.status === 'in_jar' ? 'resting' : 'in_jar' }
          : b
      )
    );
  }, []);

  const handleChangeCustomBichoMovement = useCallback(
    (id: string, movement: MovementStyle) => {
      setCustomBichos((prev) =>
        prev.map((b) => (b.id === id ? { ...b, movement } : b))
      );
    },
    []
  );

  const handleDeleteCustomBicho = useCallback((id: string) => {
    setCustomBichos((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleSaveDecor = useCallback((decor: CustomDecor) => {
    setLastCreator(decor.creator);
    setCustomDecors((prev) => [decor, ...prev]);
  }, []);

  const handleToggleDecorInJar = useCallback((id: string) => {
    setCustomDecors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, inJar: !d.inJar } : d))
    );
  }, []);

  const handleDeleteDecor = useCallback((id: string) => {
    setCustomDecors((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleAddMossBlob = useCallback((blob: MossBlob) => {
    setMossBlobs((prev) => (prev.length > 260 ? [...prev.slice(-240), blob] : [...prev, blob]));
  }, []);

  const handleUndoMoss = useCallback(() => {
    setMossBlobs((prev) => prev.slice(0, Math.max(0, prev.length - 8)));
  }, []);

  const handleClearMoss = useCallback(() => {
    setMossBlobs([]);
  }, []);

  const nonEmptySketchCount = sketches.filter((s) => s.strokes.length > 0).length;
  const isArenaFullscreen = tab === 'arena' && fullScreen;

  return (
    <div
      className={`app-root ${isArenaFullscreen ? 'is-fullscreen-mode' : ''}`}
      style={isArenaFullscreen ? { background: resolvedPalette.bg } : undefined}
      onPointerDown={(e) => handlePointerSeen(e.pointerType || 'unknown')}
    >
      {/* Top Slim Lab Hub Switcher (hidden in Full-Screen Mode!) */}
      {!isArenaFullscreen && (
        <header className="lab-topbar">
          <div className="lab-brand">
            <span className="brand-dot" />
            <strong>Bichario</strong>
            <small>1.1</small>
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
              <ScribbleIcon size={15} />
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
              <ZipExportIcon size={15} />
              <span>ZIP</span>
            </button>
          </nav>
        </header>
      )}

      {/* TAB 1: UI AESTHETIC ARENA & PLAYABLE BICHARIO */}
      {tab === 'arena' && (
        <main className="arena-main">
          {!fullScreen && (
            <>
              {/* Swipeable 12-Theme Strip */}
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
                    <SlidersIcon size={14} />
                    <span>Tinker</span>
                    {activeFeedback.stars > 0 && <em>★{activeFeedback.stars}</em>}
                  </button>
                  <button
                    type="button"
                    className="ribbon-pill fullscreen-trigger"
                    onClick={() => {
                      cozyTap('medium');
                      setFullScreen(true);
                    }}
                    title="Hide Lab buttons (Full-Screen App Mode)"
                    aria-label="Enter Full-Screen Mode"
                  >
                    <FullscreenIcon size={15} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* LIVE PLAYABLE BICHARIO STAGE */}
          <div className="arena-stage-wrap" style={themeVars}>
            {fullScreen && (
              <button
                type="button"
                className="exit-fullscreen-pill"
                onClick={() => {
                  cozyTap('light');
                  setFullScreen(false);
                }}
                aria-label="Show Lab Controls"
              >
                <SlidersIcon size={12} />
                <span>Lab</span>
              </button>
            )}

            <ArenaPreview
              theme={activeTheme}
              overrides={activeOverrides}
              layout={activeLayout}
              jarShape={activeJarShape}
              ambiance={activeAmbiance}
              screen={activeScreen}
              drawPaletteId={activeDrawPaletteId}
              customBichos={customBichos}
              customDecors={customDecors}
              mossBlobs={mossBlobs}
              showStarters={showStarters}
              lastCreator={lastCreator}
              onChangeScreen={setActiveScreen}
              onChangeDrawPalette={setActiveDrawPaletteId}
              onCycleJarShape={cycleJarShape}
              onCycleAmbiance={cycleAmbiance}
              onSaveBicho={handleSaveBicho}
              onToggleCustomBichoStatus={handleToggleCustomBichoStatus}
              onChangeCustomBichoMovement={handleChangeCustomBichoMovement}
              onDeleteCustomBicho={handleDeleteCustomBicho}
              onSaveDecor={handleSaveDecor}
              onToggleDecorInJar={handleToggleDecorInJar}
              onDeleteDecor={handleDeleteDecor}
              onAddMossBlob={handleAddMossBlob}
              onUndoMoss={handleUndoMoss}
              onClearMoss={handleClearMoss}
              onToggleShowStarters={() => setShowStarters((v) => !v)}
              onPointerSeen={handlePointerSeen}
            />
          </div>

          <TinkerDrawer
            open={tinkerOpen}
            onClose={() => setTinkerOpen(false)}
            theme={activeTheme}
            overrides={activeOverrides}
            feedback={activeFeedback}
            layout={activeLayout}
            jarShape={activeJarShape}
            ambiance={activeAmbiance}
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
            onChangeJarShape={setActiveJarShape}
            onChangeAmbiance={setActiveAmbiance}
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
            activeJarShape={activeJarShape}
            activeAmbiance={activeAmbiance}
            activeDrawPaletteId={activeDrawPaletteId}
            overridesByTheme={overridesByTheme}
            feedbackByTheme={feedbackByTheme}
            sketches={sketches}
            customBichos={customBichos}
            customDecors={customDecors}
            mossCount={mossBlobs.length}
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
