# Water-K Webshop

A Water-K webáruház saját fejlesztéseinek verziókezelt kódbázisa.

## Cél

Ez a repository **nem a teljes WordPress telepítést** tartalmazza. Csak azokat a részeket tartjuk itt, amelyeket mi fejlesztünk és karbantartunk:

- Flatsome child theme módosítások
- egyedi WooCommerce funkciók
- saját pluginok és snippetek
- CSS / JavaScript módosítások
- fejlesztési és telepítési dokumentáció

## Struktúra

```text
wp-content/
  themes/
    waterk-flatsome-child/
  plugins/
    waterk-customizations/
snippets/
docs/
```

## Fejlesztési elv

A módosításokat nagyobb, összefüggő fejlesztési csomagokban készítjük el. Egy csomag lezárásakor ellenőrzés, majd élesítés következik. Nem deployolunk minden apró változtatást külön.

## Biztonság

A repositoryba nem kerülhet:

- `wp-config.php`
- adatbázismentés
- `.env` vagy API-kulcs
- jelszó vagy belépési adat
- WooCommerce vásárlói adat
- `uploads` könyvtár
- cache és backup fájl

## Projekt

- Weboldal: Water-K / waterk.hu
- CMS: WordPress
- Webshop: WooCommerce
- Theme: Flatsome + child theme
