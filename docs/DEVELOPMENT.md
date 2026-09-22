# Water-K fejlesztési folyamat

## Alapelv

A fejlesztéseket nagyobb, összefüggő csomagokban készítjük. A `main` branchre csak ellenőrzött csomag kerül, így a Vercel éles buildje nem indul el minden apró módosításnál.

## Állandó kódhigiéniai irányelv – tiszta csere

Ha egy működést, architektúrát, komponenst, fájlt vagy megközelítést újraértelmezünk vagy lecserélünk, a régi megoldás nem maradhat bent párhuzamosan „biztonsági másolatként”, félbehagyott kódtöredékként vagy használaton kívüli alternatív útvonalként.

A lezárt megoldásnak egyetlen, egybefüggő és kanonikus implementációt kell alkotnia. A csere része a régi importok, exportok, fájlok, dead code, kikommentelt implementációk, átmeneti adapterek, elavult tesztek és már nem használt dokumentáció eltávolítása is. Kompatibilitási réteg csak akkor maradhat, ha bizonyíthatóan szükséges aktív migrációhoz; ilyenkor explicit eltávolítási feltétel és teszt szükséges hozzá.

Refaktor vagy újraértelmezés csak akkor tekinthető késznek, ha a repository-ban nincs két, egymással versengő „régi” és „új” igazság ugyanarra a feladatra. A cél nem pusztán működő kód, hanem hosszú távon olvasható, követhető, egyértelmű és karbantartható kódbázis.

## Folyamat

1. Követelmények és aktuális állapot felmérése.
2. Fejlesztés külön branch-en.
3. TypeScript- és architektúra-ellenőrzés.
4. `npm run typecheck` és `npm run build`.
5. Biztonsági és adatmodell-ellenőrzés.
6. Kódhigiéniai ellenőrzés: az új megoldás által kiváltott régi fájlok, importok, dead code, ideiglenes kompatibilitási utak és elavult tesztek eltávolítása.
7. Merge a `main` branchre.
8. Egyetlen kontrollált Vercel deployment.
9. Staging smoke test: főoldal, webáruház, termék, kosár, pénztár, fiók, admin, health endpoint.

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
