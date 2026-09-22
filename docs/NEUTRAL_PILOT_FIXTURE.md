# Shoperation – semleges pilot fixture

Ez a fixture a platform újrahasznosíthatóságának kötelező bizonyítéka. Nem production seed, és nem hoz létre ügyféladatot automatikusan.

## Pilot identitás

- Webshop neve: **Mintabolt Otthon**
- Slug: `mintabolt-otthon`
- Csomag: `alap`
- Publikus URL: külön preview/pilot domain
- Bármely valós ügyfél neve, terméke, SKU-ja, domainje, e-mailje, arculati eleme vagy üzleti szabálya: **tiltott**

## Arculati minimum

- saját webshopnév
- saját logó vagy szöveges logó
- saját elsődleges szín
- saját hero cím és leírás
- saját CTA-k
- saját kapcsolat/support identitás

## Kereskedelmi minimum

A pilot csak instance-szintű konfigurációból kaphat kereskedelmi beállítást. A valódi pilotban meglévő provider vagy custom adapter konfigurációt kell használni; demó provider-kód nem kerülhet a globális provider catalogba.

## Termékminta

Legalább három semleges termékvariáns szükséges eltérő SKU-val, tömeggel, árral és készlettel. A szállítási és merchandising logika kizárólag termékadatból és instance konfigurációból dolgozhat.

## Kötelező E2E bizonyítás

1. A publikus fejléc, lábléc, SEO, kapcsolat és e-mail identitás a pilot márkáját mutatja.
2. Az Alap csomag funkciói működnek, Pro-only route/API közvetlen hívással is blokkolt.
3. Kosár → pénztár → rendelés végigmegy a pilot saját provider-konfigurációjával.
4. A szállítási díj és díjmentességi küszöb kizárólag a pilot konfigurációjából származik.
5. Nincs valós ügyfélhez kötött SKU-, tömeg-, termék-, domain-, e-mail-, fizetési-, szállítási- vagy branding hardcode a futási útvonalon.
6. Fizető pilotnál a Supabase/adatbázis környezet a pilot 1.0 izolációs modell szerint elkülönül.

A pilot akkor tekinthető sikeresnek, ha a fenti ellenőrzések ügyfélspecifikus kódmódosítás nélkül teljesülnek.
