# Shoperation — korábbi beszélgetési döntéseredet, visszacsatolt index (2026-10-13)

> **Minősítés: rekonstruált, forráshoz rendelt történeti kontextus; nem szó szerinti teljes ChatGPT-átirat, nem új PO-döntés és nem implementációs/CI bizonyíték.**
>
> Cél: a korábban kifejezetten elfogadott Product Owner-irányokhoz rendelni a visszakereshető beszélgetési indokokat, elvetett alternatívákat, időpontokat és a GitHub normatív döntésnaplóit. Ez a fájl a döntések melléklete: **a hatályos PO-határozat az adott hivatkozott GitHub issue-ban, illetve az időben későbbi kifejezett döntésben található**. Hiányzó teljes átiratot soha nem szabad rekonstruált szó szerinti idézetként beállítani.
>
> **Nyilvánosság / adatvédelem:** ez a GitHub repository nyilvános. A jelen dokumentum csak technikai/üzleti, szűrt döntési összefoglalókat tartalmaz; nem tartalmaz személyes chat-átiratot, hozzáférési adatot, titkot, számlát, ügyféladatot vagy privát beszélgetéslinket. Teljes szó szerinti átirat és közvetlen ChatGPT beszélgetés-URL jelen körben **nem állt hitelesen rendelkezésre**. Hivatkozásként időbélyeg+szerepkör+téma szerepel; eredeti szöveg külön, jogosultságvédetten archiválható és ellenőrizhető.
>
> **Forrástípusok:** G = élő GitHub normatív issue / repository fájl (2026-10-13 read-only ellenőrzés); H = korábbi ChatGPT beszélgetésekből visszakeresett, időbélyeggel ellátott **összefoglaló** (nem auditálható szó szerinti átirat); U = korábbi Product Owner felhasználói döntés; A = korábbi asszisztensi összefoglaló (önmagában nem PO-elfogadás). Egy H/A megjegyzés soha nem fogadható el új hatályos döntésként G/U felülvizsgálata nélkül.

## A. Hatályos GitHub döntésnaplók és érettségi szintek

