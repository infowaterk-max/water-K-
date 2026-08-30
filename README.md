# Shoperation

**Shoperation = Shop + Operation.** A projekt célja egy újraértékesíthető webshop- és kereskedelmi működtetési platform létrehozása.

A Water-K nem a platform neve és nem technikai alapértelmezett márka. A Water-K a Shoperation egyik referencia-/ügyfél-webáruháza. Platformszintű felületen, dokumentációban és új ügyfél alapértelmezésekben nem használjuk Shoperation helyett.

## Csomagstratégia

A kereskedelmi termék két fő csomagra épül:

- **Shoperation Alap**: teljes értékű, versenyképes webshop. A normál értékesítéshez szükséges termék-, készlet-, rendelés-, visszáru-, ügyfél-, kupon-, marketing-, statisztikai, fizetési, szállítási és ügyfélszolgálati képességeket nem zárjuk mesterségesen Pro mögé.
- **Shoperation Pro**: az Alap fölé épülő üzleti rendszer. Ide tartozik a fejlett CRM, üzleti analitika, automatizálás, beszerzési és cash-flow döntéstámogatás, vezetői analitika, API/haladó integrációk és a beépített **Digitális iroda**.

A Digitális iroda a webshop adminba épített e-mailes és belső kommunikációs munkatér. A normál tranzakciós webshop e-mailek ettől függetlenül az Alap részei maradnak.

A külön használatalapú vagy ügyfélspecifikus képességeket moduláris add-onként kezeljük, nem új csomagszintként.

## Márka- és instance-szabály

- **Shoperation**: platform, operatori rendszer és értékesített termék.
- **Ügyfél-webshop**: külön konfigurált instance saját névvel, arculattal és kapcsolati adatokkal.
- **Water-K**: egy konkrét ügyfél-webshop; Water-K branding kizárólag a Water-K instance publikus és saját kereskedői felületein jelenhet meg.
- Új instance nem örökölhet Water-K nevet, logót, e-mail-identitást vagy marketing szöveget.

## Fejlesztési elv

A production kiadás előtt minden nagy fejlesztési blokk feature ágon és staging környezetben készül, majd build/CI/regressziós ellenőrzés után kerülhet release állapotba.
