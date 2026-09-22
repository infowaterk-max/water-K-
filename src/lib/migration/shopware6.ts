import 'server-only';
import {createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export type ShopwareSourceCredentials={baseUrl:string;accessKeyId:string;secretAccessKey:string};
export type ShopwareStageEntity='catalog'|'categories'|'manufacturers'|'media'|'customers'|'orders'|'promotions';
export type ShopwareStagedRecord={entityType:string;sourceId:string;sourceParentId:string|null;payload:Record<string,unknown>;normalized:Record<string,unknown>;checksum:string};

type JsonObject=Record<string,any>;
const MAX_RESPONSE_BYTES=12_000_000;

function isPrivateIpv4(address:string){
  const parts=address.split('.').map(Number);if(parts.length!==4||parts.some(n=>!Number.isInteger(n)||n<0||n>255))return true;
  const[a,b]=parts;
  return a===0||a===10||a===127||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19))||a>=224;
}
function isPrivateIp(address:string){
  if(isIP(address)===4)return isPrivateIpv4(address);
  const v=address.toLowerCase();
  if(isIP(address)===6)return v==='::'||v==='::1'||v.startsWith('fc')||v.startsWith('fd')||/^fe[89ab]/.test(v)||v.startsWith('::ffff:')&&isPrivateIpv4(v.slice(7));
  return true;
}

export async function assertPublicShopwareUrl(raw:string){
  let url:URL;try{url=new URL(raw)}catch{throw new Error('SHOPWARE_URL_INVALID')}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw new Error('SHOPWARE_URL_HTTPS_REQUIRED');
  if(url.port&&url.port!=='443')throw new Error('SHOPWARE_URL_PORT_NOT_ALLOWED');
  const host=url.hostname.toLowerCase();
  if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local'))throw new Error('SHOPWARE_URL_PRIVATE_HOST');
  const addresses=await lookup(host,{all:true,verbatim:true}).catch(()=>[]);
  if(!addresses.length||addresses.some(entry=>isPrivateIp(entry.address)))throw new Error('SHOPWARE_URL_PRIVATE_HOST');
  url.pathname=url.pathname.replace(/\/+$/,'');
  return url.toString().replace(/\/$/,'');
}

async function fetchJson(url:string,init:RequestInit){
  const response=await fetch(url,{...init,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(12_000)});
  if(response.status>=300&&response.status<400)throw new Error('SHOPWARE_REDIRECT_REJECTED');
  const size=Number(response.headers.get('content-length')??'0');if(size>MAX_RESPONSE_BYTES)throw new Error('SHOPWARE_RESPONSE_TOO_LARGE');
  const text=await response.text();if(text.length>MAX_RESPONSE_BYTES)throw new Error('SHOPWARE_RESPONSE_TOO_LARGE');
  let payload:JsonObject={};try{payload=text?JSON.parse(text):{}}catch{throw new Error('SHOPWARE_RESPONSE_INVALID')}
  if(!response.ok)throw new Error(`SHOPWARE_HTTP_${response.status}`);
  return payload;
}

async function auth(credentials:ShopwareSourceCredentials){
  const baseUrl=await assertPublicShopwareUrl(credentials.baseUrl);
  const payload=await fetchJson(`${baseUrl}/api/oauth/token`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({grant_type:'client_credentials',client_id:credentials.accessKeyId,client_secret:credentials.secretAccessKey})});
  const token=String(payload.access_token??'');if(!token)throw new Error('SHOPWARE_AUTH_FAILED');
  return{baseUrl,token};
}