| Hatókör | Elsődleges üzleti nyilvántartás | Állapothatár |
|---|---|---|
| Core 1–4 | [#1259](https://github.com/infowaterk-max/water-K-/issues/1259) | Üzletileg elfogadott; Module 2.13–2.19 teljes szövege külön forrásellenőrzést igényel; nem VERIFIED_DONE |
| Core 5 | [#1261](https://github.com/infowaterk-max/water-K-/issues/1261), [dokumentációs PR #1262](https://github.com/infowaterk-max/water-K-/pull/1262) | 5.1–5.10 elfogadva, 5.5 feltételes; implementáció nyitott |
| Core 6 | [#1263](https://github.com/infowaterk-max/water-K-/issues/1263); [6.3 e-mail tarifa #1264](https://github.com/infowaterk-max/water-K-/issues/1264) | 6.1–6.9 üzletileg lezárva, tarifa nyitott, technikai bizonyítás hiányos |
| Core 7 | [#1267](https://github.com/infowaterk-max/water-K-/issues/1267), [technikai #1268](https://github.com/infowaterk-max/water-K-/issues/1268) | 7.1–7.12 elfogadva, 7.5 feltételes proof; technikai nyitott |
| Core 8 | [#1269](https://github.com/infowaterk-max/water-K-/issues/1269), [entitlement/proof #1270](https://github.com/infowaterk-max/water-K-/issues/1270) | 8.1–8.10 elfogadva, későbbi E7 és Release kivételek felülírják a régi generikus Pro-only sort; technikai nyitott |
| Core 9 | [#1271](https://github.com/infowaterk-max/water-K-/issues/1271) | 9.1–9.6/B PO-elfogadva; 9.7 még nem elfogadott; megvalósítás és final audit NEM bizonyított |
| Ütemezés | [Living Roadmap v2](https://github.com/infowaterk-max/water-K-/blob/main/quality/knowledge/living-roadmap.v2.json) | Roadmap státusz ≠ felhasználói elfogadás ≠ bizonyított implementáció |
| Fejlesztési munkarend | [AGENTS.md](https://github.com/infowaterk-max/water-K-/blob/main/AGENTS.md) | Knowledge Before Build / Plan Before Code / exact-head proof előírt; külön bizonyítandó az üzleti lefedettség |

## B. Közös, több modulra kiterjedő döntések és az eredeti indok

**P-01 — Core-first és bizonyítás előbb, mint Builder/Template.** H/U: 2026-10-05 04:06 UTC; 2026-10-08 11:21 UTC; 2026-10-09 05:33 UTC; 2026-10-12 03:21 UTC. Az elfogadott függőségi sorrend: Core Capability Complete → Core Operational/Adversarial Proof → Unified Product Experience → 42-template capability census → Builder → Factory/42-sablon portfólió → Market Ready. Az indok: a Buildernek kész, bizonyítható commerce-képességeket kell szerkesztenie, nem helyettesítő sablonhelyi motorokat. A technikai hiba vagy véletlen PR nem jogosít fel Builder-irányú kitérőre. G: Living Roadmap `SHOPERATION-CORE-CAPABILITY-COMPLETE`, `CORE-OPERATIONAL-ADVERSARIAL-PROOF`.

**P-02 — Capability-Driven Development Philosophy.** H/U: 2026-10-08 11:21 UTC (elfogadás); H/A: 11:19 UTC előterjesztés. Képesség az ambíció előtt, függőségi sorrend, tényleges bizonyítás előrehaladás előtt; a referenciát nem szabad az éretlen Builderhez „leegyszerűsíteni”. Nem jelent minden jövőbeli modul azonnali teljes implementációját. G: Living Roadmap principles/maturity backbone.

**P-03 — Alap és Pro azonos alapvető biztonsági és kereskedelmi minőség.** H/U: 2026-10-05 csomaghatár egyeztetések; G: #1259, #1269, #1271, Living Roadmap `MR1-PACKAGE-CAPABILITY-MATRIX`. Az Alap nem lehet tudatosan lassabb, hibásabb, adatszempontból gyengébb vagy hiányos normál webshop. Pro: elfogadott fejlett üzleti/operatív képességek; minden jogosultság szerveroldalon érvényes.

**P-04 — Nem nyitunk új párhuzamos authorityt.** H/U: 2026-10-08 filozófia és 2026-10-12 ütemezés; G: AGENTS.md, #1267, #1271. Létező Product/Catalog, Order, Payment, Inventory, Incident, Communication, Event Workflow, Page Schema/StorefrontRuntime/Control Plane kapuk kiterjesztése; tilos az eltérő, sablonba vagy adminfelületbe rejtett helyettesítő engine.

**P-05 — Döntés, dokumentum, implementáció, teljes bizonyítás eltérő állapot.** H/U: 2026-10-12 03:18 UTC és 17:42 UTC. A Core üzleti review nem indít automatikusan kódot, CI-fixet, PR-t vagy éles műveletet; korábban lezárt pontokat nem nyitunk újra. G: #1259, #1263, #1267, #1269, #1271, AGENTS.md.

## C. Core 1–4: visszakereshető beszélgetési indokok és elfogadások

**M1-01 — Próbaüzem valódi értékesítéssel.** H/U 2026-10-09 18:49 UTC: a próbaidőszakban lehetséges valós értékesítés, megfelelő kereskedőazonosítás/aktiválás mellett. Indok: a próba nem csak demó; egy kereskedő a próba közben is szerezhet vevőt. H/U 19:03 UTC: kétlépcsős regisztráció/aktiválás, ne legyen mindenkitől automatikusan személyi/cégalapítási dokumentum bekérés. G: #1259 és kapcsolódó M1-forrás. Nem jelent ellenőrizetlen éles fizetést.

**M1-02 — Média és pontok.** G: #1259 elfogadott Trial 2 GB / Alap 5 GB / Pro 20 GB, 50 MB/videó, 80%/95% figyelmeztetés és 100% feltöltésblokkolás; Pro 2000 Points/hó. Tárhelybővítés ára **OPEN**. Korábbi chat-indok részletesen nem visszakeresett; ne pótoljuk feltételezéssel.

**M2-01 — Valódi variáns- és készletigazság.** G: #1259 M2.4; korábbi PO-egyeztetés rekonstruált kontextusa: minden létező SKU/variáns saját ár, készlet, vonalkód és megfelelő média, generált kombinációk ellenőrizhető kiválasztása. Elfogyott variáns inaktív, desktop tooltip és érthető mobilállapot, nem rendelhető; konkrét SKU-ra készletértesítés. Az elutasított opció nem aktiválható pusztán UI-trükkel.

**M2-02 — Bundle, digitális termék, DRS.** G: #1259 M2.5–2.10 és 2.21: fix kereskedői BOM nem egyenlő vevő által szerkeszthető Pro Composerrel; digitális termék és kulcskészlet, hatósági/fiskális díj külön adat. A M2.13–2.19 részletes PO-szöveg **nem helyettesíthető történeti emlékkel**.

**M3-01 — Teljes rendelési életciklus és tényleges pénzügyi igazság.** H/U: 2026-10-11 19:02 UTC kifejezetten elfogadott 3.12 chargeback, 3.11 hibakezelés. G: #1259 és PR #1237 audit. Checkout→Payment→Stock→Shipment→Invoice (Számlázz.hu ÉS Billingo)→Return/Refund→Dispute együtt zárandó; provider confirmed/refund/chargeback ≠ admin kézi státusz. M3 üzleti scope lezárva, end-to-end részben nyitott.

**M4-01 — Vevői fiók, vendégrendelés, B2B, joggyakorlás.** G: #1259 4.1–4.12: tokenvédett guest order tracking/claim, Ügyeim/Gyűjteményem, címjegyzék, adatvédelmi választások, visszáru/esetek, kézi újravásárlás Alap+Pro. A későbbi 4.4/4.10 döntés szerint az alap B2B partner/ajánlat Alapban is lehetséges, Pro a vállalati jóváhagyási/credit/maker-checker mélység; **nem** a régi általános „RFQ csak Pro” szabály. M4.9 automatikus pótrendelési ajánlat Pro, kereskedő és vevő egymástól független OFF-by-default opt-innel.

## D. Core 5–7: visszacsatolt üzleti forrás és kötelező kivételek

**M5-01 — Készlet/komissiózás/visszáru.** G: #1261 elfogadott 5.1–5.10, 5.5 feltételes. Alap+Pro SKU/location foglalás, in_transit nem eladható, auditált készletmozgás, leltár, figyelmeztetés, manuális beérkezés és CSV/XLSX előnézet. Pro: procurement/replenishment és külön raktáron belüli polc/bin nyilvántartás (5.7) — nem teljes WMS. Sérült/visszahozott termék nem kerülhet automatikusan eladható készletbe.

**M6-01 — Marketing/kupon/csomag és email két külön döntésréteg.** H/U 2026-10-12 17:34 UTC: elfogadott modulzárás **az e-mail díjtarifa nélkül**. G: #1263 6.1–6.9 PO-elfogadott; #1264 küldési díj/kvóta nyitott. Hibrid központi/BYO email, consent/suppression, transactional/marketing határok maradnak; sem új fizetős provider, sem automatikusan vállalt küldési díj nem keletkezik.

**M7-01 — Irányított indítás.** H/U 2026-10-12 17:55 UTC: lineáris alap onboarding, automatikus mentés és folytatás, valódi rendszeradatokból ellenőrzött checkpointok, kritikus hiánynál nyitásblokkolás. G: #1267 7.1 (a normatív lépések pontos listáját ott kell felhasználni, nem történeti összefoglalóból kitalálni).

**M7-02 — Üzemeltetési központ, szabályozott automatizálás, kipróbálás.** G: #1267 7.2–7.12, különösen 7.5 feltételes tesztmegbízhatóság, 7.7–7.8 Incident/Recovery, 7.9 API, 7.11 demó és 7.12 kontextusos segítség. Már létező Sentinel/Control Plane authority marad, veszélyes éles javítás emberi jóváhagyással. Ne legyen az incidenskezelésből automatikusan új Core 9.7 párhuzamos ticket/ügyeleti motor.

## E. Core 8–9: később elfogadott felülírások

**M8-01 — A generikus Pro-only szabály NEM teljes döntés.** G: #1269 legutolsó „végleges üzleti scope-zárás” normatív táblája az irányadó, #1270 technikai entitlement reconcile. E7 (8.5) teljes Compare/Spec Alap+Pro, nem Pro-only; Release/Drop (8.9) teljes alapmotor Alap+Pro, csak részletes Drop pénzügyi eredményelemzés Pro; 8.10 teljes normál galéria Alap+Pro, Pro speciális non-3D 360 képforgatás. Kifejezett későbbi PO döntés felülírja a Living Roadmap régi generikus Pro-only szövegét; nem szabad csendben visszaminősíteni. E8 Context Profile teljesen Pro; E3/E4/E5/E6/E11/Recipe speciális módjai Pro a hatályos mátrix szerint.

**M8-02 — Nem bővíthető pusztán új sorszámmal.** G: #1269: 8.1–8.10 business closed, nem kell mesterséges 8.11; technikai hiány nem új üzleti pont. H/U: 2026-10-05 07:48 UTC supervised automation/advisory; önálló gazdasági döntést nem bízhatunk AI-ra.

**M9-01 — Biztonság, minőség, költség, ebben a sorrendben.** G: #1271 9.6/B, PO elfogadás 2026-10-13. A korai havi néhány ezer HUF-nyi többlet is számíthat; nagyobb webshopállománynál drágább, ténylegesen indokolt védelem előnyben lehet — ezek szemléltető elvek, nem automatikus költségkeret.

**M9-02 — Mért infrastruktúraválasztás, nem hűség/árhasraütés.** G: #1271 9.1–9.3. Vercel, Supabase és e-mail provider vizsgálata az éles/Core-final kapu előtt, becsült tenantköltség vs tényleges számla, monitorozás saját terhelése, noisy-neighbor és izoláció. Most nincs jóváhagyott provider migráció, új havi díj vagy számszerű SLA.

**M9-03 — Védett incidens és eseményvezérelt e-mail.** G: #1271 9.4 és 9.5/A. Kritikus webshop-/platformhibánál az illetékes értesítést kap; root cause bizonyossága helyesen címkézett, incident/recovery/alert existing authority, no unsafe autonomous intervention. Ezért a jelen beszélgetésben felvetett „9.7 emberi ügyelet” **NEM PO-ELFOGADOTT ÚJ KÖVETELMÉNY**, nagy része már 9.4/9.5/A; ne promótáljuk automatikusan.

**M9-04 — Kötelező, központi Core-frissítés.** G: #1271 9.6/A: nincs „kereskedő megtarthatja régi core-t” WordPress-szerű opt-out; kompatibilitási preflight, célzott tenant-kockázat osztályozás, reprezentatív sandbox, átlátható változásnapló; nem kell 500 teljes per-tenant sandbox. A költségcsökkentés sem gyengítheti a biztonsági/integritási alapot.

## F. VX Builder / Template Factory / vizuális hatóság — beszélgetési források

**T-01 — Visual First a kód előtt.** H/U 2026-09-23 15:36 UTC; 2026-09-28 18:47 UTC; 2026-10-03 07:50 UTC. Elfogadott sorrend: vizuális tervezés (összes érintett oldal) → PO vizuális jóváhagyás → implementáció → fidelity + működési proof. A benchmarkot nem módosítjuk utólag a gyengébb Builder képességeihez. A harmadik sablon kódolása előtti 14 oldalas vizuális elfogadás kötelező.

**T-02 — 14 kanonikus oldal × három viewport.** H/U 2026-09-25 05:44 UTC és 2026-09-28 19:32 UTC. Nem 6 oldal × 3, hanem minden sablonnál 14 × Desktop/Tablet/Mobile, 14×3 vizuális ellenőrzés; a hat canonical canary page a regressziós minta, nem a teljes PO-elfogadás helyettesítője. A showroom-tulajdonosi menüben pontosan a 14 oldal. G: Living Roadmap `TEMPLATE-PORTFOLIO-42`, Factory proof.

**T-03 — Kanonikus identitás és megosztott runtime.** H/U 2026-09-24 03:09 UTC; 2026-09-28 18:47–19:32 UTC. Egy `{templateKey}@{version}` kanonikus package/recipe; Blueprint v0.1, Generator Readiness, canonical Page Schema, StorefrontRuntime, responsive/commerce auth; nincs külön Factory, templatelokális checkout, renderer, régi v1-override vagy gyengített kapu. Hierarchia: Template → Page Preset → Section Preset → Component.

**T-04 — LOOT VAULT v2 vizuális viszonyítás.** H/U 2026-09-28 10:25 UTC elfogadott kb. 95% referenciahűségi cél; 2026-09-30 03:31 UTC gold primary/dark-gold-outline secondary CTA és arany választott állapot, placeholder/legacy UI tiltás. 2026-09-25 14:51 UTC: v2 QA-only, **nem vizuálisan PO-elfogadott/production**, a zöld CI és 14×3 presence proof önmagában nem elég. 2026-09-30 13:31 UTC: valódi thumbnail interakció, collection/account és kereskedelmi útvonal bizonyítandó. Nem tekinthető automatikusan kész sablonnak.

**T-05 — Guarded Freedom VX Builder.** H/U 2026-09-30 17:54 UTC üres oldal, navigáció/section „+”, nagy preset library, kontrollált drag/resize; H/A 2026-09-30 17:55 UTC javasolt direct manipulation/Inspector és grid. Elfogadott keret: szerkeszthetőség megőrizve, grid/snap, tokens, korlátozott komponens szabadság, de nem minden javasolt részlet külön PO-elfogadás. VX Shop Builder + VX Site Builder ugyanarra a guarded koncepcióra; nincs második commerce runtime. H/U 2026-09-28 10:23 UTC: publikált sablon vizuálisan szerkeszthető, védett kompozíciót és responsive hűséget nem törheti szét.

**T-06 — Managed quick start és advanced Builder külön használati mód, közös runtime.** H/U: 2026-10-05 05:05 UTC, későbbi 2026-10-06 beszélgetések; G: Living Roadmap `MANAGED-TEMPLATE-QUICK-START`. Alapeset: kész webshop-sablon, logó/tartalom/termékbeállítás vezetett formokon; a Builder haladó opcionális szerkesztés. Nem 42×2 fork, nem szükséges mindenkinek vásznat szerkesztenie.

**T-07 — 42 valóban eltérő design, nem 84 csomagfork.** H/U 2026-10-05 05:05 UTC. 42 dizájncsalád, 14 oldal, D/T/M, közös Alap/Pro runtime; a Factory később gyártja a vizuálisan elfogadott portfóliót. H/U 2026-10-02 10:00 UTC: harmadik sablon nem indul a Builder/Factory technológiai és proof előfeltételek előtt. H/U 2026-10-03 07:50 UTC: Visual First marad.

**T-08 — Vizuális referencia nem implementációs bizonyíték és nem generikus kreatív licenc.** H/U 2026-09-23 15:36 UTC: Loot Vault v2 sötét/cinematic collector referencia valódi media, helyes termék-/vásárlói integráció; elvetett random stock/gamer kép és generikus sablon helyettesítés. H/U 2026-09-25 15:22 UTC: legal pages, Contact, Account, Collections stb. hiány esetén nem fogadható el, még ha 14×3 teszt zöld is.

## G. Nem feloldott/ellentmondásos források — NEM szabad hallgatólagosan „javítani”

1. **M2.13–M2.19:** #1259 szerint teljes korábbi szöveg hiányzik; nem található szó szerinti eredet. Az állapot „elfogadott, részletes forrás reconciliálása szükséges”, nem újranyitott üzleti döntés.
2. **Roadmap generikus Pro-only vs későbbi PO-kivételek:** B2B Alap baseline (M4), E7 Alap+Pro (M8.5), Release/Drop Alap+Pro (M8.9). Normatív kivétel a megfelelő későbbi #1259/#1269; a Roadmap/entitlement drift külön proof feladat.
3. **E-mail díj és tárhelybővítés ára:** #1264, #1259 OPEN; tilos kész árként/auto-debitként feltüntetni.
4. **9.7 ügyeleti modell:** javaslatként merült fel a 2026-10-13 beszélgetésben, majd átfedés miatt visszavonásra került; nem PO ACCEPTED.
5. **Chat-eredet linkje:** jelenleg visszakereshető timestamp + szerepkör és rekonstrukció, de **nem** egy hiteles ChatGPT nyers átirat. A teljes szöveg megszerzése után akár rekordhoz rendelt, privát, integritásvédett forrást lehet pótolni. Nem szabad kitalált ChatGPT URL-t vagy szó szerinti idézetet generálni.
6. **Vizuális elfogadás vs technikai proof:** Playroom/Loot Vault történeti állapotokat nem szabad aktuális release/PO-approvalnak tekinteni HEAD/PR és vizuális újraellenőrzés nélkül.

## H. Felhasználási szabály a következő fejlesztési munkákhoz

- Induláskor előbb: a témához tartozó aktuális GitHub PO-issue, releváns H/U időbélyeges beszélgetési kontextus, Living Roadmap és PO Instruction Authority, majd csak azután implementációs terv.
- Az eredeti PO normatív követelmény, a történeti magyarázat az értelmezéshez kötelezően figyelembe veendő háttér, **nem** önálló, új feature-engedély. Ellentmondásnál: későbbi kifejezett PO-döntés → aktuális normatív issue → történeti kontextus; a hiányt fel kell tárni, nem ötletként újranyitni.
- A megvalósítás és proof köteles nyomon követni, mely hatályos PO döntést bizonyította. A dokumentum puszta léte **nem** bizonyítja, hogy minden fejlesztési gate már automatikusan kikényszeríti ezt; további guard-integráció és negatív vizsgálat külön feladat.
- Nincs új feature acceptance, nincs roadmap státusz-módosítás, nincs kód, CI/PR vagy éles szolgáltató művelet e dokumentumtól.

**Készült:** 2026-10-13, GitHub read-only döntésnaplók és korábbi ChatGPT beszélgetési visszakeresések összevetéséből; előzetesen szűrt publikus üzleti dokumentum, nem teljes archiválás.
