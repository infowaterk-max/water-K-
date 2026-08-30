# Webshop Motor – Market Ready 1.0

Ez a dokumentum a piacra lépés célvonalát rögzíti. A fejlesztés ettől a ponttól nem funkciódarabszámot maximalizál: minden új munka az 1.0 indulási minimumhoz, a Pro differenciáláshoz vagy későbbi roadmaphez tartozik.

## Termékpozíció

- **Alap:** teljes értékű, professzionális webshop. Nem demo és nem mesterségesen korlátozott belépőcsomag.
- **Pro:** üzleti növekedési, automatizálási és döntéstámogató réteg.
- **Digitális iroda:** Pro-exkluzív beépített e-mailes és belső kommunikációs munkatér. A normál tranzakciós webshop e-mailek az Alap részei.
- **Extrák:** külön aktiválható, ügyfélenkénti kiegészítők; különösen változó költségű AI, kiemelt támogatás és egyedi integrációk.

## Market Ready 1.0 – kötelező Alap képességek

### Kereskedelmi mag
- termékek, kategóriák, attribútumok és variációk
- készletkezelés és készlethiány-jelzések
- rendeléskezelés
- visszáru és elállás
- ügyféladatbázis és alap ügyfélcsoportok
- kuponok, kedvezmények és akciók
- normál keresés és szűrés
- fizetés, szállítás, csomagpont és számlázási integrációk

### Értékesítés és marketing
- használható alap értékesítési dashboard
- alap riportok és forgalmi mutatók
- alap kampány- és hírlevélkapcsolatok
- kosárelhagyás-kezelés alapfolyamata
- kívánságlista
- készlet-visszaérkezési értesítő
- vásárlói vélemények
- cross-sell / upsell / kapcsolódó termékek
- rendelés utáni ajánlat támogatása

### Tartalom és migráció
- blog / tartalomkezelés
- landing page képesség
- SEO-alapok
- import/export
- tömeges termékműveletek

### Üzemeltetés
- ügyfélszolgálati alapfolyamat
- tranzakciós e-mailek
- biztonságos jogosultságkezelés
- stabil mobil és desktop storefront
- sablon / megjelenés testreszabhatóság
- staging → release ellenőrzési folyamat

## Pro 1.0 – valódi üzleti többlet

- fejlett analitika és mélyebb üzleti KPI-k
- fejlett CRM és ügyfélérték/LTV
- szegmentált, mérhető kampányok és attribúció
- Digitális iroda: integrált e-mail, belső üzenetek, kommunikációs előzmények és csapatmunka
- workflow- és marketingautomatizálás
- fejlett beszerzési döntéstámogatás
- cash-flow előrejelzés
- vezetői analitika
- fejlett/egyedi integrációk
- API-hozzáférés

## 1.0 előtt architekturálisan előkészítendő, de nem blokkoló teljes implementáció

- többnyelvűség
- több pénznem
- több ország adózási/szállítási konfigurációja
- további storefront sablonok
- partner/reseller hosting és domain modell

## 1.1+ roadmap

- fejlett termékösszehasonlítás
- összetettebb merchandising és személyre szabott ajánlómotor
- haladó loyalty / referral rendszer
- AI üzleti tanácsadó és kommunikációs asszisztens
- további marketplace és ERP integrációk
- fejlettebb multi-store / multi-tenant önkiszolgáló onboarding

## Release gate

A nyilvános 1.0 csak akkor jelölhető Market Ready állapotúnak, ha:

1. az Alap csomag a fenti kötelező kereskedelmi minimumot teljesíti;
2. a Pro jogosultságok szerveroldalon is védettek, nem csak a navigációban;
3. új ügyfélhez a csomag és extrák kézi kódmódosítás nélkül hozzárendelhetők;
4. staging build, TypeScript, minőségi és biztonsági ellenőrzések zöldek;
5. kritikus checkout, fizetés, rendelés, e-mail, készlet és visszáru folyamatok regressziós tesztje sikeres;
6. legalább egy Water-K referencia és egy elkülönített pilot konfiguráció igazolja, hogy a motor nem Water-K-specifikus;
7. onboarding, alap dokumentáció, adatkezelési és üzemeltetési minimum elkészült;
8. production release és rollback folyamat dokumentált és kipróbált.

## Fejlesztési sorrend innen

1. Alap dashboard leválasztása a Pro KPI-lekérdezésekről.
2. Platform-operator modulok elkülönítése a merchant csomagoktól.
3. Hiányzó Market Ready Alap funkciók megvalósítása prioritás szerint: import/tömeges műveletek → vélemény/kívánságlista/készletértesítő → cross-sell/upsell → tartalom/landing → rendelés utáni ajánlat.
4. Pro Digitális iroda és automatizálási határok véglegesítése.
5. Tenant/onboarding és ügyfelenkénti entitlement-kezelés.
6. Teljes staging regresszió és fizetős pilot release candidate.
