import Link from 'next/link';
import { requireAdminActor } from '@/src/server/admin-actor';
import { AdminGovernancePanel } from '@/src/features/admin/governance-panel';
import { AdminUsageLookup } from '@/src/features/admin/usage-lookup';

export default async function ControlHomePage() {
  const { self } = await requireAdminActor();
  return (
    <main>
      <h1>Command overview</h1>
      <p>
        Session is active. Resource reads stay Nest-authorized. Start with an
        exact player reference.
      </p>
      <ul>
        <li>
          <Link href="/control/players">Player 360 lookup</Link>
        </li>
      </ul>
      <p>
        Families:{' '}
        {self.workspaceFamilies.length > 0
          ? self.workspaceFamilies.join(', ')
          : 'none yet'}
      </p>
      <AdminGovernancePanel self={self} />
      <AdminUsageLookup self={self} />
    </main>
  );
}
