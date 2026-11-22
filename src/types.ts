export type ShadowStyle = 'cartoon' | 'soft' | 'clay' | 'flat';
export type SurfaceTexture = 'none' | 'paper' | 'dots' | 'linen';
export type LayoutArchetype = 'dock' | 'corners' | 'drawer' | 'rail' | 'satchel';
export type PreviewScreen = 'terrarium' | 'draw' | 'bichodex';
export type ComfortScale = 'compact' | 'balanced' | 'cozy';
export type LabTab = 'arena' | 'scribbler' | 'export';

export interface ThemePalette {
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceTint: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accentInk: string;
  secondary: string;
  secondaryInk: string;
  warm: string;
  border: string;
  jarSkyTop: string;
  jarSkyBottom: string;
  mossMain: string;
  mossLight: string;
  soil: string;
  isDark?: boolean;
}

export interface ThemeSpec {
  id: string;
  name: string;
  subtitle: string;
  vibeTag: string;
  description: string;
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  radius: number; // base px (8..32)
  organicRadius: boolean; // hand-drawn slightly uneven radii
  borderWidth: number; // px (0..4)
  borderDashed?: boolean;
  shadowStyle: ShadowStyle;
  texture: SurfaceTexture;
  squish: number; // 0..100
  glassSurface?: boolean;
  stickerRim?: boolean;
  palette: ThemePalette;
}

export interface StyleOverrides {
  radius: number;
  borderWidth: number;
  shadowStyle: ShadowStyle;
  texture: SurfaceTexture;
  comfortScale: ComfortScale;
  squish: number;
  organicRadius: boolean;
  customColors: Partial<Pick<ThemePalette, 'bg' | 'surface' | 'accent' | 'ink'>>;
}

export interface ThemeFeedback {
  stars: number; // 0..5
  favorite: boolean;
  note: string;
}

export interface CuratedDrawPalette {
  id: string;
  name: string;
  tagline: string;
  colors: { hex: string; name: string }[];
}

export type SketchTemplate = 'terrarium' | 'draw' | 'bichodex' | 'grid' | 'blank';

export interface SketchStroke {
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  size: number;
  points: { x: number; y: number; p: number }[];
}

export interface MenuSketch {
  id: string;
  title: string;
  note: string;
  template: SketchTemplate;
  strokes: SketchStroke[];
  aspect: number; // width / height
  updatedAt: string;
  previewDataUrl?: string;
}

export interface SampleBicho {
  id: string;
  name: string;
  creator: string;
  species: string;
  kind: 'beetle' | 'inchworm' | 'moth' | 'pillbug';
  status: 'in_jar' | 'resting' | 'visiting';
  birthday: string;
  color: string;
  spotColor: string;
  note: string;
  stamps: { jar: string; icon: string }[];
}
