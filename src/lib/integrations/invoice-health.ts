import 'server-only';
import { randomUUID } from 'node:crypto';
import { getInvoiceProvider } from './invoicing';

export async function verifyInvoiceProviderConnection(code:string):Promise<{ok:boolean;message:string}>{
 if(code!=='szamlazz')return{ok:false,message:'Ehhez a számlázó adapterhez nincs automatikus kapcsolatpróba.'};
 if(!process.env.SZAMLAZZ_AGENT_KEY)return{ok:false,message:'Hiányzik a Számlázz.hu Agent kulcs.'};
 try{
  const provider=getInvoiceProvider(code);
  if(!provider.findInvoiceByExternalId)return{ok:false,message:'A Számlázz.hu adapter nem támogat biztonságos kapcsolatpróbát.'};
  const externalId=`shoperation-connection-${randomUUID()}`;
  await provider.findInvoiceByExternalId(externalId);
  return{ok:true,message:'Számlázz.hu API-kapcsolat és Agent kulcs ellenőrizve. Tesztszámla nem készült.'};
 }catch{
  return{ok:false,message:'A Számlázz.hu API-hitelesítés nem sikerült. Ellenőrizd az Agent kulcsot és a szolgáltatói hozzáférést.'};
 }
}
