import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { hasStorePermission } from '@/lib/auth/store-rbac';
import { EVENT_DRIVEN_WORKFLOW_AUTHORITY, EVENT_DRIVEN_WORKFLOW_SUBSCRIPTIONS } from '@/lib/automation/event-driven-workflows';
import { WorkflowEventRetryButton } from '@/components/admin/workflow-event-actions';

export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = { completed: 'Lezárt', awaiting_approval: 'Jóváhagyásra vár', retry: 'Újrapróbálásra vár', dead_letter: 'Dead-letter', processing: 'Feldolgozás alatt' };

export default async function Page() {
  await requirePlanFeature('automation');
  const store = await requireCurrentStoreContext('analytics.read');
  const canManage = store.isPlatform || await hasStorePermission(store.instanceId, 'store.manage');
  const admin = createAdminClient();
  const { data, error } = await admin.from('automation_processing_runs')
    .select('id,run_key,started_at,completed_at,metadata')
    .eq('instance_id', store.instanceId)
    .eq('metadata->>authority', EVENT_DRIVEN_WORKFLOW_AUTHORITY)
    .order('started_at', { ascending: false })
    .limit(100);
  const rows = data ?? [];

  return <section className="adminMain">
    <span className="eyebrow">Pro · Automatizálás · Block 17</span>
    <h1 className="sectionTitle">Eseményvezérelt workflow-k</h1>
    <p className="lead">A Shoperation moduljai szabványos eseményeket adhatnak át a közös automatizálási motornak. A motor kizárólag a meglévő, tenant-safe runbook és kontroll-authoritykat használja.</p>
    <div className="actions"><a className="btn btnGhost" href="/admin/automatizalas">Vissza az automatizálási központba</a></div>

    <section className="card">
      <h2>Developer-authored előfizetések</h2>
      <p className="muted">A trigger → runbook párok verziózott alkalmazáskódban élnek; itt nincs drag-and-drop workflow builder.</p>
      <div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Esemény</th><th>Runbook</th><th>Kategória</th><th>Kockázat</th></tr></thead><tbody>
        {Object.entries(EVENT_DRIVEN_WORKFLOW_SUBSCRIPTIONS).map(([event, subscription]) => <tr key={event}><td><code>{event}</code></td><td><code>{subscription.runbookKey}</code></td><td>{subscription.category}</td><td>{subscription.severity}</td></tr>)}
      </tbody></table></div>
    </section>

    <section className="card">
      <h2>Futások, retry és dead-letter</h2>
      {error && <div className="errorNotice" role="alert">Az esemény-workflow napló most nem tölthető be. Biztonsági okból retry sem indítható.</div>}
      {!error && <div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Indult</th><th>Esemény</th><th>Forrás</th><th>Állapot</th><th>Próba</th><th>Következő retry</th><th>Művelet</th></tr></thead><tbody>
        {rows.map((row: any) => { const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, any> : {}; const event = meta.event && typeof meta.event === 'object' ? meta.event : {}; const status = String(meta.status ?? 'processing'); return <tr key={row.id}><td>{new Date(row.started_at).toLocaleString('hu-HU')}</td><td><code>{String(event.type ?? '—')}</code></td><td><code>{String(event.sourceId ?? '—').slice(0, 32)}</code></td><td>{statusLabel[status] ?? status}</td><td>{Number(meta.attempt ?? 0)}</td><td>{meta.nextAttemptAt ? new Date(meta.nextAttemptAt).toLocaleString('hu-HU') : '—'}</td><td>{canManage && !error && status === 'retry' ? <WorkflowEventRetryButton runId={row.id} /> : status === 'dead_letter' ? <span className="muted">Kézi kivizsgálás szükséges</span> : '—'}</td></tr>; })}
      </tbody></table></div>}
      {!error && rows.length === 0 && <p className="muted">Még nincs eseményvezérelt workflow-futás ennél a webshopnál.</p>}
    </section>
  </section>;
}
