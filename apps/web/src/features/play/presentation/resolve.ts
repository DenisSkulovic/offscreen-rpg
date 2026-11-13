import {
  brightestColor,
  chromeSurfaceFor,
  contrastRatio,
  isHexColor,
  optionSurfaceFor,
  readableInk,
  readableMuted,
  readableQuiet,
  relativeLuminance,
} from './contrast';
import { parseScenePresentation } from './parse';
import type {
  AssetCatalog,
  BackdropGradient,
  ChoiceTarget,
  PaletteIntent,
  PresentationScope,
  ResolvedBackdrop,
  ResolvedChoice,
  ResolvedMedia,
  ResolvedPresentation,
  SurfaceRoles,
} from './types';

const BASE_BACKDROP = '#12181f';
const BASE_SURFACE = '#1a222c';
const BASE_INK = '#e7ece8';
const BASE_ACCENT = '#c4a574';
const BASE_FOCUS = '#8ec8ff';
const BASE_STATUS = '#e2c27a';

function gradientCss(gradient: BackdropGradient) {
  const stops = gradient.stops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(', ');
  if (gradient.kind === 'radial') {
    const x = gradient.center?.x ?? 50;
    const y = gradient.center?.y ?? 40;
    return `radial-gradient(circle at ${x}% ${y}%, ${stops})`;
  }
  const angle = gradient.angleDegrees ?? 180;
  return `linear-gradient(${angle}deg, ${stops})`;
}

