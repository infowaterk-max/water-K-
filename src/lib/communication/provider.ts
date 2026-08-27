export type CommunicationMessage={to:string;subject:string;templateKey:string;payload:Record<string,unknown>};
export type CommunicationSendResult={providerMessageId:string};
export interface CommunicationProvider{send(message:CommunicationMessage):Promise<CommunicationSendResult>}

class DisabledProvider implements CommunicationProvider{
 async send(_message:CommunicationMessage):Promise<CommunicationSendResult>{throw new Error('COMMUNICATION_PROVIDER_NOT_CONFIGURED');}
}

export function isCommunicationProviderConfigured(){return false;}
export function getCommunicationProvider():CommunicationProvider{return new DisabledProvider();}
