# Water-K natív webshop architektúra

A cél teljesen saját webáruház: WordPress, WooCommerce és Flatsome nélkül.

## Stack

- Next.js 15 / React 19
- TypeScript strict mód
- Supabase: PostgreSQL, Auth, RLS
- Vercel: frontend + szerveroldali route-ok

## Saját modulok

- storefront és termékoldalak
- perzisztens kosár / checkout
- B2C, normál céges és viszonteladói fiókok
- rendelés- és készletkezelés
- saját admin
- K&H payment adapter
- Foxpost / GLS / MPL shipping adapterek
- e-mail és számlázási adapter később

## Integrációs elv

Minden külső szolgáltatás saját adapter interfészen keresztül kapcsolódik. A webshop üzleti logikája nem függ konkrét szolgáltatótól, így új fizetési vagy szállítási szolgáltató később izolált adapterként adható hozzá.

## Biztonság

- Fizetési és admin műveletek szerveroldaliak.
- Böngészőbe csak Supabase publishable/legacy anon kulcs kerülhet.
- Supabase secret/service-role kulcs kizárólag szerveroldali környezeti változó lehet.
- A banki callback aláírását minden esetben ellenőrizni kell; hitelesítés nélkül a callback fail-closed választ ad.
- A kliens által küldött termékár és rendelési végösszeg nem megbízható adat: szerveroldalon katalógusból/adatbázisból újraszámoljuk.
- Admin jogosultságot `app_metadata` alapján ellenőrzünk, nem felhasználó által módosítható metadata alapján.
- A publikus Supabase táblákon RLS kötelező.
