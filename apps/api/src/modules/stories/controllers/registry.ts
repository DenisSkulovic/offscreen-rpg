import { StoriesCatalogueAndLaunchController } from './catalogue-and-launch.js';
import { StoriesEventsController } from './story-events.js';
import { StoriesReadsController } from './story-reads.js';
import { StoriesCommandsController } from './story-commands.js';
import { StoriesDocumentsController } from './story-documents.js';

/** Registration order: static catalogue/launch paths, then SSE, then parameterized reads/commands. */
export const STORIES_HTTP_CONTROLLERS = [
  StoriesCatalogueAndLaunchController,
  StoriesEventsController,
  StoriesReadsController,
  StoriesDocumentsController,
  StoriesCommandsController,
] as const;
