import type { Provider, Type } from '@nestjs/common';
import { IdentityService } from './modules/auth/identity.js';
import { OPENINGS } from './modules/drafts/openings-controller.js';

export { IdentityService, OPENINGS };

/**
 * Production API extension point. Callers supply Nest controllers and
 * providers; this module does not import Lab Support or construct Lab services.
 */
export type ApiOptionalExtension = {
  controllers: Type<unknown>[];
  providers: Provider[];
  fixtureSourceCanRespond?: (source: string) => boolean;
};
