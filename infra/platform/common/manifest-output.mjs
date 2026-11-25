import { stringify } from 'yaml';

const ACCEPTED_FORMATS = new Set(['yaml', 'json', 'legacy']);

/**
 * @param {unknown} documents
 */
function validateDocuments(documents) {
  if (!Array.isArray(documents)) {
    throw new Error('documents must be an array');
  }
  for (const doc of documents) {
    if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
      throw new Error('each document must be a plain object');
    }
  }
}

/**
 * @param {object[]} documents
 * @param {'yaml' | 'json' | 'legacy'} format
 * @returns {string}
 */
export function formatManifestDocuments(documents, format) {
  if (!ACCEPTED_FORMATS.has(format)) {
    throw new Error(`unsupported manifest format: ${format}`);
  }
  validateDocuments(documents);

  if (format === 'json') {
    return `${JSON.stringify(documents, null, 2)}\n`;
  }

  if (format === 'legacy') {
    return documents
      .map((doc) => `---\n${JSON.stringify(doc)}`)
      .join('\n')
      .concat('\n');
  }

  return documents
    .map((doc) => `---\n${stringify(doc)}`)
    .join('\n')
    .concat('\n');
}
