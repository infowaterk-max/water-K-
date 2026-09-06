export type ReportingEvidenceKind = 'fact' | 'calculation' | 'recommendation';

export const REPORTING_EVIDENCE_META: Record<ReportingEvidenceKind, { label: string; description: string }> = {
  fact: {
    label: 'Tényadat',
    description: 'Közvetlenül az aktuális webshop forrásadataiból megjelenített érték vagy esemény.',
  },
  calculation: {
    label: 'Számított mutató',
    description: 'Tényadatokból képlettel, időablakkal vagy attribúciós szabállyal előállított eredmény.',
  },
  recommendation: {
    label: 'Ajánlás',
    description: 'Szabály vagy modell alapján javasolt teendő; nem tény és nem automatikus üzleti döntés.',
  },
};

export const DEFAULT_REPORTING_EVIDENCE_KINDS: readonly ReportingEvidenceKind[] = ['fact', 'calculation', 'recommendation'];
