# V24 – Staging és rollout runbook

## Cél

A V24 a felhős kiadás előtti utolsó technikai kapu. A folyamat nem tesz automatikus production deployt és nem futtat automatikus production adatbázis-migrációt.

## 1. Preflight

- `npm ci` vagy lockfile-kompatibilis telepítés
- `npm audit --omit=dev --audit-level=high`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run release:manifest`
- célkörnyezetben `npm run validate:env`

Bármelyik hiba esetén NO-GO.

## 2. Környezetek

### Preview
Feature branch automatikus Vercel preview. Külső integrációk lehetőleg sandbox/test módban.

### Staging
Külön Vercel projekt és külön Supabase projekt javasolt. Production kulcsot stagingben tilos használni.

### Production
Csak explicit emberi jóváhagyás után. A main merge és a production migráció külön művelet.

## 3. Supabase migrációs próba

1. Üres vagy staging projektben alkalmazd a migrációkat sorrendben.
2. Ellenőrizd az RLS-t és service_role grantokat.
3. Futtasd a Supabase security/performance advisorokat.
4. Seed/test adatokkal ellenőrizd a checkout, order, inventory, refund, loyalty és admin read modelleket.
5. Sikertelen migráció esetén állj meg; productionön ne próbáld meg javítás nélkül újrafuttatni.

## 4. Cloud smoke gate

A deploy URL-lel:

`SMOKE_BASE_URL=<deployment-url> npm run smoke`

Kötelező útvonalak: health, főoldal, webáruház, pénztár, bejelentkezés.

## 5. Integrációs smoke

- K&H: sandbox tranzakció + callback idempotencia
- e-mail: teszt címzett és queue feldolgozás
- szállítás: sandbox/mock címke vagy pickup pont lekérés
- számlázás: sandbox/mock számlakérés
- cron/internal worker: `CRON_SECRET` és `COMMUNICATION_WORKER_SECRET` ellenőrzés

Valós ügyfélnek, futárnak vagy számlázónak stagingből ne menjen éles mellékhatás.

## 6. GO / NO-GO

GO csak akkor:

- CI zöld;
- release manifest SHA egyezik a deployolt commit SHA-val;
- environment gate zöld;
- cloud smoke zöld;
- staging migráció teljes;
- nincs kritikus/high security finding;
- rollback terv rögzített;
- V17–V19 governance/readiness kapuk nem jeleznek blokkolást.

## 7. Rollback

Alkalmazás: Vercel előző stabil deployment promote/rollback.

Adatbázis: destruktív automatikus down migration nincs. Hibás forward migration esetén előre elkészített kompenzáló migration vagy backup/PITR restore szükséges. Production adatvesztéssel járó SQL csak külön jóváhagyással.

## 8. Production utáni ellenőrzés

- `/api/health`
- smoke gate
- rendelés és checkout teszt
- integrációs queue-k
- error rate / latency / observability
- V18 post-release session
- szükség esetén V19 recovery governance
