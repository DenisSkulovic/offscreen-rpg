import {
  makeValidatedAppearanceForPublication,
  type PublicSceneAppearanceV1,
} from '@offscreen/contracts/stories';
import { publicationPassageId } from './passage-documents';

/** An explicit internal candidate wins. Otherwise use the admitted suggestion. */
export function publicationSceneCandidate(args: {
  internalCandidate?: unknown;
  suggestion?: unknown;
}): unknown | undefined {
  return args.internalCandidate !== undefined
    ? args.internalCandidate
    : args.suggestion;
}

/** Passage id and optional scene for one Storyteller publication insert. */
export function publicationAppearanceWrite(args: {
  generationId: string;
  storyId: string;
  stagedPassageId?: string;
  candidate?: unknown;
}): { passageId: string; appearance?: PublicSceneAppearanceV1 } {
  const passageId =
    args.stagedPassageId ?? publicationPassageId(args.generationId);
  const appearance = makeValidatedAppearanceForPublication({
    storyId: args.storyId,
    passageId,
    candidate: args.candidate,
  });
  return appearance ? { passageId, appearance } : { passageId };
}
