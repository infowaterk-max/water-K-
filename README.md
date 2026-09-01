# Shoperation

**Shoperation = Shop + Operation.** A projekt célja egy újraértékesíthető webshop- és kereskedelmi működtetési platform létrehozása.

## Csomagstratégia

A kereskedelmi termék két fő csomagra épül:

- **Shoperation Alap**: teljes értékű, versenyképes webshop. A normál értékesítéshez szükséges termék-, készlet-, rendelés-, visszáru-, ügyfél-, kupon-, marketing-, statisztikai, fizetési, szállítási és ügyfélszolgálati képességeket nem zárjuk mesterségesen Pro mögé.
- **Shoperation Pro**: az Alap fölé épülő üzleti rendszer. Ide tartozik a fejlett CRM, üzleti analitika, automatizálás, beszerzési és cash-flow döntéstámogatás, vezetői analitika, API/haladó integrációk és a beépített **Digitális iroda**.

A Digitális iroda a webshop adminba épített e-mailes és belső kommunikációs munkatér. A normál tranzakciós webshop e-mailek ettől függetlenül az Alap részei maradnak.

A külön használatalapú vagy ügyfélspecifikus képességeket moduláris add-onként kezeljük, nem új csomagszintként.

## Márka- és instance-szabály

- **Shoperation**: platform, operatori rendszer és értékesített termék.
- **Ügyfél-webshop**: külön konfigurált instance saját névvel, arculattal és kapcsolati adatokkal.
- Egy ügyfél márkája kizárólag a saját webshop-instance felületein jelenhet meg; nem kerülhet platformszintű felületre vagy alapértelmezésbe.
- Új instance nem örökölhet más ügyféltől nevet, logót, e-mail-identitást vagy marketing szöveget.

## Fejlesztési elv

A production kiadás előtt minden nagy fejlesztési blokk feature ágon és staging környezetben készül, majd build/CI/regressziós ellenőrzés után kerülhet release állapotba.
