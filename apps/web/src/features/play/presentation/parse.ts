import type {
  BackdropGradient,
  ChoiceTarget,
  ChoiceTreatment,
  MediaPlacement,
  PaletteIntent,
  PresentationDiagnostic,
  SceneArtDirection,
  ScenePresentationV1,
  StoryVisualIdentity,
} from './types';
import { isHexColor } from './contrast';

const TYPOGRAPHY = new Set(['editorial', 'restrained', 'technical']);
const TEXTURE = new Set(['none', 'grain-soft', 'organic-soft', 'geometric-soft']);
const LIGHTING = new Set(['neutral', 'dim', 'diffuse', 'radiant']);
const STAGE = new Set(['open', 'quiet-surface', 'translucent-surface']);
const AMBIENT = new Set(['still', 'drift-soft', 'shimmer-soft']);
const ARRIVAL = new Set(['none', 'fade', 'rise-subtle']);
const SURFACE = new Set(['quiet', 'outline', 'filled', 'luminous']);
const EFFECT = new Set(['none', 'glow-soft', 'pulse-soft']);
const ASSET_REF = /^[a-z][a-z0-9._:-]{0,80}$/;

function opaqueAssetRef(value: unknown) {
  return (
    typeof value === 'string' &&
    ASSET_REF.test(value) &&
    !value.includes('://') &&
    !value.includes('url(') &&
    !value.includes('/') &&
    !value.includes('\\')
  );
}
const CROP = new Set(['cover', 'contain']);
const ROLE = new Set(['decorative', 'supplemental']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value);
}

function inRange(value: unknown, min: number, max: number) {
  return finiteNumber(value) && value >= min && value <= max;
}

function reject(
  rejected: PresentationDiagnostic[],
  path: string,
  reason: string,
) {
  rejected.push({ path, reason });
}

function unusedKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  rejected: PresentationDiagnostic[],
) {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      reject(rejected, `${path}.${key}`, 'unknown field ignored');
    }
  }
}

function parseGradient(
  value: unknown,
  path: string,
  rejected: PresentationDiagnostic[],
): BackdropGradient | undefined {
  if (!isRecord(value)) {
    reject(rejected, path, 'gradient must be an object');
    return undefined;
  }
  unusedKeys(value, ['kind', 'stops', 'angleDegrees', 'center'], path, rejected);
  if (value.kind !== 'linear' && value.kind !== 'radial') {
    reject(rejected, `${path}.kind`, 'gradient kind rejected');
    return undefined;
  }
  if (!Array.isArray(value.stops) || value.stops.length < 2 || value.stops.length > 4) {
    reject(rejected, `${path}.stops`, 'gradient needs 2 to 4 stops');
    return undefined;
  }
  const stops: BackdropGradient['stops'] = [];
  let previous = -1;
  for (let index = 0; index < value.stops.length; index += 1) {
    const stop = value.stops[index];
    const stopPath = `${path}.stops.${index}`;
    if (!isRecord(stop)) {
      reject(rejected, stopPath, 'stop rejected');
      return undefined;
    }
    if (!inRange(stop.position, 0, 100) || !isHexColor(stop.color)) {
      reject(rejected, stopPath, 'stop position or color rejected');
      return undefined;
    }
    if (stop.position <= previous) {
      reject(rejected, stopPath, 'stop positions must increase');
      return undefined;
    }
    previous = stop.position;
    stops.push({ position: stop.position, color: stop.color.toLowerCase() });
  }
  const gradient: BackdropGradient = { kind: value.kind, stops };
  if (value.angleDegrees !== undefined) {
    if (value.kind !== 'linear' || !inRange(value.angleDegrees, 0, 360)) {
      reject(rejected, `${path}.angleDegrees`, 'angle rejected');
    } else {
      gradient.angleDegrees = value.angleDegrees;
    }
  }
  if (value.center !== undefined) {
    if (
      value.kind !== 'radial' ||
      !isRecord(value.center) ||
      !inRange(value.center.x, 0, 100) ||
      !inRange(value.center.y, 0, 100)
    ) {
      reject(rejected, `${path}.center`, 'center rejected');
    } else {
      gradient.center = { x: value.center.x, y: value.center.y };
    }
  }
  return gradient;
}