async function api(baseUrl:string,token:string,path:string,body?:unknown){
  return fetchJson(`${baseUrl}${path}`,{method:body===undefined?'GET':'POST',headers:{accept:'application/json',authorization:`Bearer ${token}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}

async function countEntity(baseUrl:string,token:string,entity:string){
  const result=await api(baseUrl,token,`/api/search/${entity}`,{'limit':1,'total-count-mode':1});
  return Number.isFinite(Number(result.total))?Number(result.total):Array.isArray(result.data)?result.data.length:0;
}

export async function inspectShopware6(credentials:ShopwareSourceCredentials){
  const{baseUrl,token}=await auth(credentials);
  const [versionResult,currencyResult,products,categories,manufacturers,media,customers,orders,promotions]=await Promise.all([
    api(baseUrl,token,'/api/_info/version').catch(()=>({version:'unknown'})),
    api(baseUrl,token,'/api/search/currency',{'limit':5,'filter':[{'type':'equals','field':'isSystemDefault','value':true}]}).catch(()=>({data:[]})),
    countEntity(baseUrl,token,'product'),countEntity(baseUrl,token,'category'),countEntity(baseUrl,token,'product-manufacturer'),countEntity(baseUrl,token,'media'),countEntity(baseUrl,token,'customer'),countEntity(baseUrl,token,'order'),countEntity(baseUrl,token,'promotion'),
  ]);
  const currency=Array.isArray(currencyResult.data)?currencyResult.data[0]??null:null;
  const systemCurrency=String(currency?.isoCode??currency?.shortName??'').toUpperCase()||null;
  const versionPayload=versionResult as JsonObject;
  const summary={version:String(versionPayload.version??versionPayload.shopwareVersion??'unknown'),systemCurrency,counts:{products,categories,manufacturers,media,customers,orders,promotions}};
  const fingerprint=createHash('sha256').update(JSON.stringify({baseUrl,version:summary.version,systemCurrency})).digest('hex');
  return{baseUrl,summary,fingerprint};
}

const plain=(value:unknown)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const translated=(row:JsonObject,key:string)=>row?.translated?.[key]??row?.[key];
const idOf=(row:JsonObject)=>String(row?.id??'').trim();
const checksum=(normalized:Record<string,unknown>)=>createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
const slugify=(name:string,id:string)=>`${name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72)||'termek'}-${id.replace(/-/g,'').slice(0,8)}`;
const safePrice=(row:JsonObject)=>{const p=Array.isArray(row?.price)?row.price[0]:null;return{net:p==null?null:Math.max(0,Math.round(Number(p.net))),gross:p==null?null:Math.max(0,Math.round(Number(p.gross)))}};
const optionLabel=(row:JsonObject)=>{const values=(Array.isArray(row?.options)?row.options:[]).map((o:JsonObject)=>plain(translated(o,'name'))).filter(Boolean);return values.length?values.join(' / '):'Alapváltozat'};

function catalogRecords(rows:JsonObject[]):ShopwareStagedRecord[]{
  const result:ShopwareStagedRecord[]=[];
  for(const row of rows){
    const id=idOf(row);if(!id)continue;
    const parentId=row.parentId?String(row.parentId):null;
    const name=plain(translated(row,'name'))||String(row.productNumber??`Shopware ${id.slice(0,8)}`);
    if(!parentId){
      const normalized={name,slug:slugify(name,id),shortDescription:plain(translated(row,'description')).slice(0,240)||null,description:plain(translated(row,'description'))||null,active:row.active!==false,audience:'retail',featured:false,useCases:[],highlights:[],sourceMetadata:{manufacturer:plain(row?.manufacturer?.translated?.name??row?.manufacturer?.name)||null,categoryIds:Array.isArray(row.categoryIds)?row.categoryIds:[],coverUrl:String(row?.cover?.media?.url??'')||null}};
      result.push({entityType:'product',sourceId:id,sourceParentId:null,payload:{id,productNumber:row.productNumber??null,name,active:row.active!==false,manufacturer:normalized.sourceMetadata,categoryIds:row.categoryIds??[],cover:row.cover?.media?.url??null},normalized,checksum:checksum(normalized)});
    }
    const childCount=Number(row.childCount??0);
    if(parentId||childCount===0){
      const price=safePrice(row),weight=Number(row.weight);
      const normalized={productSourceId:parentId??id,sku:String(row.productNumber??'').trim(),label:optionLabel(row),netPriceHuf:price.net,grossPriceHuf:price.gross,stock:Math.max(0,Math.trunc(Number(row.stock??0))),active:row.active!==false,weightGrams:Number.isFinite(weight)&&weight>0?Math.round(weight*1000):null};
      result.push({entityType:'variant',sourceId:id,sourceParentId:parentId??id,payload:{id,parentId,productNumber:row.productNumber??null,stock:row.stock??0,active:row.active!==false,price:row.price??[],options:(row.options??[]).map((o:JsonObject)=>({id:o.id,name:translated(o,'name')}))},normalized,checksum:checksum(normalized)});
    }
  }
  return result;
}

function genericRecord(entityType:string,row:JsonObject,normalized:Record<string,unknown>):ShopwareStagedRecord|null{
  const sourceId=idOf(row);if(!sourceId)return null;return{entityType,sourceId,sourceParentId:row.parentId?String(row.parentId):null,payload:normalized,normalized,checksum:checksum(normalized)};
}

export async function fetchShopwareStagePage(credentials:ShopwareSourceCredentials,entity:ShopwareStageEntity,page:number,limit:number){
  const{baseUrl,token}=await auth(credentials);
  const map:Record<Exclude<ShopwareStageEntity,'catalog'>,string>={categories:'category',manufacturers:'product-manufacturer',media:'media',customers:'customer',orders:'order',promotions:'promotion'};
  const endpoint=entity==='catalog'?'product':map[entity];
  const associations:Record<string,unknown>=entity==='catalog'?{manufacturer:{},cover:{associations:{media:{}}},options:{}}:entity==='orders'?{orderCustomer:{},lineItems:{}}:{};
  const payload=await api(baseUrl,token,`/api/search/${endpoint}`,{page,limit,'total-count-mode':1,associations});
  const rows=Array.isArray(payload.data)?payload.data as JsonObject[]:[];
  let records:ShopwareStagedRecord[]=[];
  if(entity==='catalog')records=catalogRecords(rows);
  else for(const row of rows){
    let normalized:Record<string,unknown>={};
    if(entity==='categories')normalized={name:plain(translated(row,'name')),parentId:row.parentId??null,active:row.active!==false};
    if(entity==='manufacturers')normalized={name:plain(translated(row,'name')),description:plain(translated(row,'description'))||null,link:String(row.link??'')||null};
    if(entity==='media')normalized={fileName:String(row.fileName??''),fileExtension:String(row.fileExtension??''),mimeType:String(row.mimeType??''),url:String(row.url??'')};
    if(entity==='customers')normalized={customerNumber:String(row.customerNumber??''),email:String(row.email??'').trim().toLowerCase(),firstName:plain(row.firstName),lastName:plain(row.lastName),company:plain(row.company)||null,guest:Boolean(row.guest),active:row.active!==false};
    if(entity==='orders')normalized={orderNumber:String(row.orderNumber??''),orderDateTime:row.orderDateTime??null,amountTotal:Number(row.amountTotal??0),amountNet:Number(row.amountNet??0),shippingTotal:Number(row.shippingTotal??0),customer:{email:String(row?.orderCustomer?.email??'').trim().toLowerCase(),firstName:plain(row?.orderCustomer?.firstName),lastName:plain(row?.orderCustomer?.lastName)},lineItems:(Array.isArray(row.lineItems)?row.lineItems:[]).map((item:JsonObject)=>({id:item.id,label:plain(item.label),quantity:Number(item.quantity??0),unitPrice:Number(item.unitPrice??0),totalPrice:Number(item.totalPrice??0),productId:item.productId??null}))};
    if(entity==='promotions')normalized={name:plain(translated(row,'name')),active:row.active!==false,validFrom:row.validFrom??null,validUntil:row.validUntil??null,useCodes:Boolean(row.useCodes),code:String(row.code??'')||null};
    const entityType:Record<Exclude<ShopwareStageEntity,'catalog'>,string>={categories:'category',manufacturers:'manufacturer',media:'media',customers:'customer',orders:'order',promotions:'promotion'};
    const record=genericRecord(entityType[entity as Exclude<ShopwareStageEntity,'catalog'>],row,normalized);if(record)records.push(record);
  }
  const total=Number.isFinite(Number(payload.total))?Number(payload.total):rows.length;
  return{baseUrl,records,total,sourceRows:rows.length,hasMore:page*limit<total};
}
