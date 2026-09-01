'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogChange } from '@/lib/catalog-import';

type Preview = {
  line: number;
  id: string;
  sku?: string;
  status: 'error' | 'change' | 'same';
  message?: string;
  before?: { stock: number; grossPrice: number; netPrice: number; active: boolean };
  after?: { stock: number; grossPrice: number; netPrice: number; active: boolean };
};

type PreviewResponse = {
  error?: string;
  preview?: Preview[];
  validChanges?: CatalogChange[];
};

type ApplyResponse = { error?: string; count?: number };

export function CatalogImporter() {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState<Preview[]>([]);
  const [changes, setChanges] = useState<CatalogChange[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function preview() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/catalog/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', csv }),
      });
      const payload = (await response.json()) as PreviewResponse;
      if (!response.ok) {
        setMessage(payload.error ?? 'Az előnézet nem sikerült.');
        return;
      }
      setRows(payload.preview ?? []);
      setChanges(payload.validChanges ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!changes.length) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/catalog/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'apply', changes }),
      });
      const payload = (await response.json()) as ApplyResponse;
      if (!response.ok) {
        setMessage(payload.error ?? 'Az import nem sikerült.');
        return;
      }
      setMessage(`${payload.count ?? changes.length} termék módosítva.`);
      setRows([]);
      setChanges([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="featurePanel">
      <span className="eyebrow">Biztonságos CSV import</span>
      <h2>Előnézet nélkül nincs adatírás</h2>
      <p className="muted">
        Kötelező oszlop: <code>id</code>. Támogatott módosító oszlopok: <code>stock</code>,{' '}
        <code>net_price</code>, <code>gross_price</code>, <code>active</code>.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setCsv(await file.text());
          setRows([]);
          setChanges([]);
        }}
      />
      <textarea
        rows={8}
        value={csv}
        onChange={(event) => {
          setCsv(event.target.value);
          setRows([]);
          setChanges([]);
        }}
        placeholder={'id,stock,net_price,gross_price,active\n...'}
      />
      <div className="actions">
        <button className="btn btnGhost" type="button" disabled={busy || !csv.trim()} onClick={preview}>
          {busy ? 'Ellenőrzés…' : 'Import előnézet'}
        </button>
        <button
          className="btn btnPrimary"
          type="button"
          disabled={busy || !changes.length || rows.some((row) => row.status === 'error')}
          onClick={apply}
        >
          Jóváhagyás és alkalmazás ({changes.length})
        </button>
      </div>
      {message && <p className="helperText">{message}</p>}
      {rows.length > 0 && (
        <div className="tableCard adminTableScroll">
          <table className="adminTable">
            <thead><tr><th>Sor</th><th>Termék</th><th>Állapot</th><th>Előtte</th><th>Utána</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.line}-${row.id}`}>
                  <td>{row.line}</td>
                  <td>{row.sku ?? row.id}</td>
                  <td>
                    <span className="badge">{row.status === 'error' ? 'Hiba' : row.status === 'same' ? 'Nincs változás' : 'Módosul'}</span>
                    {row.message && <><br /><span className="errorNotice">{row.message}</span></>}
                  </td>
                  <td>{row.before ? `${row.before.stock} db · ${row.before.netPrice}/${row.before.grossPrice} Ft · ${row.before.active ? 'aktív' : 'inaktív'}` : '—'}</td>
                  <td>{row.after ? `${row.after.stock} db · ${row.after.netPrice}/${row.after.grossPrice} Ft · ${row.after.active ? 'aktív' : 'inaktív'}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