function parsePalette(
  value: unknown,
  path: string,
  rejected: PresentationDiagnostic[],
): PaletteIntent | undefined {
  if (!isRecord(value)) {
    reject(rejected, path, 'palette rejected');
    return undefined;
  }
  unusedKeys(value, ['backdrop', 'accent', 'surfaceTint'], path, rejected);
  const palette: PaletteIntent = {};
  if (value.backdrop !== undefined) {
    if (isHexColor(value.backdrop)) {
      palette.backdrop = value.backdrop.toLowerCase();
    } else if (typeof value.backdrop === 'string') {
      reject(rejected, `${path}.backdrop`, 'color string rejected');
    } else {
      const gradient = parseGradient(value.backdrop, `${path}.backdrop`, rejected);
      if (gradient) palette.backdrop = gradient;
    }
  }
  if (value.accent !== undefined) {
    if (isHexColor(value.accent)) palette.accent = value.accent.toLowerCase();
    else reject(rejected, `${path}.accent`, 'accent rejected');
  }
  if (value.surfaceTint !== undefined) {
    if (isHexColor(value.surfaceTint)) {
      palette.surfaceTint = value.surfaceTint.toLowerCase();
    } else reject(rejected, `${path}.surfaceTint`, 'surface tint rejected');
  }
  return palette;
}

function parseStoryStyle(
  value: unknown,
  rejected: PresentationDiagnostic[],
): StoryVisualIdentity | undefined {
  if (!isRecord(value)) {
    reject(rejected, 'storyStyle', 'story style rejected');
    return undefined;
  }
  unusedKeys(value, ['palette', 'typography', 'texture'], 'storyStyle', rejected);
  const style: StoryVisualIdentity = {};
  if (value.palette !== undefined) {
    const palette = parsePalette(value.palette, 'storyStyle.palette', rejected);
    if (palette) style.palette = palette;
  }
  if (value.typography !== undefined) {
    if (TYPOGRAPHY.has(String(value.typography))) {
      style.typography = value.typography as StoryVisualIdentity['typography'];
    } else reject(rejected, 'storyStyle.typography', 'typography rejected');
  }
  if (value.texture !== undefined) {
    if (TEXTURE.has(String(value.texture))) {
      style.texture = value.texture as StoryVisualIdentity['texture'];
    } else reject(rejected, 'storyStyle.texture', 'texture rejected');
  }
  return style;
}

function parseMedia(
  value: unknown,
  index: number,
  rejected: PresentationDiagnostic[],
): MediaPlacement | undefined {
  const path = `scene.media.${index}`;
  if (!isRecord(value)) {
    reject(rejected, path, 'media rejected');
    return undefined;
  }
  unusedKeys(
    value,
    ['id', 'assetRef', 'slot', 'crop', 'focalPoint', 'role', 'scale', 'url', 'src', 'alt'],
    path,
    rejected,
  );
  if (typeof value.id !== 'string' || value.id.length < 1 || value.id.length > 80) {
    reject(rejected, `${path}.id`, 'media id rejected');
    return undefined;
  }
  if (!opaqueAssetRef(value.assetRef)) {
    reject(rejected, `${path}.assetRef`, 'asset reference rejected');
    return undefined;
  }
  if (!isRecord(value.slot) || typeof value.slot.kind !== 'string') {
    reject(rejected, `${path}.slot`, 'slot rejected');
    return undefined;
  }
  let slot: MediaPlacement['slot'];
  if (value.slot.kind === 'backdrop' || value.slot.kind === 'before-passage' || value.slot.kind === 'after-passage') {
    slot = { kind: value.slot.kind };
  } else if (value.slot.kind === 'after-paragraph' && Number.isInteger(value.slot.index) && (value.slot.index as number) >= 0) {
    slot = { kind: 'after-paragraph', index: value.slot.index as number };
  } else {
    reject(rejected, `${path}.slot`, 'slot rejected');
    return undefined;
  }
  const media: MediaPlacement = {
    id: value.id,
    assetRef: value.assetRef as string,
    slot,
  };
  if (value.scale !== undefined) {
    if (value.scale === 'inset' || value.scale === 'wide') media.scale = value.scale;
    else reject(rejected, `${path}.scale`, 'scale rejected');
  }
  if (value.crop !== undefined) {
    if (CROP.has(String(value.crop))) media.crop = value.crop as 'cover' | 'contain';
    else reject(rejected, `${path}.crop`, 'crop rejected');
  }
  if (value.focalPoint !== undefined) {
    if (
      isRecord(value.focalPoint) &&
      inRange(value.focalPoint.x, 0, 100) &&
      inRange(value.focalPoint.y, 0, 100)
    ) {
      media.focalPoint = { x: value.focalPoint.x, y: value.focalPoint.y };
    } else reject(rejected, `${path}.focalPoint`, 'focal point rejected');
  }
  if (value.role !== undefined) {
    if (ROLE.has(String(value.role))) media.role = value.role as 'decorative' | 'supplemental';
    else reject(rejected, `${path}.role`, 'role rejected');
  }
  if (value.url !== undefined || value.src !== undefined) {
    reject(rejected, path, 'direct url rejected');
  }
  return media;
}

