# Roadmap Block 4 — IA / navigáció / reporting audit

## Cél

A Block 4 a meglévő Shoperation felületek információs architektúráját, navigációs elérését és riport-célpontjait konszolidálja. Nem új webshopmotort és nem Visual Buildert épít.

## Elfogadott merchant munkaterületek

1. Vezetői áttekintés
2. Értékesítés
3. Termékek
4. Ügyfelek
5. Készlet & Logisztika
6. Marketing
7. Digitális Iroda
8. Tartalom & Megjelenés
9. Beállítások

A Shoperation platform-admin navigáció külön kontextus marad.

## Acceptance contract

1. Az admin navigáció egyetlen közös IA-regiszterből épül.
2. Minden merchant célpont ugyanazon Alap / Pro capability gate és store-RBAC szabály alapján jelenik meg, mint amelyet a route használ.
3. Pilot-only admin célpont csak `pilot` státuszú tenantnál jelenhet meg.
4. Desktopon a fő admin menücsoportok alapból csukottak; 300 ms hover után oldalsó előnézet nyílik, kattintásra egyetlen tartós accordion szekció nyitható.
5. Mobilon/touch felületen a fő csoportok tap-alapon érhetők el; az aktív cél és a kiválasztott szekció külön panelben látható.
6. A hosszú menük logikai alcsoportokat használnak; a `Gyakori feladatok` és `Intelligens Súgó` külön discovery réteg.
7. A látható adminútvonalak közös breadcrumbot kapnak; nested detail route esetén determinisztikus visszaút mutat a tulajdonos listaoldalra.
8. A reporting-célpontok központi regisztert kapnak; a fejlett riportok feature-gated, `analytics.read` jogosultságú és `instance_id`-scope-olt route-ok maradnak.
9. A reporting felület külön jelöli a `Tényadat`, `Számított mutató` és `Ajánlás` bizonyossági szinteket; ajánlást nem nevezünk ténynek vagy automatikus üzleti döntésnek.
10. A storefront főnavigáció nem tenant-hardcode, hanem deklaratív registry + tenant `storefront_config.navigation` alapján oldható fel (`hidden`, `order`, `labels`).
11. A storefront navigáció Builder Foundation manifestet kap: stabil component key, page/schema slot és responsive mode. Ez csak kompatibilitási contract; a tényleges Page Schema / Template és Visual Builder későbbi roadmap blokk marad.
12. A jelenlegi storefront tartalomszerkesztés nem törölheti a navigation, template vagy későbbi Page Schema ismeretlen config-kulcsait; a mentés merge-preserving.
13. A Water-K pilot állapota, K&H konfigurációja, fizetési életciklusa és production adatmodellje ebben a blokkban nem változik.

## Bizonyíték státuszok

- `TECHNICAL/BACKEND PASS`: csak zöld unit/regression teszt + typecheck + production build + CI után.
- `MANUAL PASS`: csak tényleges Preview/production felületen elvégzett manuális desktop/mobil acceptance után.
- `BLOCKED`: bármely gate vagy manuális acceptance hiba esetén.

A dokumentum nem minősít automatikusan semmit PASS-nak; a státuszt a tényleges futások eredménye dönti el.
