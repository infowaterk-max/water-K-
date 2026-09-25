# Incident Intelligence – Governed Recovery Boundary

A Governed Recovery célja nem egy általános autonóm AI-javító rendszer létrehozása, hanem a már meglévő Incident Intelligence self-healing authority szigorú végrehajtási határának rögzítése.

## Alapelv

`auto` mód nem jelent automatikusan bizonyított végrehajtást.

Az `autoApply=true` csak azt jelenti, hogy az adott recovery request **jogosult** determinisztikus automatikus végrehajtásra. A sikeres végrehajtás külön completion/post-verification evidence-et igényel.

## Auto eligibility

Automatikus jogosultság csak akkor adható, ha egyszerre teljesül:

- a runbook explicit allowlistben szerepel;
- `autoAllowed=true`;
- a kockázat `low`;
- a repair kind `runbook`;
- az actor `system`;
- minden runbook-specifikus precondition teljesül.

Jelenleg az egyetlen ilyen runbook:

`storefront.cache.revalidate`

A runbookhoz kizárólag biztonságos lokális route path fogadható el.

## AI és platform boundary

- Platform operator: proposal-only.
- AI actor: proposal-only.
- Code repair: proposal-only, branch/PR authority.
- Data/configuration/code mutation nem kaphat implicit auto-heal jogot.
- A későbbi AI Control Layer csak ezen authority-n keresztül kérhet recovery-t; nem kerülheti meg.

## Execution semantics

A `registerDeterministicSystemHealingPlan` csak egy auditálható, system-owned auto-eligible recovery plan létrehozásának canonical belépőpontja.

Ez nem állítja azt, hogy a recovery már végrehajtódott. A végrehajtó komponensnek külön:

1. preconditiont kell ellenőriznie;
2. determinisztikusan végre kell hajtania az allowlisted runbookot;
3. post-verificationt kell futtatnia;
4. completion evidence-et kell rögzítenie;
5. sikertelen verifikáció esetén review/rollback útvonalra kell terelnie.

## Release authority

Az Incident Intelligence most explicit `incident-intelligence` medium-risk release subsystem. A Release Risk Budget küszöbei változatlanok.
