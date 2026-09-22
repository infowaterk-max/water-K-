# Water-K staging ellenőrzési lista

A staging környezet a natív Next.js webáruház ellenőrzésére szolgál. Valódi bankkártyás tranzakció nem indítható, amíg a K&H hivatalos sandbox integrációja és callback-hitelesítése nincs bekötve.

## Deploy előtti kapu

A `main` branchre csak akkor kerülhet a csomag, ha:

1. a TypeScript strict ellenőrzés hibamentes;
2. a Next.js production build hibamentes;
3. nincs WordPress/WooCommerce maradvány az aktív kódbázisban;
4. nincs commitolt secret vagy valódi API-kulcs;
5. a checkout szerveroldalon validálja a termékeket, mennyiséget és összeget;
6. a K&H callback fail-closed állapotban van, amíg nincs hivatalos hitelesítés;
7. minden `/admin/*` útvonal közös admin jogosultsági kapu mögött van;
8. a Supabase publikus táblákon RLS aktív.

## Vercel környezeti változók

A storefront Supabase nélkül is elindulhat stagingben, de a fiók és az admin funkciók aktiválásához szükséges:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vagy legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`

A K&H sandbox aktiválásához később:

- `KH_MERCHANT_ID`
- `KH_SECRET`
- `KH_ENVIRONMENT=test`

A futárintegrációk hitelesítő adatai csak az adott adapter tényleges bekötésekor szükségesek.

## Deploy utáni smoke test

- `/` betöltődik mobilon és asztali nézetben;
- `/webaruhaz` mindhárom kiszerelést mutatja;
- termék kosárba helyezhető;
- `/kosar` mennyiségmódosítás és törlés működik;
- `/penztar` üres kosárral nem küld rendelést;
- céges/viszonteladói rendelésnél cégnév és adószám kötelező;
- `/rendeles-sikeres` csak valid rendelésválasz után érhető el a normál folyamatból;
- `/fiokom` Supabase nélkül kulturált konfigurációs állapotot mutat, Supabase-szel belépést/regisztrációt;
- `/admin` és minden alútvonal csak admin szerepkörrel érhető el;
- `/api/health` nem ad vissza secretet, csak konfigurációs állapotot;
- K&H callback hitelesítés nélkül nem tud rendelést fizetetté tenni.
