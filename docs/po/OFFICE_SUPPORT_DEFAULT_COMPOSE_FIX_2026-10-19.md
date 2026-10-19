# Shoperation — ügyfélszolgálati e-mail írás alapjogának helyreállítása (2026-10-19)

## PO döntés és bizonyított hiba
- Az aktív `support` (ügyfélszolgálat) szerepkör **alapértelmezetten** létrehozhat új ügyfél-e-mailt és saját piszkozatot a jogosult Digitális Iroda munkatérben.
- A tulajdonos a meglévő `store_permission_overrides` réteg `deny` hatásával személyenként visszavonhatja az `office.email.compose` képességet; a tiltás elsőbbséget élvez a szerepkör-presethez képest.
- Az eredeti `20260908034000_digital_office_composer_drafts_foundation_v1.sql` az `office.email.compose` jogosultságot opt-in képességként hozta létre és szándékosan nem adta a support szerepkörhöz. Az új-e-mail oldal ezért elrejtheti a szerkesztőt.
- Megtartandó: a Digitális Iroda Pro-only munkatér (`officeCommunicationAdvanced`); az Alap egyszerű ügyfélkommunikációja külön hozzáférési útvonal. A Pro-csomag határát **nem** lazítjuk.
- Megtartandó: szerveroldali RPC/tenant/author/revision-védelem, nem engedélyezett postafiók esetén küldés fail-closed; a piszkozat csak akkor tekinthető mentettnek, ha az adatbázis bizonyítja.

## Választott javítás
1. Új, előrefelé alkalmazható, idempotens SQL migráció adja az `office.email.compose` szerepkör-presetet kizárólag a `support` szerepkörnek, `default_scope='all'` értékkel. Az eredeti migrációt változatlanul hagyjuk.
2. Az új-e-mail oldal a kanonikus `hasStoreCapability` döntést jelenítse meg; a tiltott munkatárs ne kapjon szerkesztőt. A hibaszöveg ne állítsa, hogy a szerepkörhöz külön extra engedély szükséges.
3. Új regressziós teszt bizonyítsa: alapjog; tiltás prioritása; nem érintett szerepkörök, jogosultságok és Pro-korlát; nincs postafiók automatikus aktiválása.

## Kizárt és adverszárius esetek
- `support` jogosultság túl széles alkalmazása más szerepkörökre vagy más tenantokra: tilos.
- `deny` megkerülése szerveroldali draft vagy send műveletben: tilos.
- Hiányzó permission-katalógus, role-preset táblák vagy hiányzó várt capability esetén: fail-closed, nincs csendes siker.
- Aktiválatlan e-mail postafiók, hamis küldési siker, alapcsomag Pro-jogosultság: tilos.
- Meglévő `store_permission_overrides`, delegációk, piszkozatok, mailboxok és korábbi SQL-források módosítása: tilos.

## Érvényesítési korlát
Ez csak forráskód-javítási jelölt. A meglévő, 31 Office forrásmigrációra épülő Fresh Install kiadási blokk (#1417) és a hosted adatbázis engedélyezési akadályai változatlanok. A jelen PR nem végez hosted DB-írást, nem telepít migrációt és nem igazol kész, működő e-mail-küldést.

Az automatikus CI, Plan Before Code, adatbázis-regresszió és Completion Truth bizonyítás eredményét külön kell ellenőrizni; a Source PR előzetesen DRAFT.

## Fresh Install – tényleges telepítési és forrás-azonossági bizonyíték (2026-10-19)
- **Célprojekt:** `Shoperation Fresh Install`, Supabase ref `istjjkdcvsvilrycqecd`, PostgreSQL 17.6.
- **Valódi migrációs napló:** `version=20261019073857`, `name=office_support_compose_default_v1` (nem a később tervezett `20261019090000` forrásverzió).
- Az itt nyilvántartott telepített SQL eredeti Git blob-azonossága: `408d631188bed051c18b340c99a1671755b60f24`; az új fájlnévvel a **tartalom változatlan**. Nem futott újabb SQL, nem készült mesterséges ledger sor.
- **Utóellenőrzés:** egy aktív `support` jogosultságvizsgálat: `allowed=true`, `source=role`; egy szerepkör preset; nem adtunk jogot más szerepkörnek; nincs konfigurált Office postafiók.
- **Fennmaradó:** a #1443-as UI-ág még nem került élesítésre; a Vercel általános preview Supabase URL-je a szüneteltetett staginget célozza, ezért az így indított teszt nem megfelelő. A Pro támogatói felhasználó tényleges Auth-munkamenetét és piszkozatmentését külön kell igazolni.
- **Kiadási tilalom:** ne futtassuk újra a `office_support_compose_default_v1` SQL-t; ne bélyegezzünk fiktív `20261019090000` verziót a migrációs naplóba. A két történeti alapmigráció és a #1417 forrásazonosságait nem módosítjuk.
