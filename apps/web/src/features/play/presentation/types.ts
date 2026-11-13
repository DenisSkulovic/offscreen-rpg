/** Frontend-owned V1 presentation input. Not a game contract. */

export type ColorHex = string;

export type BackdropGradient = {
  kind: 'linear' | 'radial';
  stops: { position: number; color: ColorHex }[];
  angleDegrees?: number;
  center?: { x: number; y: number };
};

export type PaletteIntent = {
  backdrop?: ColorHex | BackdropGradient;
  accent?: ColorHex;
  surfaceTint?: ColorHex;
};

export type StoryVisualIdentity = {
  palette?: PaletteIntent;
  typography?: 'editorial' | 'restrained' | 'technical';
  texture?: 'none' | 'grain-soft' | 'organic-soft' | 'geometric-soft';
};

export type MediaSlot =
  | { kind: 'backdrop' }
  | { kind: 'before-passage' }
  | { kind: 'after-paragraph'; index: number }
  | { kind: 'after-passage' };

export type MediaPlacement = {
  id: string;
  assetRef: string;
  slot: MediaSlot;
  crop?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  role?: 'decorative' | 'supplemental';
};

export type SceneArtDirection = {
  palette?: PaletteIntent;
  atmosphere?: {
    lighting?: 'neutral' | 'dim' | 'diffuse' | 'radiant';
    vignette?: number;
    textureIntensity?: number;
  };
  stage?: 'open' | 'quiet-surface' | 'translucent-surface';
  media?: MediaPlacement[];
  motion?: {
    ambient?: 'still' | 'drift-soft' | 'shimmer-soft';
    passageArrival?: 'none' | 'fade' | 'rise-subtle';
  };
};

export type ChoiceTarget =
  | { kind: 'legacy'; interactionId: string; optionId: string }
  | { kind: 'campaign'; offerId: string; path: string[] };

export type ChoiceTreatment = {
  target: ChoiceTarget;
  surface?: 'quiet' | 'outline' | 'filled' | 'luminous';
  accent?: ColorHex;
  emphasis?: number;
  effect?: 'none' | 'glow-soft' | 'pulse-soft';
};

export type ScenePresentationV1 = {
  schemaVersion: 1;
  storyStyle?: StoryVisualIdentity;
  scene?: SceneArtDirection;
  choices?: ChoiceTreatment[];
};

export type PresentationScope = {
  storyId: string;
  passageId: string;
  paragraphCount: number;
  interactionId?: string;
  campaignOfferId?: string;
  validCampaignPaths?: readonly (readonly string[])[];
  validLegacyOptionIds?: readonly string[];
};

export type PresentationDiagnostic = {
  path: string;
  reason: string;
};

export type ResolvedChoice = {
  target: ChoiceTarget;
  surface: 'quiet' | 'outline' | 'filled' | 'luminous';
  accent: string;
  ink: string;
  emphasis: number;
  effect: 'none' | 'glow-soft' | 'pulse-soft';
};

export type ResolvedMedia = {
  id: string;
  assetRef: string;
  src: string;
  width: number;
  height: number;
  description: string | null;
  slot: MediaSlot;
  crop: 'cover' | 'contain';
  focalPoint: { x: number; y: number };
  role: 'decorative' | 'supplemental';
};

export type ResolvedBackdrop =
  | { kind: 'solid'; color: string }
  | { kind: 'linear' | 'radial'; css: string };

export type ResolvedPresentation = {
  storyId: string;
  passageId: string;
  applied: boolean;
  fallback: 'none' | 'partial' | 'full';
  backdrop: ResolvedBackdrop;
  accent: string;
  surface: string;
  ink: string;
  muted: string;
  quiet: string;
  focus: string;
  status: string;
  actionInk: string;
  lighting: 'neutral' | 'dim' | 'diffuse' | 'radiant';
  vignette: number;
  texture: 'none' | 'grain-soft' | 'organic-soft' | 'geometric-soft';
  textureIntensity: number;
  stage: 'open' | 'quiet-surface' | 'translucent-surface';
  typography: 'editorial' | 'restrained' | 'technical';
  ambient: 'still' | 'drift-soft' | 'shimmer-soft';
  passageArrival: 'none' | 'fade' | 'rise-subtle';
  choices: ResolvedChoice[];
  media: ResolvedMedia[];
  rejected: PresentationDiagnostic[];
};
