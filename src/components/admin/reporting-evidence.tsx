import type { ReactNode } from 'react';
import { DEFAULT_REPORTING_EVIDENCE_KINDS, REPORTING_EVIDENCE_META, type ReportingEvidenceKind } from '@/lib/admin/reporting-contract';

export function ReportingLegend({ kinds = DEFAULT_REPORTING_EVIDENCE_KINDS }: { kinds?: readonly ReportingEvidenceKind[] }) {
  return <aside className="reportingLegend" aria-label="Riport bizonyossági szintek">
    {kinds.map((kind) => <div className={`reportingLegendItem reportingLegendItem-${kind}`} key={kind}>
      <strong>{REPORTING_EVIDENCE_META[kind].label}</strong>
      <span>{REPORTING_EVIDENCE_META[kind].description}</span>
    </div>)}
  </aside>;
}

export function ReportingEvidence({ kind, children, className = '' }: { kind: ReportingEvidenceKind; children: ReactNode; className?: string }) {
  const meta = REPORTING_EVIDENCE_META[kind];
  return <section className={`reportingEvidence reportingEvidence-${kind} ${className}`.trim()} data-report-kind={kind}>
    <div className="reportingEvidenceHeader">
      <span>{meta.label}</span>
      <p>{meta.description}</p>
    </div>
    {children}
  </section>;
}
