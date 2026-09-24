# Shoperation Global Foundation

A Global Foundation a Constitution gyakorlati rendszerszintű leképezése. Célja, hogy minden domain ugyanazokat a fogalmakat és lifecycle-határokat használja.

## Kötelező globális fogalmak

**Authority** – az a kanonikus tulajdonos, amely egy döntésért vagy truth-ért felel.

**Context** – tenant, actor, role, environment és lifecycle állapot együttese. Capability kiválasztás előtt fel kell oldani.

**Development Transaction** – koherens fejlesztési változáscsomag, saját plan, impact scope és Known Failure replay mellett.

**Release Transaction** – productionbe vihető, dependency-closed, risk-budgettel és exact-head evidence-szel bizonyított változás.

**Truth boundary** – explicit határ, ahol meghatározott adat vagy állapot authority-ja él. UI és demo state nem helyettesítheti.

**Materialization** – source vagy draft authority átvezetése egy persisted/runtime állapotba. Mindig explicit transition.

**Evidence** – teszt, manifest, preview, screenshot, log vagy live probe. Evidence authority-t bizonyít, de nem helyettesít.

## Domain Foundation registry

A gépi domain-regiszter: `quality/knowledge/domain-foundations.v1.json`.

A registry első célja nem az összes domain teljes leírása, hanem a stabil domain-identitás, owner, dependency és canonical-path alap létrehozása. A következő transactionben minden domain külön Foundation contractot kap.

## Atlas 2.0 előfeltétel

A Codebase Atlas következő verziója már nem csak fájl/import gráfot fog kezelni. Az Architecture Constitution és Domain Foundation registry alapján képes lesz összekötni:

`file → surface → domain → authority → dependency → invariant → Known Failure → regression authority → release closure`

Ez lesz a System Self-Knowledge alapja.
