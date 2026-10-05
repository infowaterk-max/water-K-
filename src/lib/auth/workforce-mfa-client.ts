'use client';

import {createClient} from '@/lib/supabase/browser';
import {resolveWorkforceMfaStep,type WorkforceMfaStep} from '@/lib/auth/workforce-assurance-policy';

export type WorkforceTotpFactor={
  id:string;
  status:string;
  friendlyName:string|null;
};

export type WorkforceMfaClientSnapshot={
  currentLevel:string|null;
  nextLevel:string|null;
  factors:WorkforceTotpFactor[];
};

export type WorkforceTotpEnrollment={
  factorId:string;
  qrCode:string;
  secret:string;
  uri:string;
};

export async function getWorkforceMfaClientSnapshot():Promise<WorkforceMfaClientSnapshot>{
  const supabase=createClient();
  const[aal,factors]=await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if(aal.error)throw aal.error;
  if(factors.error)throw factors.error;
  return{
    currentLevel:aal.data?.currentLevel??null,
    nextLevel:aal.data?.nextLevel??null,
    factors:(factors.data?.totp??[]).map(factor=>({
      id:factor.id,
      status:factor.status,
      friendlyName:factor.friendly_name??null,
    })),
  };
}

export function nextWorkforceMfaStep(snapshot:WorkforceMfaClientSnapshot,requiredFactors:number):WorkforceMfaStep{
  return resolveWorkforceMfaStep({
    requiredFactors,
    verifiedFactorCount:snapshot.factors.filter(factor=>factor.status==='verified').length,
    currentLevel:snapshot.currentLevel,
  });
}

export async function enrollWorkforceTotp(friendlyName:string):Promise<WorkforceTotpEnrollment>{
  const supabase=createClient();
  const result=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName});
  if(result.error)throw result.error;
  const totp=result.data.totp;
  if(!totp)throw new Error('WORKFORCE_TOTP_ENROLLMENT_DATA_MISSING');
  return{
    factorId:result.data.id,
    qrCode:totp.qr_code,
    secret:totp.secret,
    uri:totp.uri,
  };
}

export async function challengeAndVerifyWorkforceTotp(factorId:string,code:string){
  const supabase=createClient();
  const result=await supabase.auth.mfa.challengeAndVerify({factorId,code});
  if(result.error)throw result.error;
  return result.data;
}

export async function unenrollWorkforceTotp(factorId:string){
  const supabase=createClient();
  const result=await supabase.auth.mfa.unenroll({factorId});
  if(result.error)throw result.error;
  return result.data;
}
