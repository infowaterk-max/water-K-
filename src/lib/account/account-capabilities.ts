export type AccountCapabilityKey='overview'|'orders'|'downloads'|'documents'|'wishlist'|'collection'|'cases'|'returns'|'profile'|'marketing'|'b2bOrganization'|'b2bQuotes'|'loyalty';
export type TemplateAccountCapabilityKey='collection';
export type AccountCapabilityContext={showLoyalty:boolean;showB2BOrganization:boolean;showB2BQuotes:boolean;templateCapabilities?:readonly TemplateAccountCapabilityKey[]};
export type AccountCapabilityItem={key:AccountCapabilityKey;href:string;label:string;exact?:boolean;optional?:'loyalty'|'b2bOrganization'|'b2bQuotes'|'collection'};
export const CANONICAL_ACCOUNT_CAPABILITIES:readonly AccountCapabilityItem[]=[
 {key:'overview',href:'/fiokom',label:'Áttekintés',exact:true},
 {key:'orders',href:'/fiokom#rendelesek',label:'Rendeléseim'},
 {key:'downloads',href:'/fiokom/letoltesek',label:'Letöltéseim'},
 {key:'documents',href:'/fiokom/dokumentumok',label:'Dokumentumaim'},
 {key:'wishlist',href:'/fiokom/kivansaglista',label:'Kívánságlista'},
 {key:'collection',href:'/fiokom/gyujtemenyem',label:'Gyűjteményem',optional:'collection'},
 {key:'cases',href:'/fiokom/ugyek',label:'Ügyeim'},
 {key:'returns',href:'/fiokom/visszakuldes',label:'Visszaküldés'},
 {key:'profile',href:'/fiokom#fiokadatok',label:'Fiókadatok'},
 {key:'marketing',href:'/fiokom#marketing',label:'Marketing beállítások'},
 {key:'b2bOrganization',href:'/fiokom/b2b',label:'B2B szervezet',optional:'b2bOrganization'},
 {key:'b2bQuotes',href:'/fiokom/ajanlatkeresek',label:'Ajánlatkéréseim',optional:'b2bQuotes'},
 {key:'loyalty',href:'/fiokom/huseg',label:'Hűségprogram',optional:'loyalty'},
] as const;

export function resolveAccountCapabilityPreviewView(href:string):string{
 let url:URL;
 try{url=new URL(href,'https://shoporation.local')}catch{return''}
 const hashView:Record<string,string>={rendelesek:'orders',fiokadatok:'profile',marketing:'marketing'};
 const nested=url.pathname.startsWith('/fiokom/')?url.pathname.slice('/fiokom/'.length):'';
 return url.pathname==='/kedvencek'?'wishlist':nested||hashView[url.hash.replace(/^#/,'')]||'';
}

export function resolveTemplateAccountCapabilityOptIns(metadata:unknown):TemplateAccountCapabilityKey[]{
 const record=metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata as Record<string,unknown>:{};
 const raw=Array.isArray(record.accountCapabilities)?record.accountCapabilities:[];
 return [...new Set(raw.filter((value):value is TemplateAccountCapabilityKey=>value==='collection'))];
}

export function resolveAccountCapabilities(c:AccountCapabilityContext){
 const templateCapabilities=new Set(c.templateCapabilities??[]);
 return CANONICAL_ACCOUNT_CAPABILITIES.filter(i=>
  i.optional==='loyalty'?c.showLoyalty
  :i.optional==='b2bOrganization'?c.showB2BOrganization
  :i.optional==='b2bQuotes'?c.showB2BQuotes
  :i.optional==='collection'?templateCapabilities.has('collection')
  :true
 ).map(i=>({...i}));
}