function samePath(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

function targetKey(target: ChoiceTarget) {
  if (target.kind === 'legacy') {
    return `legacy:${target.interactionId}:${target.optionId}`;
  }
  return `campaign:${target.offerId}:${target.path.join('/')}`;
}

function paletteField(
  story: PaletteIntent | undefined,
  scene: PaletteIntent | undefined,
  field: 'accent' | 'surfaceTint',
) {
  return scene?.[field] ?? story?.[field];
}

function resolveBackdrop(
  story: PaletteIntent | undefined,
  scene: PaletteIntent | undefined,
): ResolvedBackdrop {
  const chosen = scene?.backdrop ?? story?.backdrop;
  if (!chosen) return { kind: 'solid', color: BASE_BACKDROP };
  if (typeof chosen === 'string') return { kind: 'solid', color: chosen };
  return { kind: chosen.kind, css: gradientCss(chosen) };
}

function readingSurface(tint: string | undefined) {
  return tint && isHexColor(tint) ? tint : BASE_SURFACE;
}

function backdropSamples(
  story: PaletteIntent | undefined,
  scene: PaletteIntent | undefined,
) {
  const chosen = scene?.backdrop ?? story?.backdrop;
  if (!chosen) return [BASE_BACKDROP];
  if (typeof chosen === 'string') return [chosen];
  return chosen.stops.map((stop) => stop.color);
}

function surfaceRoles(surface: string, preferredInk: string): SurfaceRoles {
  const ink = readableInk(surface, preferredInk);
  const muted = readableMuted(surface, ink);
  return { surface, ink, muted, quiet: readableQuiet(surface, muted) };
}

export function resolvePresentation(
  input: unknown,
  scope: PresentationScope,
  catalog: AssetCatalog = {},
): ResolvedPresentation {
  const parsed = parseScenePresentation(input);
  const story = parsed.document?.storyStyle;
  const scene = parsed.document?.scene;
  const narrativeSurface = readingSurface(
    paletteField(story?.palette, scene?.palette, 'surfaceTint'),
  );
  const accent =
    paletteField(story?.palette, scene?.palette, 'accent') ?? BASE_ACCENT;
  const narrative = surfaceRoles(narrativeSurface, BASE_INK);
  const chrome = surfaceRoles(
    chromeSurfaceFor(brightestColor(backdropSamples(story?.palette, scene?.palette))),
    BASE_INK,
  );
  const optionSurface = optionSurfaceFor(narrative.surface);
  const options = {
    ...surfaceRoles(optionSurface, narrative.ink),
    edge: relativeLuminance(optionSurface) > 0.4 ? '#c5beb2' : '#4a5d6f',
  };
  const focus =
    contrastRatio(BASE_FOCUS, chrome.surface) >= 3 &&
    contrastRatio(BASE_FOCUS, options.surface) >= 3
      ? BASE_FOCUS
      : relativeLuminance(chrome.surface) > 0.4
        ? '#08345c'
        : BASE_FOCUS;
  const status =
    contrastRatio(BASE_STATUS, narrative.surface) >= 3 ? BASE_STATUS : '#6a4b12';
  const actionInk = readableInk(accent, '#1a150f');
  const rejected = [...parsed.rejected];
  const choices: ResolvedChoice[] = [];
  const seen = new Set<string>();

  for (const [index, choice] of (parsed.document?.choices ?? []).entries()) {
    const key = targetKey(choice.target);
    if (seen.has(key)) {
      rejected.push({ path: `choices.${index}`, reason: 'duplicate target ignored' });
      continue;
    }
    if (!authorizedTarget(choice.target, scope)) {
      rejected.push({ path: `choices.${index}.target`, reason: 'stale or unknown target ignored' });
      continue;
    }
    seen.add(key);
    const choiceAccent = choice.accent ?? accent;
    const filled = choice.surface === 'filled';
    const choiceSurface = filled ? choiceAccent : options.surface;
    const ink = readableInk(choiceSurface, filled ? '#1a150f' : options.ink);
    choices.push({
      target: choice.target,
      surface: choice.surface ?? 'outline',
      accent: choiceAccent,
      ink,
      muted: readableMuted(choiceSurface, ink),
      emphasis: choice.emphasis ?? 0.5,
      effect: choice.effect ?? 'none',
    });
  }

  const media = resolveMedia(scene?.media ?? [], scope, catalog, rejected);
  const backdrop = resolveBackdrop(story?.palette, scene?.palette);

  return {
    storyId: scope.storyId,
    passageId: scope.passageId,
    applied: parsed.document !== null,
    fallback: parsed.fallback,
    backdrop,
    accent,
    chrome,
    narrative,
    options,
    surface: narrative.surface,
    ink: narrative.ink,
    muted: narrative.muted,
    quiet: narrative.quiet,
    focus,
    status,
    actionInk,
    lighting: scene?.atmosphere?.lighting ?? 'neutral',
    vignette: scene?.atmosphere?.vignette ?? 0.2,
    texture: story?.texture ?? 'none',
    textureIntensity: scene?.atmosphere?.textureIntensity ?? 0.15,
    stage: scene?.stage ?? 'quiet-surface',
    typography: story?.typography ?? 'editorial',
    ambient: scene?.motion?.ambient ?? 'still',
    passageArrival: scene?.motion?.passageArrival ?? 'none',
    choices,
    media,
    rejected,
  };
}

function authorizedTarget(target: ChoiceTarget, scope: PresentationScope) {
  if (target.kind === 'legacy') {
    return (
      scope.interactionId === target.interactionId &&
      (scope.validLegacyOptionIds ?? []).includes(target.optionId)
    );
  }
  if (scope.campaignOfferId !== target.offerId) return false;
  return (scope.validCampaignPaths ?? []).some((path) => samePath(path, target.path));
}

function resolveMedia(
  placements: readonly {
    id: string;
    assetRef: string;
    slot: ResolvedMedia['slot'];
    scale?: 'inset' | 'wide';
    crop?: 'cover' | 'contain';
    focalPoint?: { x: number; y: number };
    role?: 'decorative' | 'supplemental';
  }[],
  scope: PresentationScope,
  catalog: AssetCatalog,
  rejected: ResolvedPresentation['rejected'],
) {
  const media: ResolvedMedia[] = [];
  let backdrop = false;
  let inline = 0;
  const anchors = new Set<string>();
  const ids = new Set<string>();
  placements.forEach((placement, index) => {
    const path = `scene.media.${index}`;
    if (ids.has(placement.id)) {
      rejected.push({ path, reason: 'duplicate media id ignored' });
      return;
    }
    const asset = catalog[placement.assetRef];
    if (!asset) {
      rejected.push({ path: `${path}.assetRef`, reason: 'unapproved asset ignored' });
      return;
    }
    const anchor =
      placement.slot.kind === 'after-paragraph'
        ? `after-paragraph:${placement.slot.index}`
        : placement.slot.kind;
    if (placement.slot.kind === 'backdrop') {
      if (backdrop) {
        rejected.push({ path, reason: 'extra backdrop ignored' });
        return;
      }
      backdrop = true;
    } else {
      if (
        placement.slot.kind === 'after-paragraph' &&
        placement.slot.index >= scope.paragraphCount
      ) {
        rejected.push({ path, reason: 'paragraph anchor ignored' });
        return;
      }
      if (inline >= 2) {
        rejected.push({ path, reason: 'inline media budget ignored' });
        return;
      }
      if (anchors.has(anchor)) {
        rejected.push({ path, reason: 'duplicate anchor ignored' });
        return;
      }
      anchors.add(anchor);
      inline += 1;
    }
    const role = placement.role ?? 'decorative';
    if (role === 'supplemental' && !asset.description) {
      rejected.push({ path, reason: 'supplemental asset lacks an approved description' });
      return;
    }
    ids.add(placement.id);
    media.push({
      id: placement.id,
      assetRef: placement.assetRef,
      src: asset.src,
      width: asset.width,
      height: asset.height,
      description: role === 'supplemental' ? asset.description : null,
      slot: placement.slot,
      scale: placement.slot.kind === 'backdrop' ? 'wide' : (placement.scale ?? 'inset'),
      crop: placement.crop ?? 'cover',
      focalPoint: placement.focalPoint ?? { x: 50, y: 40 },
      role,
    });
  });
  return media;
}

export function matchLegacyChoice(
  resolved: ResolvedPresentation,
  interactionId: string,
  optionId: string,
) {
  return resolved.choices.find(
    (choice) =>
      choice.target.kind === 'legacy' &&
      choice.target.interactionId === interactionId &&
      choice.target.optionId === optionId,
  );
}

export function matchCampaignChoice(
  resolved: ResolvedPresentation,
  offerId: string,
  path: readonly string[],
) {
  return resolved.choices.find(
    (choice) =>
      choice.target.kind === 'campaign' &&
      choice.target.offerId === offerId &&
      samePath(choice.target.path, path),
  );
}
