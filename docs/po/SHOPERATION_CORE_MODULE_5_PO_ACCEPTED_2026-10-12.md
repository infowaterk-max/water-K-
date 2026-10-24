# Shoperation Core — 5. modul: készlet, raktár, beszerzés és fulfillment
**Teljes PO-elfogadási specifikáció és műszaki bizonyítási szerződés**  
**Dátum:** 2026-10-12 (Europe/Budapest) · **PO döntési nyilvántartás:** [GitHub #1261](https://github.com/infowaterk-max/water-K-/issues/1261) · **Előző modulok:** [#1259](https://github.com/infowaterk-max/water-K-/issues/1259), [dokumentációs PR #1260](https://github.com/infowaterk-max/water-K-/pull/1260)

**ÜZLETI STÁTUSZ: 5.1–5.10 PO ACCEPTED; a 5.5 üzletileg definiált és feltételesen elfogadott a teljes integráció bizonyításához kötve.**  
**MŰSZAKI STÁTUSZ: PARTIAL / UNPROVEN. Nem VERIFIED_DONE, nem kiadási engedély, nem állítás arról, hogy minden leírt funkció már működik.**

> **Kötelező újrakezdési szabály:** Az 5. modul elfogadott követelményeit nem szabad egy következő beszélgetésben vagy fejlesztési fázisban új ötletként, nyitott üzleti döntésként feltenni. Az itt leírt működési és csomagszabályokat a tényleges `main`, Living Roadmap, entitlement authority, adatbázis, API, UI és proof állapotával **össze kell vezetni**. Hiányzó megvalósítás = technikai gap, nem hiányzó PO döntés. A teljes műszaki lezárást csak pontos SHA-hoz kötött CI + Capability/Dependency Closure + Truth/Lifecycle + E2E/failure/negative teszt igazolhatja.

## 0. Hatáskör és precedencia

A modul a fizikai termékek és **valós SKU/variánsok** készletét, raktárait, készletmozgásait, bevételezését, összekészítését, a kereskedő készletdöntését és a készletbiztonságot zárja le üzletileg. Meglévő kanonikus katalógus-, checkout-, rendelés-, szállítás-, visszáru-, beszerzési, analitikai és jogosultsági motorokat használ. **Új, párhuzamos inventory/WMS/procurement/fulfillment engine nem készül.**

- A 2. modul marad a termék/variáns/SKU, digitális áru, készlet nélküli variáns és fix bundle/BOM igazságforrása; az 5. modul **nem módosítja** a már elfogadott 2.x kereskedelmi szabályokat.
- A 3. modul marad a checkout, fizetés, rendelés-életciklus, többcsomagos/részleges szállítás, visszatérítés, számlázás és tranzakciós értesítés kereskedelmi igazságforrása; az 5.7 ezt a raktár felől konkretizálja.
- A 4. modul marad a vevői visszáru, panasz, garancia, Ügyeim és kommunikáció felülete; az 5.9 ezzel egységesít, nem épít új ügykezelőt.
- A korábban elfogadott **Alap több raktár / Pro automatizált többtelephelyes optimalizálás** változatlan. A **raktáron belüli sor/állvány/polc/rekesz információ új, explicit PO-döntés szerint Pro-only**. Ez nem jogosít fel a teljes WMS előrehozására.
- A korábbi Pro Procurement v1/Replenishment Engine használata a 5.4–5.5 pontban **nem jogosít automatikus beszállítói megrendelésre**.
- Fejlesztési sorrend változatlan: **Core Capability Complete → Core Operational/Adversarial Proof → Unified Experience → Builder Core → Template Factory**. A párhuzamos U11/B Office feladat nem változtatható meg vagy indítható tovább e dokumentáció miatt.
- Követelménymegerősítés és üzleti jóváhagyás itt történik; runtime DONE, roadmap DONE, provider élesítés, schema release, merge és tényleges telepítés külön bizonyítandó.

## 1. Teljes, kötelező Alap/Pro csomagmátrix

| Képesség | Alap | Pro | Határ / megjegyzés |
|---|:---:|:---:|---|
| Valódi SKU-nként és raktáranként on-hand/reserved/ATP/in-transit | IGEN | IGEN | Szerveroldali konzisztencia |
| Kézi mozgás, korrekció, selejt, transzfer, visszáru és audit | IGEN | IGEN | Jogosultság + indok + történet |
| Több raktár/helyszín és kézi forrás/raktárkiválasztás | IGEN | IGEN | Nem Pro-only |
| Kézi részleges/multi-parcel teljesítés, pickup, opt-in backorder | IGEN | IGEN | A vevő egyértelmű tájékoztatása |
| Teljes/részleges, SKU-szintű leltár és ellenőrzött eltérésjavítás | IGEN | IGEN | Nem automatikus fizikai felülírás |
| Minimumkészlet és raktárankénti alacsony/elfogyott figyelmeztetés | IGEN | IGEN | Nem csökkenti az ATP-t |
| Kézi SKU/vonalkód-alapú áruátvétel és napló | IGEN | IGEN | Tényleges állapot/mennyiség alapján |
| CSV export; CSV/XLSX importelőnézet és tömeges SKU-készletművelet | IGEN | IGEN | Jogosultság, idempotencia, stale-data védelem |
| Rendelésenkénti picking lista, tétel-ellenőrzés, csomag és futárátadás | IGEN | IGEN | Valós csomagkövetés + értesítés |
| **Raktáron belüli sor/állvány/polc/rekesz (bin location) rögzítés és picking-kijelzés** | **NEM** | **IGEN** | **Kizárólag Pro, backend-en is** |
| Egyszerű készletérték, ahol tényleges egységköltség ismert | IGEN | IGEN | Nem számviteli értékelés |
| Elkülönített/sérült/visszaérkezett nem eladható tételek kezelése | IGEN | IGEN | Állapotellenőrzés után szabadítható fel |
| Alap készletegyeztetés, hibaészlelés, biztonságos technikai korrekció | IGEN | IGEN | Fizikai állományt nem becsül automatikusan |
| Automatikus optimális raktárforrás/költség-/távolságalapú elosztás | NEM | IGEN | A kézi alapváltozat mindkét csomagban megmarad |
| Fejlett készletanomália/trendfigyelés és ajánlás | NEM | IGEN | Figyelmeztet, önállóan nem korrigál |
| Fogyási előrejelzés, utánrendelési mennyiség és supplier-aware tervezés | NEM | IGEN | Replenishment Engine; nem autonóm PO |
| Beszállítói törzs/cikkszám/ár/MOQ/csomag és PO/részszállítás | NEM | IGEN | Procurement v1; feltételes 5.5 integráció |
| Historikus készletérték, készletforgás, GMROI, slow-moving elemzés | NEM | IGEN | Hiányos költség/adat nem szépíthető |

**Entitlement:** a Pro-only szolgáltatást nem elég eltüntetni a menüből. Negatív teszt kell az Alap jogosultságú webshop közvetlen API/RPC/action/jobs/Builder/API felületére; nem aktiválható vagy olvasható ki Pro-adat megkerülő útvonalon. Tenant, actor és location a releváns készletműveletekben kötelező authoritative scope.

## 2. PO által elfogadott részletes követelmények

### 5.1. Alap készletnyilvántartás és készletmozgások — PO ACCEPTED

**Alap + Pro.** Minden valódi SKU/variáns állománya követhető: fizikai készlet (`on_hand`), rendeléshez kötött/foglalt mennyiség (`reserved`), új rendelésnek ígérhető mennyiség (`ATP/available`) és úton lévő készlet (`in_transit`). Ezek fogalmi szerződések; a meglévő adatbázis belső `stock_quantity` mezőjét nem szabad tévesen átnevezni vagy másodszor csökkenteni a migráció értelmezése nélkül.

A kereskedőnek a következő események elvártak: beérkeztetés, eladás/checkout-kötelezettség, rendeléshez kapcsolt foglalási életciklus, szabályos készletkorrekció, raktárközi mozgás, selejtezés, jogosult visszavétel. Mindegyikhez meg kell őrizni a webshopot, valós SKU-t, helyszínt, előző/új értéket, forrást, indokot, aktort, időpontot és audit/kapcsolódó order/PO/return hivatkozást.

**Létfontosságú:** checkout és fulfillment között nincs dupla készletlevonás. A jelenlegi legacy összehangoló RPC szerint a checkout már levonja a készletet, a `reservation` csak operációs bizonyíték; az új per-location struktúra bevezetése sem vezetheti be újra a levonást. Rendelés-, foglalás-, visszatérítés- és törlési hibaút sem okozhat túladást vagy idegen webshop készletváltozását.

**Pro különbség:** automatizált optimalizálási javaslatok, nem jobb alap biztonság és nem eltérő készletauthority.

### 5.2. Több raktár és készlethelyszín — PO ACCEPTED

**Alap + Pro.** Egy webshop több fizikai raktárat, boltot/kiadási helyet, illetve releváns készlethelyszínt tart fenn. Valós SKU-nként és helyszínenként az összes készletállapot elkülönül; a webshopos összesítés nem rejtheti el a már foglalt, úton vagy nem eladható árut. A kereskedő manuálisan kijelölhet teljesítési raktárat, áthelyezhet árut és ellenőrizheti a küldő/érkező készletet.

A raktárközi transzfernek indítási, szállítás alatti és igazolt beérkezési állapota van. A forráshelyszínhez kötött vagy már úton lévő készlet nem válik újra értékesíthetővé pusztán az összesítés miatt. A rendelésből több csomag/helyszín, személyes átvétel és kézi részleges teljesítés megengedett; az ügyfél nem kaphat hamis teljesítési státuszt.

Utánrendelés/backorder kizárólag a kereskedő kifejezett bekapcsolásával, helyes ígérettel, azonnal rendelkezésre álló és várható termékek világos megkülönböztetésével engedélyezett. A backorder nem hamisíthat pozitív ATP-t.

**Pro-only:** automatikus, cím-/raktár-/távolság-/költség-/készletalapú forrásválasztás, automatikus felosztás/optimalizálás. Alapban a normál több raktár és kézi részleges teljesítés változatlanul jár.

### 5.3. Leltár és készleteltérések — PO ACCEPTED

**Alap + Pro:** teljes raktári és tételes/SKU-részleltár, a nyilvántartott és ténylegesen megszámolt mennyiség külön megjelenítése, eltérés és oka, indokolt/engedélyezett korrekció, változtathatatlan auditnyom. Módosítás előtt a párhuzamos rendelés/áthelyezés/bevétel miatti elavult leltárképet ellenőrizni kell; stale adat nem írhatja felül a valós tranzakciókat. Hibás korrekció új kompenzáló eseménnyel javítható, nem a múlt eltüntetésével.

**Pro-only anomáliafigyelés:** rendkívüli fogyás, ismétlődő eltérés, feltűnő selejtezési arány, átadott/átvett raktárközi mennyiség különbsége, gyanúsan szokatlan korrekció **figyelmeztetésként**. Alkalmazotti szándékot vagy lopást a modell nem állapít meg, és **soha nem ír automatikusan fizikai készletet át anomália alapján**. Kezdetben egyszerű determinisztikus szabályalapú elemzés is megfelelő; AI nem kötelező.

### 5.4. Minimumkészlet, készlethiány és utánpótlás — PO ACCEPTED

**Alap + Pro:** SKU- és raktárhelyszínenként beállítható minimumküszöb, 0 készlet és küszöb alatti figyelmeztető lista/operációs jelzés. A minimum nem készletfoglalás és önmagában nem csökkenti az értékesíthető ATP-t. Nem változtatja meg a 2. modul elfogyott variánsokra elfogadott vevői UX-et vagy a backorder opt-in határt.

**Pro-only:** fogyási adatokból várható kifogyás, ajánlott beszerzési mennyiség, már létező beszállítói lead-time, MOQ, csomagegység, várható beérkező szállítás figyelembevételével. Replenishment Engine/Procurement v1 kanonikus adatforrás; hiányzó történet, egységköltség vagy beszállító esetén nem készíthet megtévesztő biztos előrejelzést. **Figyelmeztetésből nem indíthat autonóm beszállítói rendelést.**

### 5.5. Áruátvétel, bevételezés és Procurement v1 — PO FELTÉTELESEN ELFOGADVA

**Az üzleti funkció tartalma teljes és konkrét; a feltétel a megvalósíthatóság és teljes rendszerintegráció ellenőrzése.** Ez NEM engedély a scope elhagyására, megváltoztatására vagy újra PO elé terjesztésére; amennyiben a meglévő rendszerben korlát van, azt pontos bizonyítékkal jelezni kell, a PO pedig a szükséges terjedelemváltozásról dönt.

**Alap + Pro:** jogosult kézi SKU/vonalkód szerinti bevételezés konkrét raktárhelyszínhez; beérkezett és igazolt mennyiség, előzetes ellenőrzés, eltérés/sérülés elkülönítése, audit. A manuális áruátvételhez **nem szükséges Pro beszerzési rendelés**. Hiányzó, még nem érkezett, illetve sérült/nem eladható tétel nem számítható automatikusan az ATP-be.

**Pro-only Procurement v1:** beszállítói törzs/kapcsolattartó, beszállítói cikkszám összekötése a belső SKU-val, nettó beszerzési ár, MOQ/csomagolási/rendelési többszörös és szállítási feltételek; beszerzési rendelés (PO) létrehozása, tervezet→megrendelve→részben átvéve→teljesen átvéve/lezárva vagy jogosult törlés; beérkezési határidő, tényleges részszállítások, fennmaradó mennyiség, eltérés. A PO-hoz kapcsolt tényleges átvétel a megfelelő termék/variáns és helyszín állományát növeli, a PO mennyiségi státuszát vele együtt frissíti, az összetartozó audit egy tranzakcióban keletkezik. Példa: 100 megrendelt, 60+36 ténylegesen átvett = 96 jóváhagyott, 4 hátralévő; nem 100 automatikusan beérkezett.

**5.5 MŰSZAKI FENNTARTÁS, NEM ÜZLETI ADATHIÁNY:** `src/app/admin/beszerzes/page.tsx`, `supabase/migrations/046_procurement_receipt_integrity.sql`, `053_partial_procurement_receipts.sql` és `041_procurement_workflow.sql` megerősítik a meglévő alapot, de **nem bizonyítják** a teljes UI→RBAC/Pro entitlement→tenant/SKU/location→supplier/PO→részbevételezés→atomic stock+audit→hibák/idempotens retry útvonalat. Kötelező a pozitív és negatív test/CI/E2E, biztonságos duplikátumkezelés és téves készletre vétel elleni védelem. Az adatbázis-függvény megléte önmagában nem DONE.

### 5.6. Tömeges SKU-műveletek, CSV/Excel — PO ACCEPTED

**Alap + Pro:** SKU/lista szintű készletek exportálása, CSV és XLSX állomány feldolgozása, oszlop- és termékazonosító validáció, **kötelező módosítás előtti előnézet**, hibás/nem értelmezhető sorok világos visszajelzése, jogosult tömeges `set/adjust` készletmódosítás, audit. Kereskedői munkafolyamat: letöltés → ellenőrzött javítás → előnézet → jóváhagyás → bizonyított készletmódosítás.

Nem hozhat létre második katalógus- vagy készletmotort. Import közben fellépő új rendelés/foglalás/készletváltozás ellen konkurencia- vagy verzióvédelem szükséges; **nem írhatja felül észrevétlenül** a közben módosult stockot. A több raktárhoz tartozó sorok célhelyszínét pontosan azonosítani kell. Hibás adat nem okozhat csendes, nem atomikus részleges eredményt; a rendszer pontosan visszaadja az elfogadott/elutasított tételeket, és az üzletileg egy tranzakcióként vállalt batch csak teljesen commitolható.

**Pro:** ugyanaz a bulk motor; a különbség a Pro Procurement/Replenishment elemző és beszerzési adatokhoz való kapcsolódás, **nem** eltérő export/import jogosultság. Meglévő források: `src/app/api/admin/catalog/bulk/route.ts`, `src/app/api/admin/catalog/import/route.ts`, `import-file/route.ts`, `export/route.ts`, `src/components/admin/catalog-importer.tsx`. A jelenlegi bulk API egy műveletben korlátozott tételszáma nem írja felül az üzleti követelményeket; skálázás külön igazolandó.

### 5.7. Raktári összekészítés, csomagolás, átadás + Pro-only polchely — PO ACCEPTED

**Alap + Pro:** rendelésenkénti munkalap: SKU/variáns, név, tényleges mennyiség, ténylegesen jóváhagyott raktári forrás, tételenkénti ellenőrzés; ready-to-pack → packed → handed-over → delivered állapotjogi és auditált átmenetek. A kereskedő kézzel kijelölheti a raktárat, részleges és többcsomagos teljesítést kezelhet; minden csomaghoz a **benne lévő valós tételek, átadási tény és saját követési adat** kapcsolódjon. Fizetés/szállítás/készletfoglalás jogosultsági előfeltételek nélkül nem lehet téves PACKED/HANDED_OVER. Digitális csak rendelésre nem kötelező fizikai csomag.

A csomagolás **nem vonhatja le még egyszer a checkoutban már committed készletet**. Részleges csomagátadás esetén a teljes rendelés nem kaphat hamis delivered/completed állapotot; a vásárlói tranzakciós email az igazolt tényt és a megfelelő csomag adatát közli, a shipping adapter szerződését követve.

**Pro-only, külön explicit PO-döntés:** opcionálisan rögzíthető az egyes termékvariáns **raktáron belüli elsődleges sor/folyosó, állvány, polc, rekesz vagy belső tárhelykódja** az adott raktárhoz; megjeleníthető a Pro összekészítési listában. Ez **NEM** alapfunkció most. **Alapban nem jeleníthető meg és nem szerkeszthető, és a közvetlen API/action/RPC útvonal sem engedheti ki a Pro polchelyet.** Későbbi Alap-átsorolás csak új kifejezett PO döntéssel történhet.

**Pro további többlete:** automatikus, optimalizált raktárforrás-választás az 5.2 szerint. **Nincs elfogadva:** teljes bin-szintű készletkönyvelés, kézi vonalkódos polcszkennelő WMS, automatikus bejárási útvonal, intelligens slotting vagy más fejlett WMS a jelen körben.

### 5.8. Készletérték, historikus elemzés és forgás — PO ACCEPTED

**Alap + Pro:** aktuális mennyiségek, egyszerű készletérték az ismert és tényleges beszerzési/önköltségi adatok alapján, világos megkülönböztetés a lekötött tőke és az esetleges nettó eladásiérték-potenciál között. Hiányzó költségadat nem váltható ki eladásiárral hamis `cost` értékként; az eredmény hiányos/korlátozott jelölést kap. **Ez nem könyvelési készletértékelő rendszer.**

**Pro-only:** időszakos készletérték-trend, készletforgás, bruttó fedezethez viszonyított készlettőke-megtérülés (GMROI), lassan forgó/túl magas készletállományok elemzése. Kötelező megbízhatósági feltételek: üzletileg helyes átlagkészlet-pillanatképek, order-item költség-snapshotok, csak helyes pénzügyi és készletmozgási hatások, visszáruk kezelése és hiányzó adatok nyílt jelzése. Nem állíthat fiktív GMROI-t, ha a költségsnapshot nem áll rendelkezésre.

**Meglévő alap:** `src/app/admin/keszlet-elemzes/page.tsx` és `supabase/migrations/019_inventory_snapshots.sql`; Pro `advancedAnalytics` jogosultság. A készletadatok tenant-/többhelyszín-helyességét külön szükséges igazolni, kód puszta jelenléte nem elég.

### 5.9. Sérült, zárolt, selejtezett és visszaérkezett termékek — PO ACCEPTED

**Alap + Pro:** a fizikailag visszaérkezett/sérült/ellenőrzésre váró termék **nem válik azonnal ATP-vé**. Fizikai átvétel → vizsgálati/nem eladható állapot → tényleges megfelelőségi döntés → jogosult felszabadítás és készletmozgás, vagy selejtezés/elkülönítés. A példaként visszaérkező 3 darabból 2 jó és 1 sérült esetén csak **2** válhat jóváhagyás után eladhatóvá; az 1 sérült elkülönül. Minden döntés SKU-, helyszín-, ügy- és aktorazonosítóval naplózott.

A **pénzügyi refund nem fizikai restock**; a 3./4. modul ügy- és refund-koncepcióját kell használni. Egy tétel nem restockolható kétszer, és sérült/ellenőrizetlen tétel nem kerülhet eladási készletre másik útvonalon (bulk/import/manual) sem.

**Pro-only:** a már elfogadott anomáliafigyelés alapján visszatérő hibák/selejt/sérülés-arányok elemzése, csak jelzés/javaslat. Nem új returns engine.

**Ismert gap:** a forrásban látható `restock_return_case` és `admin_transition_return_case_v2` útvonalnál a termék tételes eladhatósági/vizsgálati gate nem volt igazolt. `supabase/migrations/20260901163000_refund_inventory_separation.sql` helyesen elválasztja a pénzügyi visszatérítést a fizikai állománytól, de a 5.9 további end-to-end implementációt/proofot követel.

### 5.10. Készletegyeztetés és biztonságos hibakezelés — PO ACCEPTED, 5. MODUL ÜZLETILEG LEZÁRVA

**Alap + Pro:** rendelés, checkout-kötelezettség, foglalás, SKU/helyszín-állomány, árubevétel, átadás, törlés, visszáru és ATP egyezőségének ellenőrzése. Ha hiányzik adat vagy ellentmondás van, **fail-closed** blokkoló/ellenőrzendő jelzés; konkrét érintett SKU/rendelés/helyszín, eltérés és megoldandó teendő látható az adminnak. Az egyeztetés csak bizonyítható, determinisztikus operációs/foglalási rekordokat hozhat helyre auditáltan, idempotens módon. **Nem találhat ki készletmennyiséget, és nem írhatja át a valós fizikai készletet bizonyítatlan feltételezéssel.**

**Pro-only:** mintázatos/ismétlődő hibák, anomáliák elemzése és döntéstámogatás az 5.3 már elfogadott motorjával. Bizonyítatlan javítást nem hajthat végre autonóm módon.

**Üzleti lezárás:** 5.1–5.10 követelmény elfogadva. Az 5.5 funkcióterjedelem teljesen megfogalmazott, de megvalósításának elfogadása műszakilag bizonyítandó. Semmilyen további 5.x alponthoz nem jár automatikus PO-engedély.

## 3. Valós repository-állapot — ellenőrzött alapok és ismert hiányok

Az alábbi **kód-/terv-megfigyelés, nem runtime-verified bizonyíték**. Minden esetben aktuális `main`-nel újra ellenőrizendő a fejlesztés megkezdésekor.

| Követelmény | Ellenőrzött forrás / tervezett authority | Technikai gap / szükséges ellenőrzés |
|---|---|---|
| 5.1 készletfoglalás / eladható mennyiség | `supabase/migrations/084_inventory_reservations_operations.sql`, `088_legacy_inventory_semantics_alignment.sql` | Checkout-levonás és foglalás harmonizálása per-location mellett; race/retry és állományazonosság |
| 5.2 több raktár / transzfer | `quality/knowledge/living-roadmap.v2.json` → `MR1-INVENTORY-OPS` = `planned` | Canonical `InventoryLocation` tényleges sémája/runtime-ja és in-transit/reserve átadása bizonyítandó |
| 5.3–5.4 leltár, low-stock, Pro analitika | Roadmap inventory; `src/app/admin/beszerzes/page.tsx` | Leltár E2E, korrekciós concurrent guard, Pro anomália/forecast és Alap/Pro negatív teszt |
| 5.5 Procurement v1 és részbevételezés | `src/app/admin/beszerzes/page.tsx`; `supabase/migrations/041_procurement_workflow.sql`, `046_procurement_receipt_integrity.sql`, `053_partial_procurement_receipts.sql` | Teljes UI→RBAC→tenant→SKU/location→PO→atomic receipt→audit→retry E2E; **feltételes műszaki bizonyítás** |
| 5.6 bulk és import | `src/app/api/admin/catalog/bulk/route.ts`, `import-file/route.ts`, `export/route.ts`, `src/components/admin/catalog-importer.tsx` | Több raktár + stale concurrent stock, hibás batch és visszaigazolás |
| 5.7 összekészítés és Pro bin | `supabase/migrations/085_fulfillment_lifecycle.sql`, `088_legacy_inventory_semantics_alignment.sql`; `src/app/admin/muveletek/page.tsx` | Állapot+követés+valós multi-parcel E2E; Pro-only polchely sémája, UI, API, entitlement hiányként kezelendő |
| 5.8 készletérték/GMROI | `src/app/admin/keszlet-elemzes/page.tsx`, `019_inventory_snapshots.sql` | Hiányzó cost, visszáru, per-location, átlagolás és Pro entitlement proof |
| 5.9 visszáru fizikai állapota | `045_return_integrity_guards.sql`, `20260901163000_refund_inventory_separation.sql`, `src/app/api/admin/returns/[id]/route.ts` | **Külön eladhatósági vizsgálat és nem eladható elkülönítés igazolatlan** |
| 5.10 reconciliation | `086_inventory_reconciliation.sql`, `088_legacy_inventory_semantics_alignment.sql`, `090_operations_orchestration.sql` | Tenant/idempotence/fail-closed/admin hiba és új helyszíni/hold ledger összhang |

**Történeti forrás veszély:** a későbbi migráció átírhatja a korábbit, ezért nem elég az egyes SQL-eket önmagukban idézni. Például a korai `085_fulfillment_lifecycle.sql` `packed` állapotnál készletcsökkentést tartalmaz; a későbbi `088_legacy_inventory_semantics_alignment.sql` helyreállítja a checkout-first jelentést. A **végső érvényes migrációláncot**, adatbázis-runtime-ot és idempotens műveleti eredményt kell ellenőrizni; nem jelenthető késznek a funkció a korábbi fájl alapján.

## 4. Capability Closure / elfogadási tesztmátrix

Minden 5.x capability lezárása: **vevő/admin/raktár UI → tenant/RBAC/Pro-entitlement → authoritative API/RPC → adatbázis/készlet- és order-tranzakció → downstream szállítás/értesítés/procurement/analytics → audit → CI & runtime proof**. Hiányzó láncszem esetén státusz `PARTIAL`, `MISSING` vagy `UNPROVEN`, **nem** `DONE`.

| Proof ID | Kötelező adversarial / E2E eset | Elvárt eredmény |
|---|---|---|
| M5-P01 | Két webshop azonos SKU szöveggel; cross-tenant API/SQL | Másik tenant sem olvasni, sem írni nem tudja készletét |
| M5-P02 | Ugyanazon variánsra két párhuzamos checkout + foglalás | Nincs oversell, nincs dupla decrement |
| M5-P03 | Forrásraktárból transfer, célraktárba részbeérkezés, közben rendelés | In-transit nem ATP; ugyanaz a darab nem eladható két helyen |
| M5-P04 | Leltár közben rendelés/bevétel és stale mentés | Konfliktus látható, elavult snapshot nem írja felül az új állapotot |
| M5-P05 | Minimumkészlet-jelzés és javasolt utánrendelés | ATP változatlan, PO nem keletkezik automatikusan |
| M5-P06 | Pro PO 100 db, részszállítás 60+36, duplikált újrapróbálkozás | 96 bevételezett, 4 nyitott, nem 192; mind auditált/atomikus |
| M5-P07 | Hibás/stale CSV, másik tenant SKU-ja, párhuzamos rendelés | Előnézet, hibás sor blokkolás/igazolt eredmény, nem csendes félbatch |
| M5-P08 | Háromtételes rendelés, két csomag, részfeladás/értesítés | Minden csomag saját tényleges tételeket és trackinget mutat; nincs hamis teljes lezárás |
| M5-P09 | Alap webshop közvetlen Pro bin útvonal/field/API hozzáféréssel | Szerveroldali tiltás, nincs adat-/funkciószivárgás |
| M5-P10 | Pro bin rögzítése és picking lista, másik raktárban eltérő tárhely | Helyszínhez és SKU-hoz kötött pontos Pro adat |
| M5-P11 | Költségadat hiányzik, régi pillanatkép, visszáru, több raktár | Nincs kitalált szám/GMROI, egyértelmű adatminőségi figyelmeztetés |
| M5-P12 | Visszaérkezett 3 db: 2 jó + 1 hibás, refund közben | Csak 2 válik eladhatóvá; 1 elkülönített; refund nem restock |
| M5-P13 | Ugyanazon return/receipt/transition megismételt callbackja | Idempotens, soha nincs ismételt készletre vétel vagy árulevonás |
| M5-P14 | Hiányos foglalási rekordok és ellentmondó fizikai mennyiségek | Determinisztikus reconciler vagy blokkoló/ellenőrzendő jelzés; nem kitalált fizikai mennyiség |
| M5-P15 | Pro kapacitás letiltása/downgrade, Alap jogosulatlan admin és worker | A Pro-only optimalizáció/PO/bin/analytics backendjén nincs megkerülés |
| M5-P16 | Éles/staging/fresh install eltérés, migration replay, provider részhiba | Fail-closed, nem hamis DONE; szükséges Fresh Install proof és runhoz kötött evidence |

**Bizonyítási mód:** aktuális pontos `main`/PR SHA, aktuális migrációlánc és telepítési állapot, aktuális aktív CI/futtatások, negatív jogosultsági/race/replay/hibaút-tesztek, adatvédelmi/auditkapuk. Szükség esetén staging/fresh install, valódi provider sandbox; semmit nem bizonyít egy csak zöld kódfordítás vagy egy látványos admin oldal.

## 5. Kötelező implementációs sorrend és korlátok

1. **Reconcile, ne építs párhuzamosan:** Living Roadmap `MR1-INVENTORY-OPS`, `MR1-PACKAGE-CAPABILITY-MATRIX`, `SHIPPING-FOUNDATION`; meglévő Catalog, Checkout, Operations, Procurement, Analytics, Returns és Entitlements ellenőrzése. Prior PO szöveg magasabb autoritású, mint a régebbi, vele ütköző besorolás.
2. **Canonical állománybiztonság:** raktárhelyszín, foglalás, in-transit, nem eladható hold, kézi korrigálás egységes készletauthority, negatív és párhuzamos próbák. Ez megelőzi a felületi kényelmi munkát.
3. **Alap raktárfolyamatok:** leltár, áthelyezés, tényleges bevételezés, picking/csomag/részátadás, CSV azonos korrekt készletledgeren.
4. **Pro bővítések:** Pro bin csak Pro-ra; Procurement v1 end-to-end receipt; optimalizálás/forecast/anomália/historikus analitika meglévő authorityn. Alap nem veszítheti el a standard commerce-képességeket.
5. **Minden szükséges downstream rendszer:** fizetés/checkout, invoice, shipment, return/refund, email, audit, dashboard, fallback, operációs hiba és tenant guard, hogy ne maradjon „motor kész, kiszolgáló hiányzik” helyzet.
6. **Release proof:** repo `AGENTS.md` Development Guard/Plan Before Code, quality/replay/reference, CI, Completion Truth, Lifecycle, kötelező freshness. A dokumentáció elfogadása nem indíthat fejlesztést soron kívül és nem zárhatja le a capability-t magát.

## 6. Explicit kizárások és feloldandó technikai eltérések

- **Nincs** teljes WMS, per-bin fizikai készletkönyvelés, kötelező vonalkódos polcszkennelés, automatikus komissiózási útvonal/slotting az 5.7-es Pro polchely egyszerű adatmezője mögé rejtve.
- **Nincs** automatikus fizikai készletjavítás prediktív AI/anomália alapján, autonóm PO vagy automatikus beszállítói vásárlás, automatikus kereskedői fizetés.
- **Nincs** refund = restock, visszaérkezett = eladható, checkout = csomagoláskor második levonás, külső adat hiányában „sikeres” admin üzenet.
- **Nincs** Alap-csonkítás: több raktár, kézi teljesítés, leltár, normál alacsonykészlet figyelmeztetés, CSV/XLSX bulk, alap készletérték és hibakezelés Alapban megmarad.
- **Nincs** Pro polchely átminősítés Alapnak automatikusan; csak új explicit PO-jóváhagyás változtathat rajta.
- **Nincs** új követelménynek tekintett 5.11 vagy egyéb M5 subpoint; a tíz jóváhagyott pontot kell megvalósítani és bizonyítani.
- **PO 5.5 feltételesség:** ha a rendszerarchitektúra a megkövetelt Procure v1 útvonalat nem képes megbízhatóan teljesíteni, **álljon meg, mutassa a bizonyítékot, és kérjen új PO terjedelmi döntést**. Ne hagyja ki önállóan a Pro beszerzés egy részét.

## 7. Lezárási és átadás-átvételi státusz

| Réteg | 2026-10-12 állapot | Mit jelent |
|---|---|---|
| 5.1–5.4 | **PO ACCEPTED** | Üzletileg lezárva; kód/proof külön |
| 5.5 | **PO CONDITIONAL ACCEPTED / SCOPE FULLY DEFINED** | Integráció és megvalósíthatóság feltétel; nem félig specifikált funkció |
| 5.6–5.10 | **PO ACCEPTED** | Üzletileg lezárva; Pro polchely kizárólag Pro |
| M5 összesen | **BUSINESS REVIEW CLOSED** | Nincs nyitott M5 termékdöntés, csak az 5.5 bizonyítási feltétel és műszaki gaps |
| Repo / CI / provider / E2E | **PARTIAL / UNPROVEN** | Nem VERIFIED_DONE |
| Living Roadmap / plan / runtime alignment | **PENDING GOVERNED RECONCILIATION** | Cél: korábbi elfogadott döntések változatlan végrehajtása |

**Végső handoff:** Előbb olvasd a PO M1–4 nyilvántartást (#1259/PR #1260), ezt az M5 teljes specifikációt és #1261-et; ellenőrizd a tényleges aktuális repositoryt; ne tárgyald újra az elfogadott M5 1–10 pontokat. A 6. modul üzleti egyeztetése ettől független folyamat, de a Core implementáció és a forrásigazság rendezése megtartja a jóváhagyott sorrendet.
