import {
  makeValidatedAppearanceForPublication,
  type PublicSceneAppearanceV1,
} from '@offscreen/contracts/stories';
import { publicationPassageId } from './passage-documents';

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
