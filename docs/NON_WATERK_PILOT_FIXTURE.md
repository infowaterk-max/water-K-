# Shoperation – nem Water-K pilot fixture

Ez a fixture a platform újrahasznosíthatóságának kötelező bizonyítéka. Nem production seed, és nem hoz létre ügyféladatot automatikusan.

## Pilot identitás

- Webshop neve: **Mintabolt Otthon**
- Slug: `mintabolt-otthon`
- Csomag: `alap`
- Publikus URL: külön preview/pilot domain
- Water-K név, terméknév, SKU, domain, e-mail vagy arculati elem: **tiltott**

## Arculati minimum

- saját webshopnév
- saját logó vagy szöveges logó
- saját elsődleges szín
- saját hero cím és leírás
- saját CTA-k
- saját kapcsolat/support identitás

## Kereskedelmi minimum

A pilot csak instance-szintű konfigurációból kaphat kereskedelmi beállítást.

Példa:
- `courier_demo`: házhozszállítás, 1 890 Ft
- `local_pickup`: személyes átvétel, 0 Ft
- `bank_transfer`: banki átutalás
- díjmentes szállítási küszöb: 30 000 Ft

A példakódok nem kerülhetnek a globális provider catalogba; a valódi pilotban meglévő provider vagy custom adapter konfigurációt kell használni.

## Termékminta

Legalább három, Water-K-tól független termékvariáns szükséges eltérő SKU-val, tömeggel, árral és készlettel. A szállítási logika kizárólag a termékadatból és az instance commerce konfigurációból dolgozhat.

## Kötelező E2E bizonyítás

1. A publikus fejléc, lábléc, SEO, kapcsolat és e-mail identitás a pilot márkáját mutatja.
2. Az Alap csomag funkciói működnek, Pro-only route/API közvetlen hívással is blokkolt.
3. Kosár → pénztár → rendelés végigmegy a pilot saját provider-konfigurációjával.
4. A díjmentes szállítás a pilot saját küszöbén aktiválódik.
5. Nincs Water-K SKU-, tömeg-, termék-, domain-, e-mail-, fizetési- vagy szállítási hardcode a futási útvonalon.
6. A pilot adatbázisa/Supabase projektje elkülönül a referencia-webshop környezetétől.

A pilot akkor tekinthető sikeresnek, ha a fenti ellenőrzések Water-K-specifikus kódmódosítás nélkül teljesülnek.
