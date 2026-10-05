import 'server-only';
import {createClient} from '@/lib/supabase/server';

export type WorkforceAssuranceSnapshot={
  available:boolean;
  currentLevel:string|null;
  nextLevel:string|null;
  verifiedTotpFactorIds:string[];
};

export async function getWorkforceAssuranceSnapshot():Promise<WorkforceAssuranceSnapshot>{
  try{
    const supabase=await createClient();
    const[aal,factors]=await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    if(aal.error||factors.error)return{available:false,currentLevel:null,nextLevel:null,verifiedTotpFactorIds:[]};
    const verifiedTotp=(factors.data?.totp??[]).filter(factor=>factor.status==='verified');
    return{
      available:true,
      currentLevel:aal.data?.currentLevel??null,
      nextLevel:aal.data?.nextLevel??null,
      verifiedTotpFactorIds:verifiedTotp.map(factor=>factor.id),
    };
  }catch{
    return{available:false,currentLevel:null,nextLevel:null,verifiedTotpFactorIds:[]};
  }
}

export function workforceAssuranceSatisfied(snapshot:WorkforceAssuranceSnapshot,requiredFactors:number){
  if(requiredFactors<=0)return true;
  return snapshot.available&&snapshot.currentLevel==='aal2'&&snapshot.verifiedTotpFactorIds.length>=requiredFactors;
}