function parseScene(
  value: unknown,
  rejected: PresentationDiagnostic[],
): SceneArtDirection | undefined {
  if (!isRecord(value)) {
    reject(rejected, 'scene', 'scene rejected');
    return undefined;
  }
  unusedKeys(
    value,
    ['palette', 'atmosphere', 'stage', 'media', 'motion'],
    'scene',
    rejected,
  );
  const scene: SceneArtDirection = {};
  if (value.palette !== undefined) {
    const palette = parsePalette(value.palette, 'scene.palette', rejected);
    if (palette) scene.palette = palette;
  }
  if (value.atmosphere !== undefined) {
    if (!isRecord(value.atmosphere)) {
      reject(rejected, 'scene.atmosphere', 'atmosphere rejected');
    } else {
      unusedKeys(
        value.atmosphere,
        ['lighting', 'vignette', 'textureIntensity'],
        'scene.atmosphere',
        rejected,
      );
      const atmosphere: NonNullable<SceneArtDirection['atmosphere']> = {};
      if (value.atmosphere.lighting !== undefined) {
        if (LIGHTING.has(String(value.atmosphere.lighting))) {
          atmosphere.lighting = value.atmosphere.lighting as NonNullable<
            typeof atmosphere.lighting
          >;
        } else reject(rejected, 'scene.atmosphere.lighting', 'lighting rejected');
      }
      if (value.atmosphere.vignette !== undefined) {
        if (inRange(value.atmosphere.vignette, 0, 1)) {
          atmosphere.vignette = value.atmosphere.vignette;
        } else reject(rejected, 'scene.atmosphere.vignette', 'vignette rejected');
      }
      if (value.atmosphere.textureIntensity !== undefined) {
        if (inRange(value.atmosphere.textureIntensity, 0, 1)) {
          atmosphere.textureIntensity = value.atmosphere.textureIntensity;
        } else {
          reject(rejected, 'scene.atmosphere.textureIntensity', 'texture intensity rejected');
        }
      }
      scene.atmosphere = atmosphere;
    }
  }
  if (value.stage !== undefined) {
    if (STAGE.has(String(value.stage))) scene.stage = value.stage as SceneArtDirection['stage'];
    else reject(rejected, 'scene.stage', 'stage rejected');
  }
  if (value.media !== undefined) {
    if (!Array.isArray(value.media)) reject(rejected, 'scene.media', 'media rejected');
    else {
      scene.media = value.media.flatMap((item, index) => {
        const media = parseMedia(item, index, rejected);
        return media ? [media] : [];
      });
    }
  }
  if (value.motion !== undefined) {
    if (!isRecord(value.motion)) reject(rejected, 'scene.motion', 'motion rejected');
    else {
      unusedKeys(value.motion, ['ambient', 'passageArrival'], 'scene.motion', rejected);
      const motion: NonNullable<SceneArtDirection['motion']> = {};
      if (value.motion.ambient !== undefined) {
        if (AMBIENT.has(String(value.motion.ambient))) {
          motion.ambient = value.motion.ambient as NonNullable<typeof motion.ambient>;
        } else reject(rejected, 'scene.motion.ambient', 'ambient rejected');
      }
      if (value.motion.passageArrival !== undefined) {
        if (ARRIVAL.has(String(value.motion.passageArrival))) {
          motion.passageArrival = value.motion.passageArrival as NonNullable<
            typeof motion.passageArrival
          >;
        } else reject(rejected, 'scene.motion.passageArrival', 'arrival rejected');
      }
      scene.motion = motion;
    }
  }
  return scene;
}

