# Shoperation – döntéseredet-visszakeresés, lefedettségi audit és fejlesztési preflight hiánytérkép

**Dátum:** 2026-10-13 · **Feladat:** korábban elfogadott üzleti és vizuális döntések visszakeresése a korábbi ChatGPT-egyeztetésekből, hozzárendelés a GitHub normatív forrásaihoz, hiány- és ellentmondás-azonosítás, a meglévő fejlesztési kapuk forrásfelhasználásának read-only vizsgálata.

**Minősítés:** audit/munkadokumentáció, NEM új PO-döntés; NEM egy teljes, hitelesített nyers beszélgetésarchívum; NEM implementáció, CI/funkcionális proof vagy roadmap-státusz frissítés.

**Géppel feldolgozható, 108 forrásrekordos kiegészítő index:** [`SHOPERATION_DECISION_SOURCE_COVERAGE_2026-10-13.json`](./SHOPERATION_DECISION_SOURCE_COVERAGE_2026-10-13.json). **Korábbi beszélgetési kontextus-index:** [`SHOPERATION_DECISION_CONVERSATION_PROVENANCE_2026-10-13.md`](./SHOPERATION_DECISION_CONVERSATION_PROVENANCE_2026-10-13.md).

> Ez a dokumentum **nem változtatja meg** a hatályos döntést. A GitHub PO-döntésnaplók a normatív üzleti források; a korábbi beszélgetések visszakeresett összefoglalói a döntés **magyarázatát** és esetenként a hiányzó részletet szolgáltatják, de a teljes, hiteles nyers átiratot nem helyettesítik. A későbbi kifejezetten elfogadott PO-eltérés elsőbbségét és annak pontos hatókörét külön kell vizsgálni.

## 1. Visszakeresett források és pontos lefedettség

