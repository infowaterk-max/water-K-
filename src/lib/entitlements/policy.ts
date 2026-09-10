export const ENTITLEMENT_SOURCE_PRIORITY = {
  platform: 500,
  manual: 400,
  trial: 300,
  addon: 200,
  plan: 100,
} as const;

export type EntitlementSource = keyof typeof ENTITLEMENT_SOURCE_PRIORITY;

export type EntitlementCandidate = {
  id?: string | null;
  enabled: boolean;
  source: string;
  instance_id: string | null;
  valid_from: string;
  valid_until: string | null;
  updated_at: string;
};

export function isEntitlementSource(value: string): value is EntitlementSource {
  return Object.prototype.hasOwnProperty.call(ENTITLEMENT_SOURCE_PRIORITY, value);
}

export function isEntitlementCandidateActive(candidate: EntitlementCandidate, now = new Date()): boolean {
  const validFrom = Date.parse(candidate.valid_from);
  const validUntil = candidate.valid_until ? Date.parse(candidate.valid_until) : null;
  if (!Number.isFinite(validFrom) || validFrom > now.getTime()) return false;
  if (validUntil !== null && (!Number.isFinite(validUntil) || validUntil <= now.getTime())) return false;
  return true;
}

export function resolveEntitlementCandidate(
  candidates: readonly EntitlementCandidate[],
  instanceId: string,
  now = new Date(),
): EntitlementCandidate | null {
  const eligible = candidates
    .filter((candidate) => isEntitlementSource(candidate.source))
    .filter((candidate) => candidate.instance_id === null || candidate.instance_id === instanceId)
    .filter((candidate) => isEntitlementCandidateActive(candidate, now));

  eligible.sort((a, b) => {
    const sourcePriority = ENTITLEMENT_SOURCE_PRIORITY[b.source as EntitlementSource]
      - ENTITLEMENT_SOURCE_PRIORITY[a.source as EntitlementSource];
    if (sourcePriority !== 0) return sourcePriority;

    const specificity = (b.instance_id === instanceId ? 1 : 0) - (a.instance_id === instanceId ? 1 : 0);
    if (specificity !== 0) return specificity;

    const updated = Date.parse(b.updated_at) - Date.parse(a.updated_at);
    if (updated !== 0 && Number.isFinite(updated)) return updated;

    return String(b.id ?? '').localeCompare(String(a.id ?? ''));
  });

  return eligible[0] ?? null;
}
