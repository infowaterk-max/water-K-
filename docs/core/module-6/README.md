# Shoperation Core Module 6 — PO üzleti funkcionális lezárás (2026-10-12)

**Státusz:** 6.1–6.9 funkcionális és Alap/Pro üzleti követelmények PO ACCEPTED / BUSINESS FUNCTIONAL SCOPE CLOSED. **Nem technikai lezárás, nem Market Ready, nem release vagy VERIFIED_DONE.** A 6.3 központi e-mailküldés végleges fogyasztási egységára, a csomagba foglalt keretek és számlázási részletek kifejezetten **OPEN**, önálló [#1264](https://github.com/infowaterk-max/water-K-/issues/1264) kereskedelmi döntés. **Az új központi e-mail díjszabás nélkül nem indulhat kereskedelmi díjszámlázás.**

- **Elsődleges üzleti forrás:** [PO review #1263](https://github.com/infowaterk-max/water-K-/issues/1263), PO-döntések 2026-10-12, értelemszerűen megőrzött részletes követelmények, normatív bizonyítási esetek és cost owner határok.
- **6.1–6.3/A+B teljes üzleti szerződés:** [6.1–6.3](6.1-6.3.md).
- **6.4–6.9 teljes üzleti szerződés:** [6.4–6.9](6.4-6.9.md).
- **Korábbi, változatlan authority:** [M1–4 #1259](https://github.com/infowaterk-max/water-K-/issues/1259), [M5 #1261](https://github.com/infowaterk-max/water-K-/issues/1261), [M5 docs draft #1262](https://github.com/infowaterk-max/water-K-/pull/1262), Living Roadmap v2, shared pricing, catalog, BOM, order/stock, promotions, M4 consent/privacy, analytics/attribution, email/communication.
- A **Core-first fejlesztési sorrend (U11/B/aktuális ág)** nem változik; ez a PR tisztán dokumentációs, semmi nem jogosít fel F35/Template Factory/Builder megkerülésére vagy új kereskedelmi kód indulására.

## Közös Alap/Pro megfelelési határ

| Pont | Alap | Pro többlet | PO üzleti státusz |
|---|---|---|---|
| 6.1 Kupon | Egyszerű fix/% szabályok | Halmozás, szegmentált/összetett | elfogadva |
| 6.2 Időzített promóció | Termékakció és időzítés | Fejlett szabály/fedezet-támogatás | elfogadva |
| 6.3/A Hibrid e-mail | Central managed vagy saját SMTP/API | Ugyanaz a transport + Pro Office workspace külön | architektúra elfogadva |
| 6.3/B Hírlevél | Sablon, tartalom, kézi/időzített küldés, consent, alap mutatók | Szegmensek, több lépcsős kampány, ROI | elfogadva; díj/kvóta nyitott |
| 6.4 Ajánlások | Kézi és alap készlet/kosár cross-sell | Összetett kategória/kosár szabály, részletes riport | elfogadva |
| 6.5 Értékelés | Hiteles review, moderáció és kereskedői válasz | Idősoros/tematikus elemzés | elfogadva |
| 6.6 SEO | Teljes technikai SEO és alap audit | Tömeges javaslat és valós search analitika | elfogadva |
| 6.7 Kampánymérés | UTM, forrás, alap konverzió | Csatornák, költség/ROAS és adat-alapú tanács | elfogadva |
| 6.8 Tartalommarketing | Blog, landing, termék/kupon, időzítés | Tervezés/tartalomnaptár, konverzió | elfogadva |
| 6.9 Bundle/gift promóció | Fix bundle, egyszerű együttes vétel, időzítés | Ajándéktermék-feltételek, komplex promóció, ROI | elfogadva |

A táblázat csak eligazodási index. **Az alábbi részletes per-point normatív követelmények az irányadók; a táblázat nem írja felül azokat vagy az M1–M5 korábbi elfogadott döntéseit.**

## Költségpolitika — minden jövőbeli pontra kötelező
## Általános PO költségtranszparencia — 2026-10-12-től kötelező

**Kifejezett PO-utasítás:** minden következő funkció vagy fejlesztési döntés előtt külön jelezni kell a jelentős vagy várható egyszeri fejlesztési/bevezetési, havi vagy éves szolgáltatói, licenc-, API-/AI-/e-mail-/adatforgalom-használatalapú, hosting/storage/üzemeltetési költséget. Minden díjnál meg kell nevezni a költségviselőt (Shoperation vagy kereskedő), a kötelező vagy opcionális jelleget, valamint az ismert egységárat, mennyiséget és a becsült havi terhelést, amennyiben megbízhatóan számszerűsíthető. Ismeretlen összeg NEM ISMERT és nem 0 Ft; nem jelenthető be végleges árként. A csomagdíjba épített költség sem ingyenes üzemeltetési oldalról. Költséges külső provider/előfizetés, végleges tarifa, számlázási szabály vagy automatikus költségnövelés nem aktiválható külön explicit PO jóváhagyás nélkül. Business PO-elfogadás != műszaki VERIFIED_DONE.

## Technikai és kereskedelmi lezárási kapuk
- **Business functional PO acceptance**: lezárva a 6.1–6.9 pontokra; változtatás csak új, kifejezett PO döntéssel.
- **Pricing/commercial**: nyitott [#1264](https://github.com/infowaterk-max/water-K-/issues/1264). A korábbi 0,50 USD/1000 e-mail csak illusztráció, nem számlázható tarifa. Pro/Alap e-mail küldési alapfogyasztási keret és metering policy még nincs elfogadva.
- **Implementation/Capability Dependency Closure**: OPEN/PARTIAL, minden 6.x esetén required UI/entitlement, canonical engine, adattár, checkout/order/fiscal, provider, runtime, audit, truth/proof és CI lánc E2E; nem elegendő a kód/fájl megléte. Részletes M6.1–M6.9 bizonyítási esetek a kapcsolt teljes részletes dokumentumokban.
- **Current exact CI/Truth/Lifecycle**: nem igazolt PASS ebben a dokumentációs döntésben. A későbbi tényleges integráció és Market Ready előtt a main/PR SHA, CI, Completion Truth és Lifecycle friss lekérdezése és valós proof kötelező.
- **Docs draft status**: a fájlok draft PR-en kerülnek előkészítésre, nem jelentenek mainre merge-elt vagy publikált új termékfunkciót.
