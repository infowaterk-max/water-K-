# Pilot release runbook — Alap / Pro

Ez a runbook a Shoperation webshopmotor első ügyfél/pilot kiadásának kötelező ellenőrzési sorrendje. A fejlesztési, teszt- és pilotkörnyezet kizárólag Shoperation- és semleges pilotadatokra épülhet. Water-K-adat, -márka, -termék, -SKU, -domain, -e-mail, -ár vagy üzleti szabály nem használható fejlesztési fixture-ként, alapértelmezésként vagy referenciaüzletként. Water-K csak a teljes motor lezárása után, külön jövőbeli ügyfél-webshopként hozható létre.

## 1. Release előfeltételek

- A release branch minden CI ellenőrzése zöld: customer database baseline guard, teszt, typecheck, build és customer-specific contamination audit.
- A Vercel preview deployment `READY` állapotú.
- A cél Supabase projekt egészséges és a mentés/rollback pont dokumentált.
- A szükséges environment változók a cél környezetben rendelkezésre állnak; secret érték nem kerülhet Git-be vagy kliensoldali változóba.
- Az aktív webshop instance egyértelműen azonosítható és kizárólag saját konfigurációjából épül fel.

## 2. Adatbázis és tenant bootstrap

Új fizető ügyfélhez tilos a történeti `supabase/migrations` láncot fresh-install forrásként visszajátszani. Az új ügyfél adatbázisa kizárólag a `supabase/customer-baseline/` alatt található, külön felülvizsgált Shoperation 1.0 séma-snapshotból készülhet. Amíg a baseline manifest státusza `snapshot-required`, új fizető ügyfél adatbázisa nem provisionálható ebből a repóból.

1. Futtasd az `npm run db:customer:guard` ellenőrzést.
2. Ellenőrizd, hogy a customer baseline manifest `legacyMigrationReplay` értéke `false`, a default csomag `alap`, és a baseline státusza `ready`.
3. A baseline-t brand-, termék-, SKU-, domain-, e-mail-, ár- és credential-adat nélkül alkalmazd egy új, üres Supabase környezetre.
4. A semleges seed nem hozhat létre ügyfélkatalógust; a webshop instance és minden ügyféltartalom külön provisioning lépés.
5. Ellenőrizd a webshop instance rekordját, domain/tenant kötését és subscription plan értékét. Elfogadott csomagkód kizárólag `alap` vagy `pro` lehet.
6. Ellenőrizd, hogy tenant A admin/felhasználó nem tud tenant B rendeléséhez, termékéhez, beállításához vagy integrációs objektumához hozzáférni.

Meglévő staging/legacy környezetnél a már alkalmazott migrációs történetet nem írjuk át. Ott csak új forward migration alkalmazható.

## 3. Alap csomag regresszió

Az Alap tenantnál kötelezően működjön: katalógus és termékoldal; készletkezelés; kosár és pénztár; rendelés létrehozás és admin rendeléskezelés; visszáru alapfolyamat; ügyfélkezelés és fiók; kuponok; alap analitika és marketing; tartalomkezelés; import/export és tömeges termékműveletek; kívánságlista, készletértesítő, ajánlások, értékelések; keresés/szűrés; standard kereskedelmi integrációk és támogatási funkciók.

Az Alap tenantnál a Pro-only funkciók nem lehetnek használhatók közvetlen URL/API hívással sem. A UI elrejtése önmagában nem elfogadási kritérium.

## 4. Pro csomag regresszió

A Pro tenantnak az Alap minden funkcióján felül hozzáférést kell kapnia a már elkészült Pro képességekhez: fejlett analitika; CRM; fejlett kampányok; digitális iroda / kommunikáció; automatizálás; beszerzés; cashflow; vezetői döntéstámogatás; fejlett integrációk.

Az `apiAccess` jelenleg fejlesztési ütemtervben lévő, rezervált képesség, nem aktív Pro entitlement. Addig nem lehet értékesített funkcióként vagy release-kritériumként kezelni, amíg a biztonságos token-, scope-, rotáció-, rate-limit- és auditmodell el nem készül.

