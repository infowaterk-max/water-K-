'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function WorkflowEventRetryButton({ runId, label = 'Újrapróbálás most' }: { runId: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <button className="btn btnGhost" disabled={busy} onClick={async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/automation/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) throw new Error(body.error ?? 'Az újraellenőrzés nem sikerült.');
      router.refresh();
    } catch (error) { alert(error instanceof Error ? error.message : 'Hiba'); }
    finally { setBusy(false); }
  }}>{busy ? 'Ellenőrzés…' : label}</button>;
}
