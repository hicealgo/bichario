import React, { useState } from 'react';
import { CURATED_DRAW_PALETTES, SAMPLE_BICHOS } from '../data/themes';
import {
  LayoutArchetype,
  PreviewScreen,
  SampleBicho,
  StyleOverrides,
  ThemeSpec,
} from '../types';
import { cozyTap } from '../utils/haptics';
import { resolvePalette } from '../utils/themeCss';
import {
  BichodexIcon,
  BrushIcon,
  JarIcon,
  MirrorIcon,
  MossLeafIcon,
  PassportIcon,
  SatchelIcon,
  SharedJarIcon,
  SparkleIcon,
  UndoIcon,
} from './Icons';
import { TerrariumCanvas } from './TerrariumCanvas';

interface ArenaPreviewProps {
  theme: ThemeSpec;
  overrides: StyleOverrides;
  layout: LayoutArchetype;
  screen: PreviewScreen;
  drawPaletteId: string;
  onChangeScreen: (screen: PreviewScreen) => void;
}

export const ArenaPreview: React.FC<ArenaPreviewProps> = ({
  theme,
  overrides,
  layout,
  screen,
  drawPaletteId,
  onChangeScreen,
}) => {
  const palette = resolvePalette(theme, overrides);
  const drawPalette =
    CURATED_DRAW_PALETTES.find((p) => p.id === drawPaletteId) ?? CURATED_DRAW_PALETTES[0];

  const [selectedBicho, setSelectedBicho] = useState<SampleBicho | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [satchelOpen, setSatchelOpen] = useState(true);
  const [mossToast, setMossToast] = useState(false);

  // Interactive Draw Studio mockup states
  const [activeBrush, setActiveBrush] = useState<'crayon' | 'ink' | 'marker' | 'glow'>('crayon');
  const [activeColor, setActiveColor] = useState(drawPalette.colors[2].hex);
  const [mirrorOn, setMirrorOn] = useState(true);
  const [stickerOn, setStickerOn] = useState(true);
  const [proOpen, setProOpen] = useState(false);

  // Interactive Bichodex states
  const [dexFilter, setDexFilter] = useState<'all' | 'in_jar' | 'visiting'>('all');
  const [jarState, setJarState] = useState<Record<string, SampleBicho['status']>>({
    rolo: 'in_jar',
    mimi: 'in_jar',
    lulu: 'in_jar',
    boli: 'visiting',
  });

  const handleNavAction = (action: 'terrarium' | 'draw' | 'moss' | 'bichodex') => {
    cozyTap('light');
    if (action === 'moss') {
      onChangeScreen('terrarium');
      setMossToast(true);
      setTimeout(() => setMossToast(false), 1800);
      return;
    }
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

  const renderTerrariumNav = () => {
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

    // Radial Satchel
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

  const filteredBichos = SAMPLE_BICHOS.filter((b) => {
    if (dexFilter === 'all') return true;
    return (jarState[b.id] ?? b.status) === dexFilter;
  });

  return (
    <div className={`arena-stage texture-${overrides.texture}`}>
      {/* Mock Bichario Top Header inside the preview */}
      <header className="mock-topbar">
        <div className="b-card mock-jar-pill">
          <span className="jar-dot" />
          <div>
            <strong>Casa Jar</strong>
            <small>4 bichos · cozy moss</small>
          </div>
        </div>

        <button
          type="button"
          className="b-btn mock-family-pill"
          onClick={() => {
            cozyTap('light');
            onChangeScreen(screen === 'bichodex' ? 'terrarium' : 'bichodex');
          }}
        >
          <SharedJarIcon size={16} />
          <span>Familia</span>
        </button>
      </header>

      {/* SCREEN 1: LIVING TERRARIUM */}
      {screen === 'terrarium' && (
        <div className="mock-terrarium-body">
          <TerrariumCanvas
            palette={palette}
            selectedBichoId={selectedBicho?.id ?? null}
            onSelectBicho={(b) => setSelectedBicho(b)}
            stickerOutline={stickerOn}
          />

          {mossToast && (
            <div className="b-card mock-toast">
              <MossLeafIcon size={16} />
              <span>Living Moss Brush — coming in Lab 4!</span>
            </div>
          )}

          {selectedBicho && (
            <div className="b-card mock-bicho-pop">
              <div className="pop-head">
                <span
                  className="pop-swatch"
                  style={{ background: selectedBicho.color }}
                />
                <div className="pop-title">
                  <strong>{selectedBicho.name}</strong>
                  <small>
                    {selectedBicho.species} · by {selectedBicho.creator}
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
              <div className="pop-stamps">
                {selectedBicho.stamps.map((s) => (
                  <span key={s.jar} className="b-chip">
                    {s.icon} {s.jar}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="tap-hint-pill">Tap any bicho or the glass</div>

          {renderTerrariumNav()}
        </div>
      )}

      {/* SCREEN 2: DRAW STUDIO PREVIEW */}
      {screen === 'draw' && (
        <div className="mock-draw-screen">
          <div className="b-card mock-draw-canvas-box">
            <div className="draw-canvas-header">
              <span className="b-chip">New Bicho</span>
              <span className="mono-tag">{drawPalette.name}</span>
            </div>

            <div className="mock-sketch-preview">
              {mirrorOn && <div className="mirror-axis" />}
              <svg viewBox="0 0 180 130" className="preview-doodle-svg">
                <g
                  style={{
                    filter: stickerOn
                      ? 'drop-shadow(0 0 3px #fff) drop-shadow(0 2px 3px rgba(0,0,0,0.12))'
                      : 'none',
                  }}
                >
                  {stickerOn && (
                    <ellipse
                      cx="90"
                      cy="70"
                      rx="42"
                      ry="32"
                      fill="none"
                      stroke="#FFFDF8"
                      strokeWidth="12"
                    />
                  )}
                  <ellipse
                    cx="90"
                    cy="70"
                    rx="38"
                    ry="28"
                    fill={activeColor}
                    stroke="#332722"
                    strokeWidth="3.5"
                  />
                  <circle cx="75" cy="64" r="6" fill="#FFFDF8" opacity="0.85" />
                  <circle cx="105" cy="64" r="6" fill="#FFFDF8" opacity="0.85" />
                  <circle cx="90" cy="40" r="14" fill="#332722" />
                  <circle cx="85" cy="37" r="3" fill="#FFFDF8" />
                  <circle cx="95" cy="37" r="3" fill="#FFFDF8" />
                  <path
                    d="M84 28 Q74 14 66 18 M96 28 Q106 14 114 18"
                    fill="none"
                    stroke="#332722"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M54 62 L42 56 M53 74 L41 78 M126 62 L138 56 M127 74 L139 78"
                    stroke="#332722"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </g>
              </svg>
              <small className="draw-brush-readout">
                Brush: <strong>{activeBrush}</strong>
                {mirrorOn ? ' · Mirror ON' : ''}
                {stickerOn ? ' · Sticker Rim' : ''}
              </small>
            </div>
          </div>

          {/* Curated Cozy Color Blobs */}
          <div className="b-card mock-palette-bar">
            <div className="palette-blobs">
              {drawPalette.colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`color-blob ${activeColor === c.hex ? 'is-picked' : ''}`}
                  style={{ background: c.hex }}
                  title={c.name}
                  onClick={() => {
                    cozyTap('light');
                    setActiveColor(c.hex);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Kid-clean default tool strip + expandable Pro drawer */}
          <div className="mock-tool-row">
            {(['crayon', 'ink', 'marker', 'glow'] as const).map((b) => (
              <button
                key={b}
                type="button"
                className={`b-btn mock-tool-pill ${activeBrush === b ? 'is-active' : ''}`}
                onClick={() => {
                  cozyTap('light');
                  setActiveBrush(b);
                }}
              >
                {b === 'glow' ? <SparkleIcon size={15} /> : <BrushIcon size={15} />}
                <span>{b}</span>
              </button>
            ))}
            <button
              type="button"
              className={`b-btn mock-tool-pill ${proOpen ? 'is-active' : ''}`}
              onClick={() => {
                cozyTap('light');
                setProOpen((v) => !v);
              }}
            >
              <span>{proOpen ? 'Less' : 'More +'}</span>
            </button>
          </div>

          {proOpen && (
            <div className="b-card mock-pro-drawer">
              <button
                type="button"
                className={`b-btn mini-toggle ${mirrorOn ? 'is-active' : ''}`}
                onClick={() => {
                  cozyTap('light');
                  setMirrorOn((v) => !v);
                }}
              >
                <MirrorIcon size={15} />
                <span>Mirror {mirrorOn ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                className={`b-btn mini-toggle ${stickerOn ? 'is-active' : ''}`}
                onClick={() => {
                  cozyTap('light');
                  setStickerOn((v) => !v);
                }}
              >
                <SparkleIcon size={15} />
                <span>Sticker Outline</span>
              </button>
              <button
                type="button"
                className="b-btn mini-toggle"
                onClick={() => cozyTap('light')}
              >
                <UndoIcon size={15} />
                <span>Undo</span>
              </button>
            </div>
          )}

          <div className="mock-draw-footer">
            <button
              type="button"
              className="b-btn secondary-btn"
              onClick={() => onChangeScreen('terrarium')}
            >
              Back to Jar
            </button>
            <button
              type="button"
              className="b-btn primary-btn"
              onClick={() => {
                cozyTap('medium');
                onChangeScreen('terrarium');
              }}
            >
              Name & Drop in Jar →
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 3: BICHODEX FIELD GUIDE PREVIEW */}
      {screen === 'bichodex' && (
        <div className="mock-dex-screen">
          <div className="dex-filter-row">
            {(
              [
                { id: 'all', label: 'All (4)' },
                { id: 'in_jar', label: 'In Jar' },
                { id: 'visiting', label: 'Visiting' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                className={`b-btn dex-filter-btn ${dexFilter === f.id ? 'is-active' : ''}`}
                onClick={() => {
                  cozyTap('light');
                  setDexFilter(f.id);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="dex-grid">
            {filteredBichos.map((b) => {
              const st = jarState[b.id] ?? b.status;
              return (
                <article key={b.id} className="b-card dex-card">
                  <div className="dex-card-top">
                    <span
                      className="dex-avatar"
                      style={{ background: b.color }}
                    >
                      <span
                        className="dex-avatar-dot"
                        style={{ background: b.spotColor }}
                      />
                    </span>
                    <span className="mono-tag">{b.birthday}</span>
                  </div>
                  <strong className="dex-name">{b.name}</strong>
                  <small className="dex-meta">
                    {b.species} · by {b.creator}
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
                      setJarState((prev) => ({
                        ...prev,
                        [b.id]: st === 'in_jar' ? 'resting' : 'in_jar',
                      }));
                    }}
                  >
                    {st === 'in_jar'
                      ? 'In Jar ✓'
                      : st === 'visiting'
                        ? 'Visiting ✈'
                        : 'Resting · Put In'}
                  </button>
                </article>
              );
            })}
          </div>

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
