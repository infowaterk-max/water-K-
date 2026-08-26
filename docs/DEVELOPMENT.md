# Water-K fejlesztési folyamat

## Alapelv

A fejlesztéseket nagyobb, összefüggő csomagokban készítjük. A `main` branchre csak ellenőrzött csomag kerül, így a Vercel éles buildje nem indul el minden apró módosításnál.

## Folyamat

1. Követelmények és aktuális állapot felmérése.
2. Fejlesztés külön branch-en.
3. TypeScript- és architektúra-ellenőrzés.
4. `npm run typecheck` és `npm run build`.
5. Biztonsági és adatmodell-ellenőrzés.
6. Merge a `main` branchre.
7. Egyetlen kontrollált Vercel deployment.
8. Staging smoke test: főoldal, webáruház, termék, kosár, pénztár, fiók, admin, health endpoint.

## Felelősségi határok

### Storefront
Next.js App Router oldalak és React komponensek.

### Commerce core
Kosár, checkout, rendelésvalidáció, termékkatalógus és később adatbázis-tranzakciók.

### Integrációk
A K&H, Foxpost, GLS és MPL külön adaptereken keresztül kapcsolódik. Külső API-specifikáció nélkül nem implementálunk találomra éles kommunikációt.

### Adat és hitelesítés
Supabase PostgreSQL, Auth és RLS. Publikus kliensbe kizárólag publishable/anon kulcs kerülhet; secret/service-role kulcs csak szerveroldalon használható.

## Titkok

API-kulcs, banki secret, SMTP-jelszó, webhook secret vagy bármilyen más credential nem commitolható. A `.env.example` csak változóneveket tartalmaz.
