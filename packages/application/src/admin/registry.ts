/**
 * Closed V1 capability/package registry. Unknown names deny.
 * Package content is code-defined; assignments reference packageId+version.
 */

export const ADMIN_CAPABILITIES = [
  'player.summary.read',
  'player.identity.read',
  'campaign.metadata.read',
  'ai.operation.read',
  'platform.status.read',
  'staff.profile.read',
  'staff.access.inspect',
  'audit.events.read',
  'case.summary.read',
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

export const ADMIN_RESOURCE_KINDS = [
  'player',
  'campaign',
  'operation',
  'staff',
  'case',
  'platform',
  'audit',
] as const;

export type AdminResourceKind = (typeof ADMIN_RESOURCE_KINDS)[number];

export type AdminEnvironment = 'local' | 'staging' | 'production';

export type AdminGrantScope = Readonly<{
  environments: readonly AdminEnvironment[];
  /** Empty = any named resource of the grant's resource kinds (still needs exact id when required). */
  playerIds?: readonly string[];
  campaignIds?: readonly string[];
  caseIds?: readonly string[];
  /** When true, resource must be covered by an authorized case assignment in context. */
  requireAuthorizedCaseAssignment?: boolean;
}>;

export type AdminPackageGrant = Readonly<{
  capability: AdminCapability;
  resourceKinds: readonly AdminResourceKind[];
  workspaceFamily: string;
}>;

export type AdminCapabilityPackage = Readonly<{
  id: string;
  version: number;
  label: string;
  grants: readonly AdminPackageGrant[];
}>;

const ADMIN_READER_V1: AdminCapabilityPackage = {
  id: 'admin-reader',
  version: 1,
  label: 'Admin Reader',
  grants: [
    {
      capability: 'player.summary.read',
      resourceKinds: ['player'],
      workspaceFamily: 'player',
    },
    {
      capability: 'campaign.metadata.read',
      resourceKinds: ['campaign'],
      workspaceFamily: 'campaign',
    },
    {
      capability: 'ai.operation.read',
      resourceKinds: ['operation'],
      workspaceFamily: 'ai',
    },
  ],
};

const SUPPORT_OPERATOR_V1: AdminCapabilityPackage = {
  id: 'support-operator',
  version: 1,
  label: 'Support Operator',
  grants: [
    {
      capability: 'player.summary.read',
      resourceKinds: ['player'],
      workspaceFamily: 'support',
    },
    {
      capability: 'case.summary.read',
      resourceKinds: ['case'],
      workspaceFamily: 'support',
    },
  ],
};

const ENGINEERING_OBSERVER_V1: AdminCapabilityPackage = {
  id: 'engineering-observer',
  version: 1,
  label: 'Engineering Observer',
  grants: [
    {
      capability: 'platform.status.read',
      resourceKinds: ['platform'],
      workspaceFamily: 'platform',
    },
    {
      capability: 'ai.operation.read',
      resourceKinds: ['operation'],
      workspaceFamily: 'ai',
    },
  ],
};

const STAFF_ACCESS_STEWARD_V1: AdminCapabilityPackage = {
  id: 'staff-access-steward',
  version: 1,
  label: 'Staff Access Steward',
  grants: [
    {
      capability: 'staff.profile.read',
      resourceKinds: ['staff'],
      workspaceFamily: 'staff',
    },
    {
      capability: 'staff.access.inspect',
      resourceKinds: ['staff'],
      workspaceFamily: 'staff',
    },
  ],
};

const SECURITY_AUDITOR_V1: AdminCapabilityPackage = {
  id: 'security-auditor',
  version: 1,
  label: 'Security Auditor',
  grants: [
    {
      capability: 'audit.events.read',
      resourceKinds: ['audit'],
      workspaceFamily: 'audit',
    },
    {
      capability: 'staff.access.inspect',
      resourceKinds: ['staff'],
      workspaceFamily: 'staff',
    },
  ],
};

const PACKAGES: readonly AdminCapabilityPackage[] = [
  ADMIN_READER_V1,
  SUPPORT_OPERATOR_V1,
  ENGINEERING_OBSERVER_V1,
  STAFF_ACCESS_STEWARD_V1,
  SECURITY_AUDITOR_V1,
];

export function getAdminPackage(
  id: string,
  version: number,
): AdminCapabilityPackage | null {
  return PACKAGES.find((pkg) => pkg.id === id && pkg.version === version) ?? null;
}

export function listAdminPackages(): readonly AdminCapabilityPackage[] {
  return PACKAGES;
}

export function isAdminCapability(value: string): value is AdminCapability {
  return (ADMIN_CAPABILITIES as readonly string[]).includes(value);
}

export function isAdminResourceKind(value: string): value is AdminResourceKind {
  return (ADMIN_RESOURCE_KINDS as readonly string[]).includes(value);
}

/** Capability → primary resource kind for deny-by-default route binding. */
export function resourceKindForCapability(
  capability: AdminCapability,
): AdminResourceKind {
  const [family] = capability.split('.');
  switch (family) {
    case 'player':
      return 'player';
    case 'campaign':
      return 'campaign';
    case 'ai':
      return 'operation';
    case 'platform':
      return 'platform';
    case 'staff':
      return 'staff';
    case 'audit':
      return 'audit';
    case 'case':
      return 'case';
    default:
      return 'platform';
  }
}
