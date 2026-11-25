import {
  DB_PROFILE_SECTIONS,
  DB_SECTION_DEFINITIONS,
} from '../../../runner/catalog.mjs';

export const DB_MANIFEST_SCHEMA_VERSION = 1;

export const DB_SECTION_BY_ID = new Map(
  DB_SECTION_DEFINITIONS.map((row) => [row.id, row]),
);

export const DB_MANIFEST = Object.freeze({
  schemaVersion: DB_MANIFEST_SCHEMA_VERSION,
  subject: Object.freeze({ kind: 'package', id: '@offscreen/db' }),
  defaultProfile: 'standard',
  profiles: Object.freeze(
    Object.fromEntries(
      Object.entries(DB_PROFILE_SECTIONS).map(([profileId, sectionIds]) => [
        profileId,
        Object.freeze({ sections: Object.freeze([...sectionIds]) }),
      ]),
    ),
  ),
  sections: DB_SECTION_DEFINITIONS,
});