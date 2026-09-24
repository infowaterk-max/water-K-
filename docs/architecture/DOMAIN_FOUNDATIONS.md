# Shoperation Domain Foundations v1

A Domain Foundation a Global Foundation alatti első kötelező authority-szint. Nem feature-lista és nem moduljegyzék: azt rögzíti, hogy egy üzleti/technikai domain **milyen truth-ot birtokol, milyen felelőssége van, mit nem birtokolhat, mely domain-ekre támaszkodik, és milyen bizonyíték szükséges a módosításához**.

A kanonikus gépi registry:

`quality/knowledge/domain-foundations.v1.json`

## Kötelező domain-szerződés

Minden domain Foundation rendelkezik:

- stabil `DOMAIN-*` gépi azonosítóval;
- egyetlen canonical ownerrel;
- explicit céllal;
- globálisan egyedi truth ownership kulcsokkal;
- pozitív responsibilities listával;
- `doesNotOwn` negatív felelősségi határral;
- aciklikus domain dependency gráffal;
- boundary rule-okkal;
- Constitution principle kapcsolatokkal;
- canonical path mintákkal;
- evidence obligation listával.

## Miért fontos a truth ownership?

A fájl- vagy modulhatár önmagában nem mondja meg, ki dönt egy kérdésben. A Domain Foundation ezért nemcsak azt rögzíti, hogy mely fájlok tartoznak egy területhez, hanem azt is, hogy **melyik truth-nak ki az egyetlen gazdája**.

Példák:

- `identity.authorization-decision` → Identity & Access
- `context.tenant` → Tenant & Operating Context
- `commerce.order` → Commerce Core
- `inventory.stock` → Catalog & Inventory
- `data.migration-state` → Database, Schema & Persistence
- `release.deployment-state` → Release & Production Lifecycle

Egy truth kulcs két domainben nem lehet canonical ownership alatt.

## Cross-domain szabály

Cross-domain kapcsolat csak deklarált dependency és authority/contract mentén történhet. Egy domain nem nyúlhat át egy másik domain private implementációjába azért, hogy gyorsabban elérjen egy állapotot.

A dependency **engedélyezett irányt** jelent, nem ownership-átruházást.

## Evidence obligation

A Domain Foundation azt is rögzíti, mit kell bizonyítani, ha a domain authority-ja változik. Ez lesz később az Atlas 2.0 Change Impact egyik bemenete.

## Atlas 2.0 kapcsolat

A következő Self-Knowledge réteg a Domain Foundation registry alapján tudja majd felépíteni ezt a láncot:

`file → surface → domain → truth owner → dependency → boundary rule → invariant → Known Failure → regression authority → release closure`

Így a rendszer nemcsak azt fogja tudni, hogy *mely fájlok változtak*, hanem azt is, hogy *milyen architecture truth változhatott meg emiatt*.
