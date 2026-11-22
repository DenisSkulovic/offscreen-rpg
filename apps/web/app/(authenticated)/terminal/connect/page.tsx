import { z } from 'zod';
import { notFound } from 'next/navigation';
import { terminalPairingConsentSchema } from '@offscreen/contracts/terminal-auth';
import { TerminalConnectForm } from '@/src/features/terminal/terminal-connect-form';
import { requireViewer } from '@/src/server/viewer';
import { classifyNestStatus } from '@/src/shared/api/classify-nest-status';
import { NestTransientError } from '@/src/shared/api/nest-errors';
import { nestFetch, parseNestJson } from '@/src/server/nest-reader';

export default async function TerminalConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ pairingId?: string }>;
}) {
  const viewer = await requireViewer();
  const { pairingId } = await searchParams;
  const parsedId = z.uuid().safeParse(pairingId);
  if (!parsedId.success) {
    notFound();
  }
  const response = await nestFetch(
    viewer,
    `/api/terminal-auth/pairings/${parsedId.data}/consent`,
  );
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    const classified = classifyNestStatus(response.status);
    if (classified.kind === 'not_found') {
      notFound();
    }
    throw new NestTransientError(
      response.status,
      'Terminal pairing consent could not be loaded',
    );
  }

  const consent = await parseNestJson(response, terminalPairingConsentSchema);
  return <TerminalConnectForm consent={consent} />;
}
