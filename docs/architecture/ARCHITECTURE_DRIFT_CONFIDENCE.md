# Architecture Drift, Confidence és Guard Rationalization

Ez a réteg a már meglévő Constitution, Domain Foundations, Capability Registry, Living Roadmap, Evidence Ledger és Atlas 2.0 fölött működik.

## Drift

Hard driftnek számít például:

- capability olyan domainre hivatkozik, amely nincs a canonical Domain Foundation registryben;
- capability authority eltér a domain canonical ownerétől;
- egy `done` roadmap elemnek nincs verified evidence-e;
- verified evidence source SHA-ja nem része az aktuális Git történetnek;
- két blocking guard ugyanazt a felelősséget saját authority-ként próbálja birtokolni.

A hard drift `BLOCK` döntést ad.

## Confidence

A confidence nem üzleti truth és nem release-engedély. Technikai bizonyítottsági jelzés.

A capability score összetevői:

- canonical domain: 20
- authority egyezés: 15
- explicit evidence obligation: 15
- Atlas kódlefedettség: 20
- Living Roadmap kapcsolat: 10
- verified evidence: 20

A címkék: `proven`, `supported`, `declared`, `insufficient`.

## Guard Rationalization

A `quality/knowledge/guard-registry.v1.json` nem újabb guard. A már létező blocking és informational kontrollokat rendezi egyetlen registrybe.

Kötelező elv: **egy blocking responsibility → egy canonical guard owner**.

Így egy új kontroll bevezetésekor látható, ha valójában már létezik ugyanarra a hibakategóriára egy másik gate. Ez csökkenti a gate-proliferációt.

## Artifact

`node scripts/lib/shoperation-architecture-health.mjs --check`

kimenete:

- `artifacts/shoperation-architecture/architecture-health.json`
- `artifacts/shoperation-architecture/architecture-health.md`

A következő Daily Deep Atlas Scan ezt a riportot is felhasználja.
