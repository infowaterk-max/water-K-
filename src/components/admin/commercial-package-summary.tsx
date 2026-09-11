import {SHOPERATION_COMMERCIAL_POLICY,formatNetHuf,getPlanMonthlyNetHuf} from '@/lib/plans/commercial-policy';

export function CommercialPackageSummary(){
  const policy=SHOPERATION_COMMERCIAL_POLICY;
  return <section className="card">
    <span className="eyebrow">Block 24 · Commercial policy</span>
    <h2>Induló csomagolás és próbaidő</h2>
    <p className="muted">Az árpolicy nem jogosultsági authority: a tényleges hozzáférést továbbra is a szerveroldali Block 11 entitlement-rendszer dönti el.</p>
    <div className="cards">
      <article className="card"><span className="badge">Shoperation Alap</span><div className="price">{formatNetHuf(getPlanMonthlyNetHuf('alap'))} / hó</div><p className="muted">Founding / Early Adopter: {formatNetHuf(getPlanMonthlyNetHuf('alap','founding'))} / hó, {policy.founding.discountGuaranteeMonths} hónapig garantált kedvezménnyel.</p></article>
      <article className="card"><span className="badge">Shoperation Pro</span><div className="price">{formatNetHuf(getPlanMonthlyNetHuf('pro'))} / hó</div><p className="muted">Founding / Early Adopter: {formatNetHuf(getPlanMonthlyNetHuf('pro','founding'))} / hó, {policy.founding.discountGuaranteeMonths} hónapig garantált kedvezménnyel.</p></article>
      <article className="card"><span className="badge">Próbaidő</span><div className="price">{policy.trial.durationDays} nap</div><p className="muted">A trial nem írja át a tartós csomagszintet. A hozzáférést ideiglenes entitlement adja és lejáratkor fail-closed módon megszűnik.</p></article>
    </div>
  </section>;
}
