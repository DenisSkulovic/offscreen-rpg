import type { StorytellerTask, StorytellerResult } from './storyteller-tasks';
import { validateStorytellerResult } from './storyteller-tasks';

// Authored rehearsal content belongs only to this source, never runtime policy.
const scenes: Record<
  string,
  { opening: string; discovery: string; quiet: string }
> = {
  'absurd-action-comedy': {
    opening:
      'You wake in the pineapple. Gary crawls across the kitchen wearing a tiny ammunition belt, a machine gun balanced on his shell. He has barricaded your missing breakfast delivery behind a cereal box.',
    discovery:
      'Gary lowers the weapon and points to a note: he promised to protect the delivery, but its owner has vanished. You know why he is guarding the kitchen; you have not promised to join him.',
    quiet:
      'You take cover behind the breakfast counter and slide a bowl toward Gary. He pauses his operation to eat. You have bought a calm moment without joining the mission.',
  },
  'quiet-eerie-mystery': {
    opening:
      'You wake in the pineapple. Gary rests by an empty delivery box. A soft tapping comes from his shell, stops when you approach, and begins again behind the locked kitchen cupboard.',
    discovery:
      'Gary nudges a note toward you: he promised to protect a delivery until its owner returned. The owner has not returned. The tapping is a clue, not proof that anyone is trapped inside.',
    quiet:
      'You step back and prepare breakfast. Gary eats beside you. The tapping stops for now, but neither of you has explained it.',
  },
};
const options = [
  {
    id: 'ask',
    label: 'Ask Gary about the delivery',
    intention:
      'Ask Gary what he knows about the delivery without promising to help.',
  },
  {
    id: 'quiet',
    label: 'Make breakfast and give Gary space',
    intention:
      'De-escalate and enjoy an ordinary breakfast without investigating yet.',
  },
  {
    id: 'leave',
    label: 'Walk to work and leave this for later',
    intention:
      'Leave the pineapple and walk to work, postponing the delivery question.',
  },
];
const offer = {
  kind: 'choice' as const,
  prompt: 'What do you attempt?',
  options,
};
const content = (title: string, paragraph: string) => ({
  version: 1 as const,
  title,
  paragraphs: [paragraph],
});

