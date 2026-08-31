import 'server-only';

export type ProviderRequirement={key:string;label:string;secret:boolean};
export type ProviderGuide={contract:string;requirements:ProviderRequirement[];verification:string;notes?:string};

const guides:Record<string,ProviderGuide>={
 kh_card:{contract:'K&H e-commerce elfogadói szerződés és aktív kereskedői fiók.',requirements:[{key:'KH_MERCHANT_ID',label:'Kereskedőazonosító',secret:false},{key:'KH_SECRET',label:'API titkos kulcs',secret:true}],verification:'Kereskedőazonosító és titkos kulcs meglétének, majd a gateway-kapcsolatnak az ellenőrzése.'},
 stripe:{contract:'Aktív Stripe kereskedői fiók. Külön Shoperation-szerződés nem szükséges.',requirements:[{key:'STRIPE_SECRET_KEY',label:'Secret key',secret:true},{key:'STRIPE_WEBHOOK_SECRET',label:'Webhook signing secret',secret:true}],verification:'Szerveroldali Stripe API-kapcsolat és webhook aláírás ellenőrzése.'},
 simplepay:{contract:'OTP SimplePay kereskedői szerződés és éles merchant hozzáférés.',requirements:[{key:'SIMPLEPAY_MERCHANT',label:'Merchant azonosító',secret:false},{key:'SIMPLEPAY_SECRET_KEY',label:'Titkos kulcs',secret:true}],verification:'Merchant konfiguráció és SimplePay API-kapcsolat ellenőrzése.'},
 barion:{contract:'Aktív Barion shop szükséges. A webshop közvetlenül a Barionnal szerződik.',requirements:[{key:'BARION_POS_KEY',label:'Titkos POSKey',secret:true},{key:'BARION_PAYEE_EMAIL',label:'Barion shop / kedvezményezett e-mail',secret:false}],verification:'A Shoperation ellenőrzi a Barion API elérését. A callback csak értesítés: a fizetési státuszt minden esetben a Barion PaymentState API-ból kérjük vissza.',notes:'Sandbox és éles környezet külön konfigurálható. A Barion callback URL-nek publikus HTTPS címen elérhetőnek kell lennie.'},
 foxpost:{contract:'Aktív FOXPOST üzleti szerződés/API-hozzáférés, ha automatizált címkekészítés szükséges.',requirements:[{key:'FOXPOST_API_KEY',label:'API kulcs',secret:true}],verification:'FOXPOST API-hozzáférés ellenőrzése.'},
 gls:{contract:'Aktív GLS üzleti szerződés és API-hozzáférés.',requirements:[{key:'GLS_USERNAME',label:'API felhasználó',secret:false},{key:'GLS_PASSWORD',label:'API jelszó',secret:true},{key:'GLS_CLIENT_NUMBER',label:'Ügyfélszám',secret:false}],verification:'GLS hitelesítés és szállítási API-kapcsolat ellenőrzése.'},
 mpl:{contract:'Aktív MPL üzleti szerződés/API-hozzáférés az automatizált feladáshoz.',requirements:[{key:'MPL_API_KEY',label:'API hozzáférés',secret:true}],verification:'MPL API-hozzáférés ellenőrzése.'},
 dpd:{contract:'Aktív DPD üzleti szerződés és API-hozzáférés.',requirements:[{key:'DPD_USERNAME',label:'API felhasználó',secret:false},{key:'DPD_PASSWORD',label:'API jelszó',secret:true}],verification:'DPD hitelesítés és API-kapcsolat ellenőrzése.'},
 packeta:{contract:'Aktív Packeta üzleti fiók és API-hozzáférés.',requirements:[{key:'PACKETA_API_KEY',label:'API kulcs',secret:true}],verification:'Packeta API-kulcs és kapcsolat ellenőrzése.'},
 expressone:{contract:'Aktív Express One üzleti szerződés és integrációs hozzáférés.',requirements:[{key:'EXPRESSONE_API_KEY',label:'API hozzáférés',secret:true}],verification:'Express One integrációs kapcsolat ellenőrzése.'},
};

export function getProviderGuide(code:string,connectionMode:string):ProviderGuide{
 if(guides[code])return guides[code];
 if(connectionMode==='manual')return{contract:'Ehhez a módhoz nincs kötelező API-szerződés a Shoperationben.',requirements:[],verification:'A mód adminisztratív aktiválása elegendő.'};
 return{contract:'A választott szolgáltatóval közvetlenül kell szerződni vagy API-hozzáférést kérni.',requirements:[],verification:'Az adapterhez szükséges hitelesítő adatok és egy sikeres kapcsolatpróba szükséges.',notes:'Egyedi szolgáltatónál az adapter specifikációját a szolgáltató API-dokumentációja alapján kell megadni.'};
}

export function configuredEnvironmentFields(requirements:ProviderRequirement[]){return requirements.filter(item=>Boolean(process.env[item.key])).map(item=>item.key)}
