export type AccountCapabilityKey='overview'|'orders'|'downloads'|'documents'|'wishlist'|'cases'|'returns'|'profile'|'marketing'|'b2bOrganization'|'b2bQuotes'|'loyalty';
export type AccountCapabilityContext={showLoyalty:boolean;showB2BOrganization:boolean;showB2BQuotes:boolean};
export type AccountCapabilityItem={key:AccountCapabilityKey;href:string;label:string;exact?:boolean;optional?:'loyalty'|'b2bOrganization'|'b2bQuotes'};
export const CANONICAL_ACCOUNT_CAPABILITIES:readonly AccountCapabilityItem[]=[
 {key:'overview',href:'/fiokom',label:'Áttekintés',exact:true},
 {key:'orders',href:'/fiokom#rendelesek',label:'Rendeléseim'},
 {key:'downloads',href:'/fiokom/letoltesek',label:'Letöltéseim'},
 {key:'documents',href:'/fiokom/dokumentumok',label:'Dokumentumaim'},
 {key:'wishlist',href:'/fiokom/kivansaglista',label:'Kívánságlista'},
 {key:'cases',href:'/fiokom/ugyek',label:'Ügyeim'},
 {key:'returns',href:'/fiokom/visszakuldes',label:'Visszaküldés'},
 {key:'profile',href:'/fiokom#fiokadatok',label:'Fiókadatok'},
 {key:'marketing',href:'/fiokom#marketing',label:'Marketing beállítások'},
 {key:'b2bOrganization',href:'/fiokom/b2b',label:'B2B szervezet',optional:'b2bOrganization'},
 {key:'b2bQuotes',href:'/fiokom/ajanlatkeresek',label:'Ajánlatkéréseim',optional:'b2bQuotes'},
 {key:'loyalty',href:'/fiokom/huseg',label:'Hűségprogram',optional:'loyalty'},
] as const;
export function resolveAccountCapabilities(c:AccountCapabilityContext){return CANONICAL_ACCOUNT_CAPABILITIES.filter(i=>i.optional==='loyalty'?c.showLoyalty:i.optional==='b2bOrganization'?c.showB2BOrganization:i.optional==='b2bQuotes'?c.showB2BQuotes:true).map(i=>({...i}));}
