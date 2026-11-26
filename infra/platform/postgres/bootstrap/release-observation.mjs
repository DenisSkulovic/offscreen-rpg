import { collectProjectedBaseline } from './projection.mjs';

export function collectReleaseCnpgProbe(deps = {}) {
  return collectProjectedBaseline('release', deps);
}