Minden aktív Pro funkciónál legalább egy pozitív smoke tesztet kell futtatni, és ellenőrizni kell, hogy ugyanaz a végpont Alap tenanttal megfelelően tiltott.

## 5. Storefront smoke teszt

1. Nyisd meg a kezdőlapot és a webshop/katalógus oldalt.
2. Nyiss meg legalább egy terméket, add kosárhoz, módosíts mennyiséget.
3. Indíts pénztárfolyamatot, ellenőrizd a szállítási és fizetési választásokat.
4. Hozz létre tesztrendelést a konfigurált teszt/sandbox fizetési úton.
5. Ellenőrizd a sikeres rendelési oldalt, a rendelés státuszát és a tranzakciós e-mail brandingjét.
6. Jelentkezz be a vásárlói fiókba, nyisd meg ugyanazt a rendelést, és ellenőrizd, hogy más tenant rendelése nem érhető el módosított azonosítóval.

## 6. Admin smoke teszt

- admin belépés és kijelentkezés;
- dashboard;
- termék létrehozás/szerkesztés;
- készletmódosítás;
- rendelés megnyitás és engedélyezett státuszváltás;
- csomagoldal és aktuális entitlementek;
- fizetés/szállítás beállítások;
- tenant branding és storefront tartalom;
- Pro tenant esetén legalább egy aktív Pro-only admin folyamat;
- Alap tenant esetén közvetlen Pro URL megnyitása tiltásba/upgrade oldalra fusson.

## 7. Fizetési ellenőrzés

- payment start létrehoz egy egyedi payment attempt rekordot;
- callback/webhook aláírás ellenőrzése aktív;
- ismételt webhook idempotensen kezelődik;
- sikeres és sikertelen állapot nem keverhető más tenant rendelésével;
- retry-payment csak a hozzá tartozó rendelést érinti;
- kliensoldalra provider secret nem kerül ki.

## 8. Shoperation-neutralitás ellenőrzés

Release blocker minden olyan ügyfélspecifikus hardcode, amely nevet, e-mailt, domaint, logót, terméket, SKU-t, árat, szállítási feltételt, fizetési üzleti szabályt vagy ügyfélspecifikus marketingállítást alkalmaz globálisan.

A fejlesztési és pilot fixture-k kizárólag semleges Shoperation tesztadatokat használhatnak. Korábbi ügyféladat csak történeti migrációban vagy archív technikai nyomban maradhat, ha futás közben nem olvasható be alapértelmezésként, fallbackként, seedként vagy demóként. A storefront, e-mail és admin megjelenés instance-konfigurációból épüljön fel.

## 9. Elfogadási kritérium

Pilot release csak akkor promotálható, ha egyszerre teljesül:

- CI zöld;
- customer baseline manifest `ready` és a fresh-install baseline guard zöld;
- preview build zöld;
- customer-specific contamination auditban nincs kritikus találat;
- Alap entitlement regresszió zöld;
- aktív Pro entitlement regresszió zöld;
- tenant isolation negatív teszt zöld;
- storefront és admin smoke zöld;
- fizetési sandbox smoke zöld;
- nincs P0/P1 hiba;
- rollback útvonal ismert és kipróbálható.

## 10. Rollback

Hiba esetén ne próbálj productionben ad-hoc javítást végezni.

1. Állítsd le a további promotálást.
2. Vercelben állj vissza az utolsó igazolt, stabil deploymentre.
3. Ha adatbázis-módosítás okozza a hibát, a migrációhoz előre elkészített forward-fix/rollback eljárást használd; destruktív SQL-t ne improvizálj.
4. Ellenőrizd az aktív tenant rendeléseit és payment attempt rekordjait, hogy nincs-e félbehagyott tranzakció.
5. Futtasd újra a kritikus smoke teszteket a visszaállított verzión.

A részletes infrastruktúra-visszaállítási szabályokat a `docs/rollback.md` dokumentummal együtt kell használni.
