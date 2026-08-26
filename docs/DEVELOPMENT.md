# Water-K fejlesztési folyamat

## Alapelv

A fejlesztéseket nagyobb, összefüggő csomagokban készítjük. Nem élesítünk minden apró módosítást külön.

## Javasolt folyamat

1. Aktuális éles állapot és követelmények felmérése.
2. Egy fejlesztési csomag hatókörének meghatározása.
3. Fejlesztés külön branch-en.
4. Kódellenőrzés és kompatibilitási ellenőrzés.
5. Staging / tesztkörnyezet ellenőrzése.
6. Egyetlen kontrollált élesítés.
7. Éles működés ellenőrzése és szükség esetén rollback.

## Felelősségi határok

### Child theme
Megjelenés, Flatsome-integráció, saját CSS/JS és theme-specifikus template módosítások.

### Water-K Customizations plugin
WooCommerce üzleti logika, B2B/B2C szabályok, értesítések, árazási/megjelenítési logika és egyéb theme-től független funkciók.

### WordPress admin / külső pluginok
Az olyan konfigurációk, amelyek nem kódból élnek (WooCommerce beállítások, fizetési/szállítási plugin konfiguráció, UX Builder tartalom), külön dokumentálandók.

## Titkok

API-kulcs, SMTP-jelszó, K&H/khpos hitelesítő adat, webhook secret és bármilyen más credential nem commitolható. Ezek kizárólag a szerver vagy a megfelelő szolgáltató biztonságos konfigurációjában tárolhatók.
