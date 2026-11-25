export type ShadowStyle = 'cartoon' | 'soft' | 'clay' | 'flat';
export type SurfaceTexture = 'none' | 'paper' | 'dots' | 'linen';
export type LayoutArchetype = 'dock' | 'corners' | 'drawer' | 'rail' | 'satchel';
export type PreviewScreen = 'terrarium' | 'draw' | 'bichodex';
export type ComfortScale = 'compact' | 'balanced' | 'cozy';
export type LabTab = 'arena' | 'scribbler' | 'export';

export type JarShape =
  | 'mason'
  | 'dome'
  | 'orb'
  | 'hex'
  | 'teardrop'
  | 'terrarium_box';

export type AmbianceMode = 'sunny' | 'golden' | 'rain' | 'night';

export type MovementStyle =
  | 'crawler'
  | 'hopper'
  | 'flyer'
  | 'inchworm'
  | 'climber'
  | 'pet_rock';

export type DrawEntityKind = 'bicho' | 'plant' | 'rock';

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
  radius: number;
  organicRadius: boolean;
  borderWidth: number;
  borderDashed?: boolean;
  shadowStyle: ShadowStyle;
  texture: SurfaceTexture;
  squish: number;
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
  stars: number;
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
  aspect: number;
  updatedAt: string;
  previewDataUrl?: string;
}

export interface SampleBicho {
  id: string;
  name: string;
  creator: string;
  species: string;
  kind: 'beetle' | 'inchworm' | 'moth' | 'pillbug';
  movement: MovementStyle;
  status: 'in_jar' | 'resting' | 'visiting';
  birthday: string;
  color: string;
  spotColor: string;
  note: string;
  stamps: { jar: string; icon: string }[];
}

export interface CustomBicho {
  id: string;
  name: string;
  creator: string;
  movement: MovementStyle;
  status: 'in_jar' | 'resting' | 'visiting';
  birthday: string;
  spriteDataUrl: string;
  stickerOutline: boolean;
  scale: number; // 0.7..1.35
  note: string;
  stamps: { jar: string; icon: string }[];
  createdAt: string;
}

export interface CustomDecor {
  id: string;
  kind: 'plant' | 'rock';
  name: string;
  creator: string;
  spriteDataUrl: string;
  anchorX: number; // normalized 0.14..0.86 inside jar
  smartExpand: boolean;
  seed: number;
  inJar: boolean;
  createdAt: string;
}

export interface MossBlob {
  x: number; // normalized 0..1 inside jar
  y: number; // normalized 0..1 inside jar
  r: number; // normalized radius 0.02..0.06
  tone: 0 | 1 | 2;
}
