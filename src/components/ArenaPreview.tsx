import React, { useState } from 'react';
import {
  AMBIANCE_OPTIONS,
  JAR_SHAPE_OPTIONS,
  MOVEMENT_OPTIONS,
  SAMPLE_BICHOS,
} from '../data/themes';
import {
  AmbianceMode,
  CustomBicho,
  CustomDecor,
  JarShape,
  LayoutArchetype,
  MossBlob,
  MovementStyle,
  PreviewScreen,
  SampleBicho,
  StyleOverrides,
  ThemeSpec,
} from '../types';
import { cozyTap } from '../utils/haptics';
import { resolvePalette } from '../utils/themeCss';
import { DrawStudio } from './DrawStudio';
import {
  BichodexIcon,
  BrushIcon,
  DropletIcon,
  JarIcon,
  MossLeafIcon,
  PassportIcon,
  SatchelIcon,
  TrashIcon,
} from './Icons';
import { ActiveBichoSelection, TerrariumCanvas } from './TerrariumCanvas';

interface ArenaPreviewProps {
  theme: ThemeSpec;
  overrides: StyleOverrides;
  layout: LayoutArchetype;
  jarShape: JarShape;
  ambiance: AmbianceMode;
  screen: PreviewScreen;
  drawPaletteId: string;
  customBichos: CustomBicho[];
  customDecors: CustomDecor[];
  mossBlobs: MossBlob[];
  showStarters: boolean;
  lastCreator: string;
  onChangeScreen: (screen: PreviewScreen) => void;
  onChangeDrawPalette: (id: string) => void;
  onCycleJarShape: () => void;
  onCycleAmbiance: () => void;
  onSaveBicho: (bicho: CustomBicho) => void;
  onToggleCustomBichoStatus: (id: string) => void;
  onChangeCustomBichoMovement: (id: string, movement: MovementStyle) => void;
  onDeleteCustomBicho: (id: string) => void;
  onSaveDecor: (decor: CustomDecor) => void;
  onToggleDecorInJar: (id: string) => void;
  onDeleteDecor: (id: string) => void;
  onAddMossBlob: (blob: MossBlob) => void;
  onUndoMoss: () => void;
  onClearMoss: () => void;
  onToggleShowStarters: () => void;
  onPointerSeen: (pt: string) => void;
}

