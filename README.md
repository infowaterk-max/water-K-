# Water-K Webshop

A Water-K teljesen saját fejlesztésű webáruháza. A projekt nem használ WordPresst, WooCommerce-t vagy Flatsome sablont.

## Technológia

- Next.js 15 App Router
- React 19 + TypeScript
- Supabase PostgreSQL + Auth + RLS
- Vercel hosting és staging
- közvetlen szolgáltatói integrációs réteg K&H, Foxpost, GLS és MPL számára

## Fő modulok

- publikus Water-K storefront
- termékkatalógus és termékoldalak
- saját kosár és pénztár
- B2C / céges / viszonteladói rendelési modell
- saját felhasználói fiók
- saját adminfelület
- fizetési és szállítási adapterek
- Supabase adatmodell és jogosultságkezelés

## Fejlesztési folyamat

A fejlesztés nagy, összefüggő csomagokban történik. A változtatásokat külön branch-en készítjük és ellenőrizzük; a `main` branch csak ellenőrzött csomagot kap, így a Vercel production deployment nem indul el minden apró módosításnál.

## Környezeti változók

A szükséges változók mintája a `.env.example` fájlban található. Valódi API-kulcs, banki secret vagy Supabase secret soha nem kerülhet GitHubba.

## Biztonsági alapelvek

- a kliensoldal soha nem kap Supabase secret/service-role kulcsot;
- a rendelési összegeket és készletet szerveroldalon újraszámoljuk;
- banki callback csak hitelesített szolgáltatói válasz alapján jelölhet rendelést fizetettnek;
- admin jogosultság Supabase `app_metadata` alapján történik;
- publikus adatbázistáblákon RLS van engedélyezve.
