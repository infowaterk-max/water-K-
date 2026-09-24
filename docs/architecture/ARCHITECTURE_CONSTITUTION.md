# Shoperation Architecture Constitution

Ez a dokumentum a Shoperation legmagasabb szintű technikai authority-ja. Nem feature-specifikáció és nem roadmap; azt rögzíti, milyen szabályok fölé nem írhat egyetlen alrendszer, sablon, integráció vagy automatizmus sem.

## Authority-sorrend

1. Architecture Constitution
2. Global Foundation
3. Domain Foundation
4. Capability Contract
5. Implementation
6. Evidence

Alacsonyabb szintű authority nem írhatja felül a magasabbat. Ha két dokumentum vagy implementáció ellentmond, a magasabb szint az irányadó, a konfliktust pedig explicit supersessionnel kell lezárni.

## Alapelvek

- Egy felelősséghez egy kanonikus authority tartozik.
- Tenant, actor, environment és operating context feloldása megelőzi a capability-választást.
- Commerce, identity, release és compatibility truth nem presentation-owned.
- Development Transaction és Release Transaction külön lifecycle.
- Release csak zárt dependency closure-rel létezhet.
- Kritikus authority-hiba fail-closed.
- Külső szolgáltató adapteren keresztül kapcsolódik.
- Source, persisted state, runtime materialization és production külön állapotok.
- Evidence nem válik automatikusan runtime truth-tá.
- Ismert hiba preventionné alakul: knowledge, regression, policy vagy determinisztikus detektálás.
- Supersession után nincs párhuzamos régi és új igazság.
- Machine authority stabil ID-val és verziózott contracttal rendelkezik.
- Az architektúrának gépileg lekérdezhetőnek kell lennie.
- AI/autonómia csak determinisztikus policy- és authority-határok között működhet.

A teljes gépi authority: `quality/knowledge/architecture-constitution.v1.json`.

## Módosítás

Constitution-módosítás csak verzióemeléssel, explicit indoklással, regression proof-fal és supersession-bejegyzéssel fogadható el. Silent override tilos.
