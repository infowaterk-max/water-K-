# Water-K natív webshop architektúra

A cél teljesen saját webáruház: WordPress, WooCommerce és Flatsome nélkül.

## Stack
- Next.js 15 / React 19
- TypeScript
- Supabase: PostgreSQL, Auth, RLS, Storage
- Vercel: frontend + szerveroldali route-ok

## Saját modulok
- storefront és termékoldalak
- kosár / checkout
- B2C, normál céges és viszonteladói fiókok
- rendelés- és készletkezelés
- saját admin
- K&H payment adapter
- Foxpost / GLS / MPL shipping adapterek
- e-mail és számlázási adapter később

## Integrációs elv
Minden külső szolgáltatás saját adapter interfészen keresztül kapcsolódik. A webshop üzleti logikája nem függ konkrét szolgáltatótól, így később például Foxpost helyett vagy mellett más szállító is hozzáadható.

## Biztonság
A fizetési és admin műveletek szerveroldaliak. Service role kulcs soha nem kerül böngészőbe. Banki callback aláírását minden esetben ellenőrizni kell. Rendelés összege callbackből nem fogadható el vakon; azt az adatbázisban tárolt rendelésből kell validálni.
