import { POSTGRES_OPERATOR_PIN_KEYS, parsePins } from '../common/pins.mjs';
import { readPlatformProfile } from '../common/profile.mjs';

const devProfile = readPlatformProfile('dev');
const releaseProfile = readPlatformProfile('release');

export const DEV_CNPG_CONTEXT = 'kind-offscreen-dev';
export const DEV_CNPG_CLUSTER_NAME = 'offscreen-dev';
export const DEV_CNPG_NAMESPACE = 'offscreen-dev-postgres';
export const DEV_CNPG_CLUSTER = 'dev-pg';
export const DEV_CNPG_OWNER = 'offscreen-dev';
export const DEV_CNPG_MAX_CONNECTIONS = 100;
export const DEV_CNPG_POOL_CAP = 2;
export const DEV_CNPG_MIN_MEMORY_MIB = 4096;
export const RELEASE_CNPG_NAMESPACE = 'lab-postgres';
export const RELEASE_CNPG_CLUSTER = 'lab-pg';
export const DEV_STORAGE_CLASS = devProfile.storageClass;

export const RELEASE_CNPG_CONTEXT = releaseProfile.contextName;
export const RELEASE_CNPG_CLUSTER_NAME = releaseProfile.clusterName;
export const RELEASE_LAB_LABEL_KEY = 'offscreen.rpg/lab';
export const RELEASE_LAB_LABEL_VALUE = 'disposable';
export const RELEASE_CNPG_MIN_MEMORY_MIB = 4096;
export const RELEASE_OPERATOR_FIELD_MANAGER = 'offscreen-release-cnpg';

export const CNPG_OPERATOR_DEPLOYMENT = 'cnpg-controller-manager';
export const CNPG_OPERATOR_NAMESPACE = 'cnpg-system';
export const CNPG_CRD_NAME = 'clusters.postgresql.cnpg.io';

/**
 * @param {string} text
 */
export function parseCnpgPin(text) {
  const values = parsePins(text, POSTGRES_OPERATOR_PIN_KEYS);
  return {
    version: values.CNPG_VERSION,
    url: values.CNPG_URL,
    sha256: values.CNPG_SHA256,
    operatorImage: values.CNPG_IMAGE,
    postgresImage: values.POSTGRES_IMAGE,
  };
}

/**
 * @param {'dev' | 'release'} env
 */
export function baselineCnpgClusterName(env) {
  return env === 'dev' ? DEV_CNPG_CLUSTER : RELEASE_CNPG_CLUSTER;
}