/** Pure repeatable no-provider source. This deliberately cannot improvise an arbitrary premise. */
export function scriptedStorytellerResult(
  task: StorytellerTask,
): StorytellerResult {
  if (task.context.mechanicalOpening && task.task === 'opening') {
    const opening = task.context.mechanicalOpening;
    return validateStorytellerResult(task, {
      version: 1, scene: { version: 1, content: opening.opening, next: {
        kind: 'choice', prompt: 'What do you attempt?',
        options: opening.offer.nodes.map((node) => ({ id: node.id, label: node.label, intention: node.description })),
      } }, currentNotes: [], arrivalNotes: [],
    });
  }
  if (task.task === 'consequence') {
    const resolution = task.context.resolution;
    if (!resolution || !task.context.current) {
      throw new Error('Missing committed consequence');
    }
    const candidates = resolution.offer.nodes.filter((node) => node.action);
    const alternatives = candidates.filter(
      (node) => node.id !== task.context.selected?.id,
    );
    const selected = (alternatives.length ? alternatives : candidates).slice(0, 3);
    return validateStorytellerResult(task, {
      version: 1,
      scene: { version: 3, content: task.context.current.content, next: {
        kind: 'opportunities', state: selected.length ? 'available' : 'held',
        options: selected.map((node) => ({
          id: node.id,
          label: node.label,
          intention: node.description,
        })),
      } },
      currentNotes: [], arrivalNotes: [],
    });
  }
  const scene = scenes[task.profile.id] ?? scenes['quiet-eerie-mystery'];
  if (!scene) {
    throw new Error('Missing rehearsal content');
  }
  if (!/spongebob|pineapple/i.test(task.context.premise.premise)) {
    return validateStorytellerResult(task, {
      version: 1,
      scene: {
        version: task.task === 'opening' ? 1 : 2,
        content: content(
          'Scripted rehearsal',
          'This offline source rehearses the pineapple scenario. Your premise is saved, but requires an explicitly enabled model source for an adapted story.',
        ),
        next: offer,
      },
      currentNotes: [],
      arrivalNotes: [],
    });
  }
  if (task.task === 'opening') {
    return validateStorytellerResult(task, {
      version: 1,
      scene: {
        version: 1,
        content: content('Morning in the pineapple', scene.opening),
        next: offer,
      },
      currentNotes: [
        {
          kind: 'create',
          key: 'starting-place',
          text: 'The character woke in the pineapple, with Gary nearby.',
          evidence: ['current'],
        },
      ],
      arrivalNotes: [],
    });
  }
  const intention = task.context.selected?.id;
  const remembered = task.context.notes.find(
    (note) => note.key === 'gary-promise',
  );
  if (intention === 'leave') {
    return validateStorytellerResult(task, {
      version: 1,
      scene: {
        version: 2,
        content: content(
          'On the way to work',
          'You leave the pineapple and set off toward work. The delivery question remains unresolved.',
        ),
        next: {
          kind: 'interval',
          gameDurationMs: 600000,
          arrival: {
            content: content(
              'Outside work',
              remembered
                ? 'You arrive at work, still remembering Gary’s promise to protect the delivery. You have not agreed to take it over.'
                : 'You arrive at work. The puzzling delivery at home remains unexplained.',
            ),
            next: {
              kind: 'choice',
              prompt: 'What next?',
              options: [
                {
                  id: 'return',
                  label: 'Return home to Gary',
                  intention: 'Walk back to the pineapple to speak with Gary.',
                },
                {
                  id: 'observe',
                  label: 'Take a quiet moment outside',
                  intention:
                    'Pause outside work and observe the surroundings without committing to a new task.',
                },
              ],
            },
          },
        },
      },
      currentNotes: [],
      arrivalNotes: [],
    });
  }
  if (intention === 'return') {
    return validateStorytellerResult(task, {
      version: 1,
      scene: {
        version: 2,
        content: content(
          'Heading home',
          'You turn back and begin the walk home.',
        ),
        next: {
          kind: 'interval',
          gameDurationMs: 600000,
          arrival: {
            content: content(
              'Back at the pineapple',
              'Gary is still near the kitchen. You are home again, and the delivery question is yours to revisit or leave alone.',
            ),
            next: offer,
          },
        },
      },
      currentNotes: [],
      arrivalNotes: [],
    });
  }
  if (intention === 'observe') {
    return validateStorytellerResult(task, {
      version: 1,
      scene: {
        version: 2,
        content: content(
          'A quiet moment',
          'You pause outside work. Nothing demands an immediate response. The decision about returning home remains yours.',
        ),
        next: {
          kind: 'choice',
          prompt: 'What next?',
          options: [
            {
              id: 'return',
              label: 'Walk home',
              intention: 'Walk back home to the pineapple.',
            },
            {
              id: 'observe',
              label: 'Stay and watch the street',
              intention: 'Continue quietly observing the street.',
            },
          ],
        },
      },
      currentNotes: [],
      arrivalNotes: [],
    });
  }
  return validateStorytellerResult(task, {
    version: 1,
    scene: {
      version: 2,
      content: content(
        intention === 'ask' ? 'Gary’s promise' : 'Breakfast first',
        intention === 'ask' ? scene.discovery : scene.quiet,
      ),
      next: offer,
    },
    currentNotes:
      intention === 'ask'
        ? [
            {
              kind: remembered ? 'update' : 'create',
              key: 'gary-promise',
              text: 'Gary says he promised to protect a delivery until its owner returned. The character has not promised to help.',
              evidence: ['current'],
            },
          ]
        : [],
    arrivalNotes: [],
  });
}
