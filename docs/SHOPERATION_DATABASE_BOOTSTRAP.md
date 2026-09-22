# Shoperation adatbázis-bootstrap szerződés

Ez a dokumentum a Shoperation 1.0 pilot új ügyfél-adatbázisainak biztonsági és neutralitási szerződését rögzíti.

## Jelenlegi státusz

A repository történeti migrációs lánca a Shoperation előtti fejlesztési korszakból is tartalmaz migrációkat. Hat régi migrációban még megtalálható ügyfélspecifikus rendelési prefix/SKU-logika. Ezeket történeti migrációs provenienciaként tartjuk nyilván, nem Shoperation mintaként, seedként vagy támogatott új ügyfél-bootstrapként.

Emiatt a teljes régi `supabase/migrations` lánc új fizető ügyfél adatbázisának létrehozására **még nem tekinthető végleges 1.0 baseline-nak**. A pilot release előtt külön, tiszta Shoperation baseline/squashed schema artifactot kell előállítani és valóban friss Supabase környezeten bizonyítani.

## Ami már kötelező és elkészült

A `supabase/seed.sql` szándékosan ügyfélüres és márkasemleges. Nem hoz létre terméket, SKU-t, domaint, e-mail címet, címet, árazást, szolgáltatói hitelesítő adatot vagy webshop-brandinget.

Az új adatbázis-defaultok fail-closed működésűek: új `profiles.subscription_plan` és `webshop_instances.subscription_plan` rekord alapértelmezése `alap`. Pro csak kifejezett csomag-hozzárendeléssel aktiválható.

A regressziós teszt pontosan rögzíti a hat történeti SQL-kivételt. Bármely új migráció, seed vagy más Supabase SQL, amely ügyfélspecifikus identitást/SKU-t vinne vissza, CI hibát okoz. A kivétellista nem bővíthető ügyfélfunkció fejlesztésének részeként.

## Tiltott bootstrap források

Új ügyfélhez nem használható:

- meglévő ügyfél adatbázis-klón vagy mentés;
- production vagy legacy staging dump;
- ügyfélspecifikus termékseed;
- hardcoded ügyféldomain, e-mail, SKU, ár vagy termékszabály;
- olyan csomag-default, amely explicit hozzárendelés nélkül Pro jogosultságot ad;
- a jelenlegi történeti migrációs lánc mint végleges, értékesíthető Shoperation baseline.

A legacy staging kizárólag fejlesztési és tesztbizonyíték. Nem terjeszthető sémaalap és nem új ügyfél sablonadatbázisa.

## Jóváhagyott 1.0 célfolyamat

A végleges új ügyfél-indítási folyamat:

1. Külön, üres Supabase projekt/adatbázis az ügyfél számára.
2. Verziózott, tiszta Shoperation 1.0 baseline alkalmazása.
3. Csak a baseline utáni Shoperation migrációk alkalmazása.
4. Ügyfélüres, semleges alap seed futtatása.
5. Egyetlen webshop instance kifejezett létrehozása, alapértelmezetten Alap csomaggal.
6. Saját branding, storefront tartalom, domain, kommunikációs identitás és commerce-beállítások megadása.
7. Fizetési, szállítási és számlázási szolgáltatók csak az adott ügyfél szerződései és titkai alapján aktiválhatók.
8. Merchant owner/admin hozzáférés létrehozása és jogosultsági próba.
9. Storefront, kosár, checkout, rendelés, tranzakciós kommunikáció és admin E2E ellenőrzés.

## Baseline release gate

A tiszta baseline addig nem jelölhető késznek, amíg egy valóban friss, semleges Supabase környezeten nem bizonyítottuk legalább a következőket:

- a baseline és az utána következő migrációk hibamentesen lefutnak;
- a seed nem hoz létre ügyfélspecifikus üzleti adatot;
- az új csomag-default Alap;
- a semleges webshop instance létrehozható és konfigurálható;
- az Alap felhasználó nem éri el a Pro-only oldalakat és közvetlen API-kat;
- a storefront → kosár → checkout → rendelés útvonal működik;
- a build, typecheck és tesztek zöldek;
- a customer-specific contamination audit zöld.

A valóban friss Supabase környezet létrehozása külön erőforrás/költség lehet, ezért ezt csak költségjóváhagyással végezzük el. Addig sem production, sem fizető ügyfél adatbázisa nem kap új bootstrapot.