function parseTarget(value: unknown, path: string, rejected: PresentationDiagnostic[]): ChoiceTarget | undefined {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    reject(rejected, path, 'choice target rejected');
    return undefined;
  }
  if (value.kind === 'legacy') {
    if (typeof value.interactionId !== 'string' || typeof value.optionId !== 'string') {
      reject(rejected, path, 'legacy target rejected');
      return undefined;
    }
    if (value.label !== undefined) reject(rejected, path, 'label is not an identity');
    return {
      kind: 'legacy',
      interactionId: value.interactionId,
      optionId: value.optionId,
    };
  }
  if (value.kind === 'campaign') {
    if (typeof value.offerId !== 'string' || !Array.isArray(value.path) || value.path.some((part) => typeof part !== 'string')) {
      reject(rejected, path, 'campaign target rejected');
      return undefined;
    }
    return { kind: 'campaign', offerId: value.offerId, path: [...value.path] };
  }
  reject(rejected, path, 'choice target rejected');
  return undefined;
}

function parseChoice(
  value: unknown,
  index: number,
  rejected: PresentationDiagnostic[],
): ChoiceTreatment | undefined {
  const path = `choices.${index}`;
  if (!isRecord(value)) {
    reject(rejected, path, 'choice rejected');
    return undefined;
  }
  unusedKeys(value, ['target', 'surface', 'accent', 'emphasis', 'effect', 'css'], path, rejected);
  const target = parseTarget(value.target, `${path}.target`, rejected);
  if (!target) return undefined;
  const choice: ChoiceTreatment = { target };
  if (value.surface !== undefined) {
    if (SURFACE.has(String(value.surface))) choice.surface = value.surface as ChoiceTreatment['surface'];
    else reject(rejected, `${path}.surface`, 'surface rejected');
  }
  if (value.accent !== undefined) {
    if (isHexColor(value.accent)) choice.accent = value.accent.toLowerCase();
    else reject(rejected, `${path}.accent`, 'accent rejected');
  }
  if (value.emphasis !== undefined) {
    if (inRange(value.emphasis, 0, 1)) choice.emphasis = value.emphasis;
    else reject(rejected, `${path}.emphasis`, 'emphasis rejected');
  }
  if (value.effect !== undefined) {
    if (EFFECT.has(String(value.effect))) choice.effect = value.effect as ChoiceTreatment['effect'];
    else reject(rejected, `${path}.effect`, 'effect rejected');
  }
  if (value.css !== undefined) reject(rejected, path, 'raw css rejected');
  return choice;
}

export type ParseOutcome = {
  document: ScenePresentationV1 | null;
  rejected: PresentationDiagnostic[];
  fallback: 'none' | 'partial' | 'full';
};

/** Unknown version rejects the whole document. A bad optional field drops only that field. */
export function parseScenePresentation(input: unknown): ParseOutcome {
  if (input == null) {
    return { document: null, rejected: [], fallback: 'none' };
  }
  if (!isRecord(input)) {
    return {
      document: null,
      rejected: [{ path: '', reason: 'presentation must be an object' }],
      fallback: 'full',
    };
  }
  if (input.schemaVersion !== 1) {
    return {
      document: null,
      rejected: [{ path: 'schemaVersion', reason: 'unknown version' }],
      fallback: 'full',
    };
  }
  const rejected: PresentationDiagnostic[] = [];
  unusedKeys(input, ['schemaVersion', 'storyStyle', 'scene', 'choices'], '', rejected);
  const document: ScenePresentationV1 = { schemaVersion: 1 };
  if (input.storyStyle !== undefined) {
    const storyStyle = parseStoryStyle(input.storyStyle, rejected);
    if (storyStyle) document.storyStyle = storyStyle;
  }
  if (input.scene !== undefined) {
    const scene = parseScene(input.scene, rejected);
    if (scene) document.scene = scene;
  }
  if (input.choices !== undefined) {
    if (!Array.isArray(input.choices)) {
      reject(rejected, 'choices', 'choices rejected');
    } else {
      document.choices = input.choices.flatMap((item, index) => {
        const choice = parseChoice(item, index, rejected);
        return choice ? [choice] : [];
      });
    }
  }
  return {
    document,
    rejected,
    fallback: rejected.length ? 'partial' : 'none',
  };
}