| Modul | Normatív forrás | Indexelt rekordszám | Visszakereshetőség és állapothatár |
|---|---|---:|---|
| Core 1 | [#1259](https://github.com/infowaterk-max/water-K-/issues/1259) | 1 aggregált | Fontos tárhely-/Points-/trial-döntések igen; minden eredeti alpont teljes szövege nem bizonyított |
| Core 2 | [#1259](https://github.com/infowaterk-max/water-K-/issues/1259) | 30 | 2.13–2.17 újonnan visszanyert PO-üzenetösszefoglalók; 2.18–2.19 hiteles részletes szövege még hiányzik |
| Core 3 | [#1259](https://github.com/infowaterk-max/water-K-/issues/1259), [PR #1237](https://github.com/infowaterk-max/water-K-/pull/1237) | 12 | 3.1–3.12 üzleti lezárás/audit; nem bizonyít production/Provider E2E |
| Core 4 | [#1259](https://github.com/infowaterk-max/water-K-/issues/1259) | 12 | 4.1–4.12 részletes döntési kivonat, drift szétválasztva |
| Core 5 | [#1261](https://github.com/infowaterk-max/water-K-/issues/1261), [PR #1262](https://github.com/infowaterk-max/water-K-/pull/1262) | 10 | 5.1–5.10; 5.5 feltételes, a PR tartalma nem automatikusan main |
| Core 6 | [#1263](https://github.com/infowaterk-max/water-K-/issues/1263), [#1264](https://github.com/infowaterk-max/water-K-/issues/1264) | 10 | 6.1–6.9 + 6.3/A, 6.3/B; email tarifa OPEN |
| Core 7 | [#1267](https://github.com/infowaterk-max/water-K-/issues/1267) | 12 | 7.1–7.12, 7.5 feltételes reliability proof |
| Core 8 | [#1269](https://github.com/infowaterk-max/water-K-/issues/1269), [#1270](https://github.com/infowaterk-max/water-K-/issues/1270) | 10 | 8.1–8.10 elfogadott; E7 és Release-csomagbesorolás PO szerinti, de technikai drift nyitott |
| Core 9 | [#1271](https://github.com/infowaterk-max/water-K-/issues/1271) | 11 | 9.1–9.6/B dokumentált elfogadás, 9.7 **NEM elfogadott**; provider/TCO döntés részben nyitott |

**108 = egyértelmű forrásrekord az indexben, nem 108 teljesen visszanyert szó szerinti PO-beszélgetés, és nem 108 kész képesség.** Külön nyolc keresztmodulos/VX/Factory irányelv szerepel az indexben. A státuszjelölések szándékosan különböztetik meg a `GITHUB_NORMATIVE_SECTION`, `GITHUB_SUMMARY_NOT_VERBATIM`, `RECOVERED_PO_USER_MESSAGE_SUMMARY_NO_VERBATIM` és `NO_SUBPOINT_VERBATIM_FOUND` forrástípusokat.

## 2. Újonnan visszanyert Core 2.13–2.17 PO-beszélgetési adatok

A korábbi [#1259](https://github.com/infowaterk-max/water-K-/issues/1259) helyesen jelezte, hogy a 2.13–2.19 **teljes** eredeti döntési szöveg nem áll rendelkezésre. Ez az audit **részleges, érdemi előrelépést** talált, de nem állít elő hamis szó szerinti átiratot.

| Pont | Korábbi PO-felhasználói üzenet visszakeresett időpontja (UTC) | Biztosan visszanyert tartalom | Korlát |
|---|---|---|---|
| **2.13** Kapcsolódó termékek, kiegészítők és alternatívák | 2026-10-10 22:32:12 | Kézzel megadott ajánlás felülírhat automatikus ajánlást; kompatibilitási állítás csak megbízható adatra támaszkodhat | Teljes elfogadási szöveg nem áll rendelkezésre |
| **2.14** Termékazonosítók, cikkszámok és vonalkódok | 2026-10-10 22:34:15 | Ha kereskedő nem ad SKU-t, a rendszer generáljon egyedit | További ellenőrzési/ütközési részleteket a forrásból kell bizonyítani |
| **2.15** Termékképek, videók, dokumentumok | 2026-10-10 22:40:20 | Újrafelhasználható közös médiatár; variánsonkénti galéria; törlés előtt hivatkozásellenőrzés; Alap+Pro | Nem egy teljes médiapipeline-specifikáció |
| **2.16** Termékmásolás, importálás, tömeges szerkesztés | 2026-10-10 22:48:55 | Másolat piszkozat, új SKU, 0 készlet, nincs örökölt értékesítési előzmény; import/bulk előnézet | Részletes mező- és hibakezelési contract eredetiből pontosítandó |
| **2.17** Import és veszélyes tömeges műveletek határa | 2026-10-11 07:46:54 | Import alapértelmezetten nem töröl; archiválás/törlés/inaktiválás csak külön explicit jóváhagyás, előnézet és naplózás mellett | Az eredeti alpont pontos címe és teljes szövege még nem hitelesített |
| **2.18–2.19** | nincs hiteles egész eredet | Korábbi elfogadás státusza #1259 szerint megőrzendő | **Nem szabad konkrét szöveget kitalálni vagy új üzleti döntésként megnyitni** |

Ez egy kulcsfontosságú különbség: az eredet-visszakeresés **kiegészíti** a hiányos forrást, nem írja felül a normatív, már PO-elfogadott 2.13–2.19 státuszt. Későbbi implementációnál az érintett bizonytalan követelményrészhez **SOURCE_UNVERIFIED**, nem pedig automatikus PASS tartozik.

## 3. Visszakeresett VX Builder és Template Factory döntések – felülírásokkal

1. **Visual First és vizuális PO authority.** Korábbi PO elfogadások 2026-09-28 19:32:54 UTC; 2026-10-03 07:50:58 UTC; 2026-10-07 21:43:50 UTC. A sorrend: teljes vizuális referencia → PO vizuális elfogadás → Builder shared capability audit/megvalósíthatóság → implementáció → teljes hűség/functional proof. **Nem** „kódolunk előbb egy nagyjából hasonlót”.
2. **Nincs automatikus referencia-lebutítás.** A 2026-10-07-i PO-megbeszélés szerint ha a Builder nem tudja a már elfogadott referenciát, a hiányzó szerkeszthető megosztott Builder-képességet kell rendezni. Újratervezés csak új, külön kifejezett PO-jóváhagyással. Ezt a korábbi 2026-10-08-i Sport Hub frame- versus képtartalom-elkülönítési döntés is alátámasztja. Sem CSS-hack, sem template-local runtime másolás nem tekinthető megoldásnak.
3. **14 kanonikus oldal × 3 viewport.** A tényleges PO-elfogadás és 14×3 teljes fidelity ellenőrzés nem helyettesíthető a hat canary page vagy „a CI PASS” állításával. A 14×3 nem helyettesíti a működő route-okat, médiát, shopping flow-t sem. Régi elfogadások: 2026-09-28 18:47:17 és 19:32:54 UTC; #469.
4. **Guarded Freedom, nem korlátlan Wix-szerű vászon.** 2026-09-30 18:30:21 és 20:00:21 UTC: sidebar nélküli, Library + vászon + Inspector elrendezés, kontextusos „+”, 12 oszlopos grid/snap, kontrollált resize, rétegek, responsive authority, stílusöröklés; felhasználói szabadság és egységes szín-/minőség-őrzés együtt. A 2026-10-01 03:38:01 UTC döntésben desktop elsődleges authoring/audit, mobil ellenőrzés és gyorsjavítás, nem második teljes értékű, külön runtime.
5. **Egy kanonikus sablon/package, közös schema/runtime.** Template → Page Preset → Section Preset → Component; Recipe/Blueprint/Generator Readiness; Template #3 csak minden valódi előfeltétel után. Korábbi PO 2026-09-28, 2026-10-02 10:00:17 UTC.
6. **Managed / static-feel quick start és opcionális advanced Builder.** Kereskedő egyszerűen indulhat kész sablonnal és irányított adat- és tartalomkitöltéssel; a Builder nem lehet minden tenant piacra lépésének feltétele. Nem jelent két különálló storefront runtime-ot. Korábbi beszélgetési irány 2026-10-05–06.
7. **42 sablon és Blank/Studio külön ellenőrzés.** A korábbi igényben 42 különböző design és egy Blank/Studio lehetőség is megjelent; a `43`-as összesítést **nem tekintjük végleges, önállóan elfogadott portfóliószámnak** a canonical registry és későbbi kifejezett PO döntés egyeztetése nélkül.
8. **Loot Vault v2 vizuális cél nem kiadási engedély.** Kb. 95% referenciahűség, eredeti media/interaction, 14 oldal, D/T/M; kód, preview és CI presence önmagában nem Product Owner végső képi jóváhagyás. Nyitott [#469](https://github.com/infowaterk-max/water-K-/pull/469) újraellenőrizendő; korábbi „PASS” narratíva nem bizonyít aktuális ready/merge státuszt.

## 4. Meglévő döntésütközések és előnyt élvező forrás

| Eltérés | Régebbi általános szöveg | Későbbi elfogadott PO-határ | Kötelező teendő |
|---|---|---|---|
| B2B / RFQ jogosultság | Minden ajánlatkérés Pro | #1259 M4.4/4.10: egyszerű B2B és RFQ Alap+Pro, fejlett vállalati workflow Pro | `MR1-PACKAGE-CAPABILITY-MATRIX` és server-side negative tests |
| E7 Compare/Spec | Special Commerce generikusan Pro | #1269 M8.5: teljes E7 Alap+Pro | #1270 entitlement/author/publish/runtime korrekció |
| Release/Drop | Release generikusan Pro | #1269 M8.9: Release Alap+Pro, drop-specifikus pénzügyi kimutatás Pro | #1270 canonical package drift és truth |
| Media galéria | A „Pro jobb képet kap” félreértelmezés | #1269 M8.10: normál galéria, minőség, zoom, variánskép Alap+Pro; non-3D 360 Pro | A közös media és viewport runtime megőrzendő |
| Visual First vs Builder-korlát | A reference „leegyszerűsíthető” | 2026-10-07 PO: elfogadott referencia elsődleges; shared Builder fejlődik, redesign csak új PO-engedéllyel | Gap tracking, nem helyi CSS-hack |
| 9.7 „emberi ügyeleti motor” | Jelen chatben felvetett javaslat | 9.4 és 9.5/A incident/alert részekre nagyrészt fedik; 9.7 nincs elfogadva | Nem indítható új authority vagy implementáció |
| E-mail küldési költség | 6.3 működési elfogadásból valótlan kész tarifa | #1264 PO OPEN | Külön jóváhagyásig sem díj, sem provider-aktiválás |

**Kritikus:** a dokumentum és a külön gépi index nem módosítja a Living Roadmapet; a korábbi roadmap-sorok felülírását a kapcsolódó #1270 és más végrehajtási feladatban kell bizonyítani, majd explicit módon átvezetni.

## 5. Megvizsgált meglévő fejlesztési kapuk – mit bizonyít a tényleges kód?

2026-10-13 `main` read-only forrásellenőrzés alapján:

| Autoritás / script | Mit ellenőriz | Mit NEM bizonyít még |
|---|---|---|
| [`AGENTS.md`](../../AGENTS.md) | Knowledge Before Build → Development Guard → Plan Before Code → edit-time, replay és végső Truth Gate eljárás | Önmagában nem gépi garancia, hogy minden történeti PO-beszélgetés fel lett használva |
| [`po-instructions.v1.json`](../../quality/knowledge/po-instructions.v1.json) | Egy aktív PO-instruction: `PO-INSTRUCTION-SHIPPING-PAYMENT-SEPARATE` | Nincs benne mind a 108 kiegészítő indexrekord; ez **nem** teljes PO-szabályregiszter |
| [`shoperation-development-guard.mjs`](../../scripts/shoperation-development-guard.mjs) | Subsystem/known failure/negative knowledge scope; PO sourceRef és completion-contract váz | Nem ellenőrzötten tölti be automatikusan az összes #1259–#1271 normatív alpontot |
| [`shoperation-plan-before-code.mjs`](../../scripts/shoperation-plan-before-code.mjs) | `DEV_PLAN_PO_INSTRUCTION_UNACKNOWLEDGED`, semantic execution route, plan completeness stb. | A felismerhető PO Instruction halmaz **jelenleg 1 registry-tételből** áll; hiányzó teljes beszélgetési eredet ellenőrzése nem igazolt |
| [`shoperation-knowledge-preflight.mjs`](../../scripts/shoperation-knowledge-preflight.mjs) | Known Failures, negative knowledge, scope és reference integritás | A dokumentált PO-vita teljes életútját és minden új forrásrekordot nem ellenőriz |
| [Living Roadmap v2](../../quality/knowledge/living-roadmap.v2.json) | Maturity / dependency order, `acceptedDecisionCoverageRequired` elv | A döntésenkénti PO-id→source→negative assertion→test összekötés nincs e körben igazolva |

**Következtetés:** a Control Plane/Plan Before Code fejlett, de a **döntési forráslefedettség** még nem bizonyított. Nem helyes emiatt minden meglévő gate-et „hiányzónak” mondani; a tényleges hiány az üzleti PO-alpontok forrás-/felülírás-/ellenőrizhetőség-automatikája. A Machine-Readable Index jelenleg **dokumentációs evidencia**, nem regisztrált, végrehajtható kapu.

## 6. Prioritásos hiánytérkép (P0/P1 itt audit-prioritás, NEM automatikus roadmap-átrendezés)

**P0 – Elsőként pontosítandó, mielőtt érintett feature késznek nyilvánítható:**

- **GAP-001:** M2.18–2.19 eredeti részletes PO-követelmény, M2.13–2.17 teljes eredeti szöveg, M1 per-subpoint források nincsenek hitelesen archiválva. Egyes részletek visszaállíthatók a dátumozott felhasználói üzenetösszefoglalókból, de a forrásértelmezést külön jelölni kell.
- **GAP-002:** Keresztmodulos PO-instruction registry jelenleg 1 gépi szabályt tartalmaz; a 108 forrásrekord nem 108 automatikus guard. Az értékes, általános PO-utasításokat az **existing authorityba** kell adatmigrációs/minőségi folyamatban integrálni; ne hozzunk létre új párhuzamos engine-t.
- **GAP-003:** Nincs végig bizonyítva a `source issue/subpoint → PO instruction → impacted files → completion contract → positive/negative proof → verified closure` függőségi lánc minden releváns Core / Builder / Factory feladatra.
- **GAP-004:** Hatályos Alap/Pro szabályok felülírásának runtime/plan/DB bizonyítása nyitott (#1270, illetve M4 B2B).

**P1 – Következő dokumentációs és proof ütem:**

- **GAP-005:** Builder és sablonelfogadásokhoz timestampes beszélgetési kontextus visszanyert, de minden egyes vizuális döntés/oldal/komponens eredeti jóváhagyás-linkje, helyi viselkedési és 14×3 bizonyítéka nem hiánytalan.
- **GAP-006:** A ChatGPT teljes nyers beszélgetési archívuma nem érhető el igazoltan egyben. Privát anyag nem tehető nyilvános repóba; belső/jogosultságvédett forrásazonosító kell.
- **GAP-007:** Üzletileg nyitott árak: 6.3 email, M1 tárhelybővítés, 9.1 infrastruktúra/TCO. Ezek nem kaphatnak „accepted” státuszt hallgatólagosan.
- **GAP-008:** Még nincs negatív **bizonyítás**, hogy a Control Plane blokkolna egy direkt PO-kontradikciót, például `E7 Pro-only`, `Drop Pro-only`, `M4 RFQ Pro-only` vagy `kereskedő opt-out a Core-frissítésből`.

## 7. A további kontrollált lezárás pontos szerződése (nem ebben a docs-only feladatban futtatva)

**A. Source authority előállítása:** stable PO-decision ID (pl. `PO-M8-5-E7-ALAP-PRO`), döntésforrás, PO dátum, hatókör, explicit tiltott állapotok, felülírt régi referenciák, privacy-safe forrás-azonosító, hiányos forrás státusz. A gépi indexből **nem** szabad automatikusan éles PO instructiont létrehozni, ha a pontos normative contract és hatáskör nincs bizonyítva.

**B. Existing guardba kötés:** a már létező PO Instruction Authority / Codebase Atlas / Plan Before Code útvonalon (nem második loader/gate) kötelező a scope szerinti PO-követelményeket és a negatív tiltásokat összevetni, a hiányt fail-closed jelezni. A `po-instructions.v1.json` tényleges módosítása csak plan/CHALLENGE/proof mellett, külön release-unitban történjen.

**C. Adversarial, pozitív és negatív tesztek:** 
- `M8.5 E7 Pro-only` mint terv → **BLOCK**, helyes Alap+Pro terv → eligible.
- `M8.9 Release Pro-only` → **BLOCK**; Pro-only Drop P&L marad.
- `M4 B2B minden ajánlatkérés Pro-only` → **BLOCK**.
- `M9.6/A tenant may skip mandatory Core security updates` → **BLOCK**.
- `T-Visual-First: Builder limitation licenses image downgrade` → **BLOCK**.
- Egy hiányzó, nem hiteles PO-szöveg **nem tekinthető PASS-nak**; source escalation / `UNKNOWN` és szükség esetén `BLOCK` a releváns tervezésnél.
- Tényleges `exact-head` CI/Completion Truth + Lifecycle csak a végrehajtás után.

**D. Biztonsági és költségkorlát:** nincs provider-váltás, fizetős szolgáltatás, release/PR/CI/éles deploy, amíg nincs külön jóváhagyás és proof. Korlátozott dokumentációs ág a korábbi Core release ordert nem módosítja. A nyilvános GitHubban csak szűrt, nem bizalmas üzleti források szerepelhetnek; teljes raw chat csak jogosultságvédett tárolóban, valódi exporttal és ellenőrizhető integritással.

## 8. E munkamenet elvégzett és nem elvégzett műveletei

**Elvégezve:** korábbi beszélgetési részletek visszakeresése és forrásminősítése; Core 1–9 döntésnaplók read-only újraellenőrzése; 108 rekordos per-point másodlagos forrásindex; nyolc globális/VX/Factory szabály és nyolc konkrét GAP; 2.13–2.17 részleges új visszanyerés; jelenlegi PO-registry/guard script statikus ellenőrzése; dokumentációs ágban rögzítés.

**NEM elvégezve:** teljes ChatGPT-nyers átirat-hitelesítés; minden eredeti döntés szó szerinti beszerzése; PO Source → Plan Guard éles bekötés; code/runtime módosítás; negatív végrehajtott gate teszt; teljes CI/PR/release/market-ready bizonyítás; provider-költségvállalás. A feladat tehát **részletes forrásaudit és gap mapping**, nem `VERIFIED_DONE` a teljes eredetbiztosításra.

**Fő tanulság:** a „suttogós játék” megelőzésére a jó összefoglaló mellé visszakereshető, pontonkénti döntéseredet és a **létező** fejlesztési kapuba kötött, későbbi eltérést elutasító ellenőrzés kell. Egy részt már dokumentáltunk; a gépi védelem önmagában még nem bizonyított.
