# Pilot release runbook — Alap / Pro

Ez a runbook a Shoperation több-bérlős (multi-tenant) webshopmotor első ügyfél/pilot kiadásának kötelező ellenőrzési sorrendje. A cél, hogy a Water-K ne alkalmazásszintű hardcode-ként, hanem tenantként fusson, miközben az Alap és Pro jogosultságok reprodukálhatóan működnek.

## 1. Release előfeltételek

- A release branch minden CI ellenőrzése zöld: teszt, typecheck, build és hardcode audit.
- A Vercel preview deployment `READY` állapotú.
- A cél Supabase projekt egészséges és a mentés/rollback pont dokumentált.
- A szükséges environment változók a cél környezetben rendelkezésre állnak; secret érték nem kerülhet Git-be vagy kliensoldali változóba.
- Az aktív tenant egyértelműen azonosítható, és nem támaszkodik Water-K-specifikus alkalmazáskódra.

## 2. Adatbázis és tenant bootstrap

1. Ellenőrizd a migrációk sorrendjét és a cél projekt migrációs állapotát.
2. Alkalmazd csak a még hiányzó migrációkat; már lefutott migrációt ne futtass újra kézzel.
3. Ellenőrizd a webshop instance rekordját, domain/tenant kötését és subscription plan értékét.
4. Elfogadott csomagkód kizárólag `alap` vagy `pro` lehet.
5. Ellenőrizd, hogy tenant A admin/felhasználó nem tud tenant B rendeléséhez, termékéhez, beállításához vagy integrációs objektumához hozzáférni.

## 3. Alap csomag regresszió

Az Alap tenantnál kötelezően működjön:

- katalógus és termékoldal;
- készletkezelés;
- kosár és pénztár;
- rendelés létrehozás és admin rendeléskezelés;
- visszáru alapfolyamat;
- ügyfélkezelés és fiók;
- kuponok;
- alap analitika és marketing;
- tartalomkezelés;
- import/export és tömeges termékműveletek;
- kívánságlista, készletértesítő, ajánlások, értékelések;
- keresés/szűrés;
- standard kereskedelmi integrációk és támogatási funkciók.

Az Alap tenantnál a Pro-only funkciók nem lehetnek használhatók közvetlen URL/API hívással sem. A UI elrejtése önmagában nem elfogadási kritérium.

## 4. Pro csomag regresszió

A Pro tenantnak az Alap minden funkcióján felül hozzáférést kell kapnia az alábbiakhoz:

- fejlett analitika;
- CRM;
- fejlett kampányok;
- digitális iroda / kommunikáció;
- automatizálás;
- beszerzés;
- cashflow;
- vezetői döntéstámogatás;
- fejlett integrációk;
- API hozzáférés.

Minden Pro funkciónál legalább egy pozitív smoke tesztet kell futtatni, és ellenőrizni kell, hogy ugyanaz a végpont Alap tenanttal megfelelően tiltott.

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
- Pro tenant esetén legalább egy Pro-only admin folyamat;
- Alap tenant esetén közvetlen Pro URL megnyitása tiltásba/upgrade oldalra fusson.

## 7. Fizetési ellenőrzés

- payment start létrehoz egy egyedi payment attempt rekordot;
- callback/webhook aláírás ellenőrzése aktív;
- ismételt webhook idempotensen kezelődik;
- sikeres és sikertelen állapot nem keverhető más tenant rendelésével;
- retry-payment csak a hozzá tartozó rendelést érinti;
- kliensoldalra provider secret nem kerül ki.

## 8. Hardcode és white-label ellenőrzés

Release blocker minden olyan üzleti hardcode, amely tenant-specifikus nevet, e-mailt, domaint, logót, terméket, árat, szállítási feltételt vagy fizetési üzleti szabályt alkalmaz globálisan.

A Water-K név csak tenant seed/demo/test/dokumentációs kontextusban maradhat, ha az nem határozza meg más tenant runtime működését. A storefront, e-mail és admin megjelenés tenant konfigurációból épüljön fel.

## 9. Elfogadási kritérium

Pilot release csak akkor promotálható, ha egyszerre teljesül:

- CI zöld;
- preview build zöld;
- hardcode auditban nincs kritikus találat;
- Alap entitlement regresszió zöld;
- Pro entitlement regresszió zöld;
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
