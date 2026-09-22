# Webshop Motor – ügyfélpéldány architektúra

## 1.0 pilot modell

A `webshop_instances` réteg a csomag-, extra- és hozzáférési jogosultságokat választja le a Water-K specifikus konfigurációról. Egy telepítés a `WEBSHOP_INSTANCE_SLUG` környezeti változóval köthető egy konkrét ügyfél-webshophoz.

A jelenlegi 1.0 pilot modell **nem közös adatbázisos, teljes multi-tenant rendszer**. A meglévő kereskedelmi táblák (rendelések, ügyfelek, termékek, készlet stb.) még nem tartalmaznak mindenhol `instance_id` kulcsot és tenant-szintű RLS-t.

Ezért fizetős pilotnál az elfogadott biztonsági modell:

- közös kódbázis / webshopmotor;
- ügyfelenként külön telepítési konfiguráció;
- ügyfelenként elkülönített adatbázis/Supabase projekt vagy más, bizonyítottan izolált adatbázis-környezet;
- a telepítéshez tartozó `WEBSHOP_INSTANCE_SLUG` az adott ügyfél csomagját és extráit oldja fel;
- platform-üzemeltetői jogosultság külön, szerveroldali `platform_operators` táblából érkezik;
- kereskedői tulajdonos/admin hozzáférés az adott instance membershipből érkezik.

## Miért ezt választjuk első körben?

Ez a modell kisebb biztonsági és migrációs kockázattal teszi lehetővé az első fizetős pilotokat. Nem kell a teljes, már működő Water-K kereskedelmi adatmodellt egyszerre tenantizálni, miközben az Alap/Pro és add-on csomagolás már ügyfelenként kezelhető.

## Későbbi shared multi-tenant irány

Ha üzletileg indokolt lesz több ügyfelet ugyanabban az adatbázisban futtatni, minden tenant-adatot hordozó táblán következetesen be kell vezetni az `instance_id` kapcsolatot, indexeket, tenant-aware RLS policykat, service-role lekérdezési szűrést, háttérworker izolációt, storage elválasztást és tenant regressziós teszteket.

A shared multi-tenant mód addig nem tekinthető támogatottnak, amíg ez a teljes adatút nincs lezárva és tesztelve.
