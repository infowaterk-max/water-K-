# Shoperation Admin/Platform audit #1–#23

Ez a dokumentum a 2026-09-01-i Workbench és Platform Owner átvizsgálás döntéseit rögzíti.

## Globális UI/UX
- #1: az admin és /platform útvonalakon a vásárlói webshop fejléc/lábléc nem jelenhet meg.
- #2: a sidebar márkablokk a Shoperation név + szlogen számára van kialakítva; a végleges képi logófájl később cserélhető be.
- #3/#4/#7: könnyebb címsor-tipográfia; három felhasználói betűméret: Kompakt, Normál, Nagy.
- #5: desktopon a sidebar és a munkaterület két független scroll-konténer.
- #8: belső fejlesztési csomagazonosítók (V9/V12/V17/V18/V24 stb.) nem jelennek meg ügyfél UI-ban.
- #11/#19: nyers böngésző-űrlapok és széteső mezősorok egységes admin komponens-stílust kapnak.

## Információs architektúra
- #9: Termékek = katalógus/ár/készlet napi kezelés. Készlet-elemzés és Beszerzés külön menüpont.
- #10/#16: Termékajánlások, tömeges műveletek és integrációk élesítés előtt funkcionális auditot kapnak.
- #17: Ügyfél-webshopok a Shoperation előfizetőit és webshop-példányaikat kezeli, nem a webshop végvásárlóit.
- #22: Platform műveletek csak kivételeket/anomáliákat kezeljen; a normál fulfillment maradjon webshop-szinten.
- #23: Platform napló megmarad auditnaplóként, szűréssel és visszakövethetőséggel.

## Kritikus routing
- #18: a Platform Owner szerepkör nem ütközhet merchant Alap/Pro feature-gate-be. A platform irányítóközpont, intézkedési központ és biztosítékok saját route-ja nyíljon meg, ne a Csomagkezelés.

## Üzleti modulok
- #3: a csomagoldal 3 oszlopos funkciómátrix: Funkció / Alap / Pro. A külön extrák (például AI) kompatibilitás esetén bármely csomag mellé feláras modulok lehetnek.
- #6: Indítási központban kötelező és ajánlott ellenőrzések szétválasztása; előnézet az élesítés előtt. A publikus megnyitás státuszmodelljét külön biztonsági körben kell lezárni.
- #12: Pro kampányközpont célja kampányonként csatorna, költés, kattintás/látogatás, vásárlás, attribútált bevétel, fedezet és megtérülés. A külső platformadatok automatikus lekéréséhez külön Meta/Google/TikTok integráció kell; UTM-alapú webshop attribúció az alap mérési réteg.
- #13: Tartalom & SEO mini-CMS: blog, landing, információs/jogi oldalak, előnézet, piszkozat/publikálás, média és SEO. Nem teljes WordPress-klón.
- #14: fizetés/szállítás/számlázás adapterek élesítés előtt integrációs auditot igényelnek.
- #15: Beállítások és Csomagkezelés route-összerendelését kattintásos navigációs teszttel ellenőrizni kell.
- #20/#21: Kiadás → Rollout → Utóellenőrzés → Helyreállítás egyetlen platformüzemeltetési lánc; csak a szükséges DevOps-funkciók maradjanak.

## Élesítés előtti kötelező ellenőrzés
1. összes sidebar menüpont route-tesztje;
2. desktop/tablet/mobil + 80/100/125% böngészőzoom UI ellenőrzés;
3. Alap és Pro jogosultsági mátrix;
4. Platform Owner minden platform route-ja;
5. import/export és tömeges műveletek tranzakciós biztonsága;
6. kampányattribúció mérési pontossága;
7. CMS publikáció/SEO;
8. fizetés, szállítás, számlázás és webhookok;
9. kiadás/rollout/utóellenőrzés/rollback folyamat;
10. auditnapló teljessége és módosíthatatlansága.
