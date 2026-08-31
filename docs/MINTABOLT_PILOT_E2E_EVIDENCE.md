# Mintabolt Otthon – semleges Shoperation pilot E2E bizonyíték

Dátum: 2026-08-31
Környezet: staging / pilot-próba, production érintése nélkül
Csomag: Shoperation Alap

## Instance

- slug: `mintabolt-otthon`
- márka: `Mintabolt Otthon`
- státusz: `pilot`
- saját storefront szövegek és márkaszín
- saját support-identitás
- commerce konfiguráció: banki átutalás + személyes átvétel
- ingyenes szállítási küszöb: 30 000 Ft

## Saját termékkatalógus

A staging környezetben talált korábbi ügyfélspecifikus legacy termékadatot kontaminációnak tekintjük, ezért inaktiválásra került és nem része a Shoperation fejlesztési/pilot adatmodelljének. A semleges pilothoz három külön termék aktív:

- `MO-KON-01` – Pamut konyharuha, 2 db-os csomag, 2 499 Ft
- `MO-SZA-01` – Újratölthető szappanadagoló, 500 ml, 2 999 Ft
- `MO-KOS-01` – Rendszerező kosár, M, 3 999 Ft

A publikus katalógus kizárólag aktív terméket és aktív variánst olvas, a merchandising mezők pedig adatbázis-vezéreltek.

## Rendelési E2E mag

Staging adatbázisban létrejött egy valós rendelési tranzakció a provider-semleges RPC-n keresztül:

- rendelési szám: `ORD-20260831-DDC466C2`
- termék: `MO-KOS-01`
- mennyiség: 2 db
- részösszeg: 7 998 Ft
- szállítás: személyes átvétel / 0 Ft
- fizetés: banki átutalás
- végösszeg: 7 998 Ft

A készlet 24-ről 22-re csökkent, tehát a rendelés készletkezelése végrehajtódott.

## Idempotencia

Ugyanazzal az idempotency kulccsal a rendelési kérés másodszor is lefutott. A rendszer nem hozott létre új rendelést, hanem ugyanazt a rendelést adta vissza `idempotency_replayed: true` jelzéssel. A készlet nem csökkent újra.

## Shoperation-neutralitási következtetés

A tesztelt rendelési útvonal semleges SKU-val, termékadattal, instance-szintű szállítási/fizetési konfigurációval és saját brandinggel működött. Ügyfélspecifikus referenciaadat nem szükséges a Shoperation működéséhez.

## Még szükséges a pilot release előtt

- böngészőszintű storefront → kosár → checkout → sikeres rendelés próba az aktuális preview builden
- Alap csomag Pro-only direkt URL/API negatív teszt
- aktuális head teljes test/typecheck/build ellenőrzés
- végső customer-specific contamination audit
- production változtatás csak külön release GO után
