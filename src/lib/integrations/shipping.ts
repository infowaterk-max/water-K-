import type { ShippingProvider } from './types';

type QuoteInput = Parameters<ShippingProvider['quote']>[0];
type ShipmentInput = Parameters<ShippingProvider['createShipment']>[0];
type QuoteResult = ReturnType<ShippingProvider['quote']>;
type ShipmentResult = ReturnType<ShippingProvider['createShipment']>;

abstract class ContractShippingProvider implements ShippingProvider {
  protected abstract readonly providerName: string;
  protected abstract readonly requiredEnv: string[];
  protected readonly implementationReady = false;

  async healthCheck(){
    const missing=this.requiredEnv.filter(name=>!process.env[name]);
    if(missing.length)return{ok:false,message:`${this.providerName}: hiányzó szerveroldali beállítás: ${missing.join(', ')}.`};
    if(!this.implementationReady)return{ok:false,message:`${this.providerName}: a partneri API-adatok jelen vannak, de a hiteles szolgáltatói adapter még nincs élesítve.`};
    return{ok:true,message:`${this.providerName} kapcsolat használatra kész.`};
  }
  async quote(_input: QuoteInput): QuoteResult {throw new Error(`${this.providerName} contract pricing configured outside adapter`)}
  async createShipment(_input: ShipmentInput): ShipmentResult {throw new Error(`${this.providerName} partner API adapter not activated`)}
}

export class FoxpostShipping extends ContractShippingProvider {protected readonly providerName='Foxpost';protected readonly requiredEnv=['FOXPOST_API_KEY']}
export class GlsShipping extends ContractShippingProvider {protected readonly providerName='GLS';protected readonly requiredEnv=['GLS_USERNAME','GLS_PASSWORD','GLS_CLIENT_NUMBER']}
export class MplShipping extends ContractShippingProvider {protected readonly providerName='MPL';protected readonly requiredEnv=['MPL_API_KEY']}
export class DpdShipping extends ContractShippingProvider {protected readonly providerName='DPD';protected readonly requiredEnv=['DPD_USERNAME','DPD_PASSWORD']}
export class ExpressOneShipping extends ContractShippingProvider {protected readonly providerName='Express One';protected readonly requiredEnv=['EXPRESSONE_API_KEY']}
