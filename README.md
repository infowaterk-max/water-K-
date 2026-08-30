# Water-K Native Platform

A natív Water-K webshop és az abból kialakuló újraértékesíthető webshopmotor fejlesztési ága.

## Csomagstratégia

A kereskedelmi termék két fő csomagra épül:

- **Alap**: teljes értékű, versenyképes webshop. A normál értékesítéshez szükséges termék-, készlet-, rendelés-, visszáru-, ügyfél-, kupon-, marketing-, statisztikai, fizetési, szállítási és ügyfélszolgálati képességeket nem zárjuk mesterségesen Pro mögé.
- **Pro**: az Alap fölé épülő üzleti rendszer. Ide tartozik a fejlett CRM, üzleti analitika, automatizálás, beszerzési és cash-flow döntéstámogatás, vezetői analitika, API/haladó integrációk és a beépített **digitális iroda**.

A digitális iroda a webshop adminba épített e-mailes és belső kommunikációs munkatér. A normál tranzakciós webshop e-mailek ettől függetlenül az Alap részei maradnak.

A külön használatalapú vagy ügyfélspecifikus képességeket moduláris add-onként kezeljük, nem új csomagszintként.

## Fejlesztési elv

A production kiadás előtt minden nagy fejlesztési blokk feature ágon és staging környezetben készül, majd build/CI/regressziós ellenőrzés után kerülhet release állapotba.