export const ArenaPreview: React.FC<ArenaPreviewProps> = ({
  theme,
  overrides,
  layout,
  jarShape,
  ambiance,
  screen,
  drawPaletteId,
  customBichos,
  customDecors,
  mossBlobs,
  showStarters,
  lastCreator,
  onChangeScreen,
  onChangeDrawPalette,
  onCycleJarShape,
  onCycleAmbiance,
  onSaveBicho,
  onToggleCustomBichoStatus,
  onChangeCustomBichoMovement,
  onDeleteCustomBicho,
  onSaveDecor,
  onToggleDecorInJar,
  onDeleteDecor,
  onAddMossBlob,
  onUndoMoss,
  onClearMoss,
  onToggleShowStarters,
  onPointerSeen,
}) => {
  const palette = resolvePalette(theme, overrides);

  const [selectedBicho, setSelectedBicho] = useState<ActiveBichoSelection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [satchelOpen, setSatchelOpen] = useState(true);
  const [mossPaintMode, setMossPaintMode] = useState(false);
  const [mistPulse, setMistPulse] = useState(0);

  const [dexTab, setDexTab] = useState<'all' | 'mine' | 'decor'>('all');
  const [starterStatuses, setStarterStatuses] = useState<
    Record<string, SampleBicho['status']>
  >({
    rolo: 'in_jar',
    mimi: 'in_jar',
    lulu: 'in_jar',
    boli: 'in_jar',
  });

  const activeStarterCount = showStarters
    ? SAMPLE_BICHOS.filter((b) => (starterStatuses[b.id] ?? b.status) === 'in_jar').length
    : 0;
  const activeCustomCount = customBichos.filter((b) => b.status === 'in_jar').length;
  const totalInJar = activeStarterCount + activeCustomCount;

  const ambInfo =
    AMBIANCE_OPTIONS.find((a) => a.id === ambiance) ?? AMBIANCE_OPTIONS[0];
  const jarInfo =
    JAR_SHAPE_OPTIONS.find((j) => j.id === jarShape) ?? JAR_SHAPE_OPTIONS[0];

  const handleNavAction = (action: 'terrarium' | 'draw' | 'moss' | 'bichodex') => {
    cozyTap('light');
    if (action === 'moss') {
      onChangeScreen('terrarium');
      setSelectedBicho(null);
      setMossPaintMode((v) => !v);
      return;
    }
    setMossPaintMode(false);
    onChangeScreen(action);
  };

  const navItems: {
    id: 'terrarium' | 'draw' | 'moss' | 'bichodex';
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'terrarium', label: 'Jar', icon: <JarIcon size={19} /> },
    { id: 'draw', label: 'Draw', icon: <BrushIcon size={19} /> },
    { id: 'moss', label: 'Moss', icon: <MossLeafIcon size={19} /> },
    { id: 'bichodex', label: 'Bichodex', icon: <BichodexIcon size={19} /> },
  ];

  const cycleMovementForSelected = () => {
    if (!selectedBicho || !selectedBicho.isCustom) return;
    cozyTap('light');
    const idx = MOVEMENT_OPTIONS.findIndex((m) => m.id === selectedBicho.movement);
    const next = MOVEMENT_OPTIONS[(idx + 1) % MOVEMENT_OPTIONS.length].id;
    onChangeCustomBichoMovement(selectedBicho.id, next);
    setSelectedBicho({ ...selectedBicho, movement: next });
  };

  const renderTerrariumNav = () => {
    if (mossPaintMode) {
      return (
        <div className="b-card moss-paint-bar">
          <div className="moss-paint-info">
            <MossLeafIcon size={17} />
            <span>Paint moss with your finger!</span>
          </div>
          <div className="moss-paint-actions">
            <button
              type="button"
              className="b-btn mini-toggle"
              onClick={() => {
                cozyTap('light');
                onUndoMoss();
              }}
              disabled={mossBlobs.length === 0}
            >
              Undo
            </button>
            <button
              type="button"
              className="b-btn mini-toggle"
              onClick={() => {
                cozyTap('medium');
                onClearMoss();
              }}
              disabled={mossBlobs.length === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className="b-btn primary-btn mini-toggle"
              onClick={() => {
                cozyTap('light');
                setMossPaintMode(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      );
    }

    if (layout === 'dock') {
      return (
        <nav className="mock-dock" aria-label="Mock Pill Dock">
          {navItems.map((item) => {
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`b-btn mock-dock-btn ${active ? 'is-active' : ''}`}
                onClick={() => handleNavAction(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      );
    }

    if (layout === 'corners') {
      return (
        <>
          <button
            type="button"
            className="b-btn mock-corner-btn corner-bl"
            onClick={() => handleNavAction('draw')}
            title="Draw Bicho"
          >
            <BrushIcon size={20} />
            <span>Draw</span>
          </button>
          <button
            type="button"
            className="b-btn mock-corner-btn corner-br"
            onClick={() => handleNavAction('bichodex')}
            title="Bichodex"
          >
            <BichodexIcon size={20} />
            <span>Dex</span>
          </button>
          <button
            type="button"
            className="b-btn mock-corner-btn corner-ml"
            onClick={() => handleNavAction('moss')}
            title="Paint Moss"
          >
            <MossLeafIcon size={18} />
          </button>
        </>
      );
    }

    if (layout === 'drawer') {
      return (
        <div className={`mock-pull-drawer ${drawerOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="mock-pull-handle"
            onClick={() => {
              cozyTap('light');
              setDrawerOpen((v) => !v);
            }}
          >
            <span className="pull-pill" />
            <span>{drawerOpen ? 'Hide Jar Tools' : 'Jar Tools & Bichodex'}</span>
          </button>
          {drawerOpen && (
            <div className="mock-pull-grid">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`b-btn mock-tray-tile ${screen === item.id ? 'is-active' : ''}`}
                  onClick={() => {
                    handleNavAction(item.id);
                    setDrawerOpen(false);
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (layout === 'rail') {
      return (
        <nav className="mock-side-rail" aria-label="Mock Side Rail">
          {navItems.map((item) => {
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`b-btn mock-rail-btn ${active ? 'is-active' : ''}`}
                onClick={() => handleNavAction(item.id)}
                title={item.label}
              >
                {item.icon}
                <small>{item.label}</small>
              </button>
            );
          })}
        </nav>
      );
    }

    return (
      <div className="mock-satchel-wrap">
        {satchelOpen && (
          <div className="mock-satchel-fan">
            <button
              type="button"
              className="b-btn satchel-item item-1"
              onClick={() => handleNavAction('draw')}
            >
              <BrushIcon size={18} />
              <span>Draw</span>
            </button>
            <button
              type="button"
              className="b-btn satchel-item item-2"
              onClick={() => handleNavAction('moss')}
            >
              <MossLeafIcon size={18} />
              <span>Moss</span>
            </button>
            <button
              type="button"
              className="b-btn satchel-item item-3"
              onClick={() => handleNavAction('bichodex')}
            >
              <BichodexIcon size={18} />
              <span>Dex</span>
            </button>
          </div>
        )}
        <button
          type="button"
          className={`b-btn mock-satchel-main ${satchelOpen ? 'is-open' : ''}`}
          onClick={() => {
            cozyTap('medium');
            setSatchelOpen((v) => !v);
          }}
          aria-label="Toggle Satchel Menu"
        >
          <SatchelIcon size={22} />
        </button>
      </div>
    );
  };

  return (
    <div className={`arena-stage texture-${overrides.texture}`}>
      {/* Mock Bichario Top Header */}
      <header className="mock-topbar">
        <button
          type="button"
          className="b-card mock-jar-pill"
          onClick={() => {
            cozyTap('light');
            onCycleJarShape();
          }}
          title="Tap to try another jar shape"
        >
          <span className="jar-dot" />
          <div style={{ textAlign: 'left' }}>
            <strong>Casa Jar</strong>
            <small>
              {totalInJar} {totalInJar === 1 ? 'bicho' : 'bichos'} · {jarInfo.short} ↻
            </small>
          </div>
        </button>

        <div className="topbar-right-actions">
          {screen === 'terrarium' && (
            <>
              <button
                type="button"
                className="b-btn mock-icon-pill"
                onClick={() => {
                  cozyTap('medium');
                  setMistPulse((n) => n + 1);
                }}
                title="Mist the jar"
                aria-label="Mist the jar"
              >
                <DropletIcon size={16} />
              </button>
              <button
                type="button"
                className="b-btn mock-family-pill"
                onClick={() => {
                  cozyTap('light');
                  onCycleAmbiance();
                }}
                title="Switch weather & lighting"
              >
                <span>{ambInfo.icon}</span>
                <span>{ambInfo.label}</span>
              </button>
            </>
          )}
          {screen !== 'terrarium' && (
            <button
              type="button"
              className="b-btn mock-family-pill"
              onClick={() => {
                cozyTap('light');
                onChangeScreen('terrarium');
              }}
            >
              <JarIcon size={15} />
              <span>Jar</span>
            </button>
          )}
        </div>
      </header>

      {/* SCREEN 1: LIVING TERRARIUM */}
      {screen === 'terrarium' && (
        <div className="mock-terrarium-body">
          <TerrariumCanvas
            palette={palette}
            jarShape={jarShape}
            ambiance={ambiance}
            customBichos={customBichos}
            customDecors={customDecors}
            mossBlobs={mossBlobs}
            starterStatuses={starterStatuses}
            showStarters={showStarters}
            selectedBichoId={selectedBicho?.id ?? null}
            mossPaintMode={mossPaintMode}
            mistPulse={mistPulse}
            onSelectBicho={(b) => setSelectedBicho(b)}
            onAddMossBlob={onAddMossBlob}
          />

          {selectedBicho && (
            <div className="b-card mock-bicho-pop">
              <div className="pop-head">
                {selectedBicho.spriteDataUrl ? (
                  <span className="pop-sprite-wrap">
                    <img src={selectedBicho.spriteDataUrl} alt={selectedBicho.name} />
                  </span>
                ) : (
                  <span
                    className="pop-swatch"
                    style={{ background: selectedBicho.color || '#DF6449' }}
                  />
                )}
                <div className="pop-title">
                  <strong>{selectedBicho.name}</strong>
                  <small>
                    {MOVEMENT_OPTIONS.find((m) => m.id === selectedBicho.movement)?.emoji}{' '}
                    {MOVEMENT_OPTIONS.find((m) => m.id === selectedBicho.movement)?.name} · by{' '}
                    {selectedBicho.creator}
                  </small>
                </div>
                <button
                  type="button"
                  className="pop-close"
                  onClick={() => setSelectedBicho(null)}
                  aria-label="Close bicho card"
                >
                  ×
                </button>
              </div>
              <p className="pop-note">{selectedBicho.note}</p>
              <div className="pop-actions-row">
                {selectedBicho.isCustom && (
                  <>
                    <button
                      type="button"
                      className="b-btn pop-mini-btn"
                      onClick={cycleMovementForSelected}
                    >
                      Switch Move ↻
                    </button>
                    <button
                      type="button"
                      className="b-btn pop-mini-btn"
                      onClick={() => {
                        cozyTap('light');
                        onToggleCustomBichoStatus(selectedBicho.id);
                        setSelectedBicho(null);
                      }}
                    >
                      Rest in Dex
                    </button>
                  </>
                )}
                <div className="pop-stamps">
                  {selectedBicho.stamps.map((s) => (
                    <span key={s.jar} className="b-chip">
                      {s.icon} {s.jar}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!mossPaintMode && !selectedBicho && jarShape !== 'teardrop' && (
            <div className="tap-hint-pill">
              {customBichos.length === 0
                ? 'Tap Draw to create your own bicho!'
                : 'Tap a bicho · Tap Casa Jar to swap jar'}
            </div>
          )}

          {renderTerrariumNav()}
        </div>
      )}

      {/* SCREEN 2: REAL INTERACTIVE DRAW STUDIO */}
      {screen === 'draw' && (
        <DrawStudio
          drawPaletteId={drawPaletteId}
          lastCreator={lastCreator}
          onChangeDrawPalette={onChangeDrawPalette}
          onSaveBicho={(b) => {
            onSaveBicho(b);
            onChangeScreen('terrarium');
          }}
          onSaveDecor={(d) => {
            onSaveDecor(d);
            onChangeScreen('terrarium');
          }}
          onBackToJar={() => onChangeScreen('terrarium')}
          onPointerSeen={onPointerSeen}
        />
      )}

      {/* SCREEN 3: BICHODEX FIELD GUIDE */}
      {screen === 'bichodex' && (
        <div className="mock-dex-screen">
          <div className="dex-filter-row">
            <button
              type="button"
              className={`b-btn dex-filter-btn ${dexTab === 'all' ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setDexTab('all');
              }}
            >
              All ({customBichos.length + (showStarters ? SAMPLE_BICHOS.length : 0)})
            </button>
            <button
              type="button"
              className={`b-btn dex-filter-btn ${dexTab === 'mine' ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setDexTab('mine');
              }}
            >
              Ours ({customBichos.length})
            </button>
            <button
              type="button"
              className={`b-btn dex-filter-btn ${dexTab === 'decor' ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setDexTab('decor');
              }}
            >
              Plants & Rocks ({customDecors.length})
            </button>
          </div>

          {dexTab !== 'decor' && (
            <>
              {dexTab === 'mine' && customBichos.length === 0 && (
                <div className="b-card dex-empty-card">
                  <strong>No hand-drawn bichos yet!</strong>
                  <p>Draw your first bicho, butterfly, or pet rock and it will live here forever.</p>
                  <button
                    type="button"
                    className="b-btn primary-btn"
                    style={{ padding: '10px 16px' }}
                    onClick={() => onChangeScreen('draw')}
                  >
                    + Draw Our First Bicho
                  </button>
                </div>
              )}

              <div className="dex-grid">
                {customBichos.map((cb) => {
                  const moveInfo = MOVEMENT_OPTIONS.find((m) => m.id === cb.movement);
                  return (
                    <article key={cb.id} className="b-card dex-card">
                      <div className="dex-card-top">
                        <span className="dex-custom-thumb">
                          <img src={cb.spriteDataUrl} alt={cb.name} />
                        </span>
                        <button
                          type="button"
                          className="dex-del-btn"
                          title="Delete bicho"
                          onClick={() => {
                            cozyTap('medium');
                            onDeleteCustomBicho(cb.id);
                          }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                      <strong className="dex-name">{cb.name}</strong>
                      <small className="dex-meta">
                        by {cb.creator} · {cb.birthday}
                      </small>
                      <button
                        type="button"
                        className="b-chip dex-move-chip"
                        onClick={() => {
                          cozyTap('light');
                          const idx = MOVEMENT_OPTIONS.findIndex((m) => m.id === cb.movement);
                          const next = MOVEMENT_OPTIONS[(idx + 1) % MOVEMENT_OPTIONS.length].id;
                          onChangeCustomBichoMovement(cb.id, next);
                        }}
                      >
                        {moveInfo?.emoji} {moveInfo?.name} ↻
                      </button>
                      <button
                        type="button"
                        className={`b-btn dex-status-btn ${cb.status === 'in_jar' ? 'is-active' : ''}`}
                        onClick={() => {
                          cozyTap('light');
                          onToggleCustomBichoStatus(cb.id);
                        }}
                      >
                        {cb.status === 'in_jar' ? 'In Jar ✓' : 'Resting · Put In'}
                      </button>
                    </article>
                  );
                })}

                {dexTab === 'all' &&
                  showStarters &&
                  SAMPLE_BICHOS.map((b) => {
                    const st = starterStatuses[b.id] ?? b.status;
                    return (
                      <article key={b.id} className="b-card dex-card">
                        <div className="dex-card-top">
                          <span className="dex-avatar" style={{ background: b.color }}>
                            <span
                              className="dex-avatar-dot"
                              style={{ background: b.spotColor }}
                            />
                          </span>
                          <span className="mono-tag">{b.birthday}</span>
                        </div>
                        <strong className="dex-name">{b.name}</strong>
                        <small className="dex-meta">
                          {b.species} · {b.creator}
                        </small>
                        <div className="dex-stamps">
                          <PassportIcon size={13} />
                          <span>{b.stamps.map((s) => s.icon).join(' ')}</span>
                        </div>
                        <button
                          type="button"
                          className={`b-btn dex-status-btn ${st === 'in_jar' ? 'is-active' : ''}`}
                          onClick={() => {
                            cozyTap('light');
                            setStarterStatuses((prev) => ({
                              ...prev,
                              [b.id]: st === 'in_jar' ? 'resting' : 'in_jar',
                            }));
                          }}
                        >
                          {st === 'in_jar' ? 'In Jar ✓' : 'Resting · Put In'}
                        </button>
                      </article>
                    );
                  })}
              </div>

              <label className="b-card dex-starter-toggle">
                <input
                  type="checkbox"
                  checked={showStarters}
                  onChange={() => {
                    cozyTap('light');
                    onToggleShowStarters();
                  }}
                />
                <span>Include starter sample bichos in jar</span>
              </label>
            </>
          )}

          {dexTab === 'decor' && (
            <>
              {customDecors.length === 0 ? (
                <div className="b-card dex-empty-card">
                  <strong>No hand-drawn plants or rocks yet!</strong>
                  <p>
                    Go to <strong>Draw → Plant</strong> or <strong>Rock</strong> to grow
                    procedural clusters in your jar.
                  </p>
                  <button
                    type="button"
                    className="b-btn primary-btn"
                    style={{ padding: '10px 16px' }}
                    onClick={() => onChangeScreen('draw')}
                  >
                    + Draw Plant or Rock
                  </button>
                </div>
              ) : (
                <div className="dex-grid">
                  {customDecors.map((d) => (
                    <article key={d.id} className="b-card dex-card">
                      <div className="dex-card-top">
                        <span className="dex-custom-thumb">
                          <img src={d.spriteDataUrl} alt={d.name} />
                        </span>
                        <button
                          type="button"
                          className="dex-del-btn"
                          title="Delete decor"
                          onClick={() => {
                            cozyTap('medium');
                            onDeleteDecor(d.id);
                          }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                      <strong className="dex-name">{d.name}</strong>
                      <small className="dex-meta">
                        {d.kind === 'plant' ? '🌿 Plant' : '🪨 Rock'}
                        {d.smartExpand ? ' · Smart Cluster' : ''}
                      </small>
                      <button
                        type="button"
                        className={`b-btn dex-status-btn ${d.inJar ? 'is-active' : ''}`}
                        onClick={() => {
                          cozyTap('light');
                          onToggleDecorInJar(d.id);
                        }}
                      >
                        {d.inJar ? 'In Jar ✓' : 'Hidden · Place'}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            type="button"
            className="b-btn secondary-btn dex-back-btn"
            onClick={() => onChangeScreen('terrarium')}
          >
            ← Back to Casa Jar
          </button>
        </div>
      )}
    </div>
  );
};
