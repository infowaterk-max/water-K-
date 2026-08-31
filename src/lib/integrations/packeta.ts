import 'server-only';
import type { ShippingProvider,ShipmentInput } from './types';

function requireEnv(name:string){const value=process.env[name];if(!value)throw new Error(`${name} required`);return value}
function xmlEscape(value:string){return value.replace(/[<>&'\"]/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[char]??char))}
function tag(name:string,value:string|number|undefined){return value===undefined?'':`<${name}>${xmlEscape(String(value))}</${name}>`}
function extract(xml:string,name:string){return xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]?.trim()??''}
function splitName(name:string){const parts=name.trim().split(/\s+/);return{surname:parts.pop()??name,name:parts.join(' ')||name}}

export class PacketaShipping implements ShippingProvider{
 async healthCheck(){requireEnv('PACKETA_API_KEY');requireEnv('PACKETA_SENDER');const verified=process.env.PACKETA_CONNECTION_VERIFIED==='true';return{ok:verified,message:verified?'Packeta partnerkonfiguráció használatra kész.':'A Packeta kulcs és feladó jelen van, de a partneri tesztelés még nincs jóváhagyva.'}}
 async quote(){throw new Error('Packeta díjszámítás a webshop szerződéses díjtáblájából történik')}
 async createShipment(input:ShipmentInput){
  const password=requireEnv('PACKETA_API_KEY'),sender=requireEnv('PACKETA_SENDER');if(input.kind==='parcel_point'&&!input.parcelPointId)throw new Error('Packeta parcel point required');
  const person=splitName(input.customer.name),addressId=input.parcelPointId??process.env.PACKETA_HOME_DELIVERY_ID;if(!addressId)throw new Error('Packeta delivery service/addressId required');
  const body=`<createPacket><apiPassword>${xmlEscape(password)}</apiPassword><packetAttributes>${tag('number',input.orderId)}${tag('name',person.name)}${tag('surname',person.surname)}${tag('email',input.customer.email)}${tag('phone',input.customer.phone)}${tag('addressId',addressId)}${tag('value',input.declaredValueHuf)}${tag('weight',Math.max(input.weightGrams/1000,0.01).toFixed(3))}${tag('eshop',sender)}</packetAttributes></createPacket>`;
  const response=await fetch('https://www.zasilkovna.cz/api/rest',{method:'POST',headers:{'content-type':'application/xml; charset=utf-8'},body,cache:'no-store'}),raw=await response.text();if(!response.ok)throw new Error(`Packeta API error (${response.status})`);const status=extract(raw,'status');if(status&&status.toLowerCase()!=='ok')throw new Error(`Packeta createPacket failed: ${extract(raw,'fault')||extract(raw,'string')||status}`);const packetId=extract(raw,'result')||extract(raw,'id');if(!packetId)throw new Error('Packeta packet id missing');return{trackingNumber:`Z${packetId.replace(/^Z/i,'')}`,providerReference:packetId};
 }
}
