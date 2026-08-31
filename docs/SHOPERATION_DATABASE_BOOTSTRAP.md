# Shoperation adatbázis-bootstrap szerződés

Ez a dokumentum a Shoperation 1.0 pilot új ügyfél-adatbázisainak támogatott indulási útját rögzíti. Nem egy összevont (squashed) sémaalap, hanem a tiszta telepítés kötelező szerződése.

## Alapelv

Minden fizető pilot ügyfél külön, friss Supabase projektet/adatbázist kap. Új ügyfél nem indulhat meglévő ügyfél-adatbázis másolatából, staging mentésből vagy ügyfélspecifikus seedből.

A repository `supabase/migrations` láncát a legfrissebb migrációig kell alkalmazni. A végső migrációs állapotban az új `profiles.subscription_plan` és `webshop_instances.subscription_plan` rekordok alapértelmezése `alap`; Pro csak kifejezett csomag-hozzárendeléssel aktiválható.

## Seed szabály

A `supabase/seed.sql` szándékosan ügyfélüres és márkasemleges. Nem hoz létre terméket, SKU-t, domaint, e-mail címet, címet, árazást, szolgáltatói hitelesítő adatot vagy webshop-brandinget.

Demo- és pilotadat csak külön, kifejezett tesztlépésben tölthető be. A semleges Mintabolt fixture nem része az alap seednek, ezért egy új fizető ügyfél adatbázisába véletlenül sem kerül be.

## Friss ügyfél indítási sorrend

1. Külön, üres Supabase projekt létrehozása az ügyfél számára.
2. A repository migrációinak alkalmazása a legfrissebb verzióig.
3. A semleges alap seed futtatása; ennek üzleti adatot nem szabad létrehoznia.
4. Egyetlen webshop instance kifejezett létrehozása, alapértelmezetten Alap csomaggal.
5. Saját branding, storefront tartalom, domain, kommunikációs identitás és commerce-beállítások megadása.
6. Fizetési, szállítási és számlázási szolgáltatók csak az adott ügyfél szerződései és titkai alapján aktiválhatók.
7. Merchant owner/admin hozzáférés létrehozása és jogosultsági próba.
8. Storefront, kosár, checkout, rendelés, tranzakciós kommunikáció és admin smoke/E2E ellenőrzés.

## Tiltott bootstrap források

Nem használható új ügyfélhez meglévő ügyfél adatbázis-klón, production vagy staging dump, ügyfélspecifikus termékseed, hardcoded domain/e-mail/SKU, illetve olyan konfiguráció, amely explicit hozzárendelés nélkül Pro jogosultságot ad.

A jelenlegi legacy staging kizárólag fejlesztési és tesztbizonyíték. Nem tekinthető terjeszthető Shoperation sémaalapnak vagy új ügyfél sablonadatbázisnak.

## 1.0 release előfeltétel

A pilot release előtt ezt a bootstrap szerződést egy valóban friss, semleges Supabase környezeten végig kell futtatni, és bizonyítani kell legalább a következőket:

- a teljes migrációs lánc hibamentesen lefut;
- az alap seed nem hoz létre ügyfélspecifikus üzleti adatot;
- az új csomag-default Alap;
- a semleges webshop instance létrehozható és konfigurálható;
- az Alap felhasználó nem éri el a Pro-only oldalakat és közvetlen API-kat;
- a storefront → kosár → checkout → rendelés útvonal működik;
- a build, typecheck és tesztek zöldek;
- a customer-specific contamination audit zöld.

A valóban friss Supabase környezet létrehozása külön erőforrás/költség lehet, ezért ezt csak jóváhagyott pilot-validációs lépésként végezzük el.

## Következő evolúció

A migrációs lánc bizonyított friss telepítése után készíthető egy külön, verziózott Shoperation 1.0 baseline/squashed schema artifact. Addig a repository migrációs lánca + a jelen bootstrap szerződés az egyetlen támogatott friss telepítési út.
