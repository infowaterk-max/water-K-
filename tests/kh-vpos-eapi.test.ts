import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');
const kh=read('src/lib/integrations/kh.ts');
const types=read('src/lib/integrations/types.ts');
const attempts=read('src/lib/integrations/payment-attempts.ts');
const orders=read('src/app/api/orders/route.ts');
const retry=read('src/app/api/orders/[id]/retry-payment/route.ts');
const returnRoute=read('src/app/api/payments/kh/return/route.ts');
const onboarding=read('src/lib/commerce/onboarding.ts');
const migration=read('supabase/migrations/20260903102500_kh_vpos_payment_order_numbers.sql');

describe('K&H vPOS eAPI v1.0 contract',()=>{
  it('uses vPOS ID and RSA keys, never the legacy fake secret contract',()=>{
    for(const key of ['KH_VPOS_ID','KH_PRIVATE_KEY','KH_GATEWAY_PUBLIC_KEY','KH_ENVIRONMENT'])expect(kh+onboarding).toContain(key);
    expect(kh).not.toContain('KH_SECRET');
    expect(onboarding).not.toContain('KH_MERCHANT_ID');
    expect(onboarding).toContain('vPOS ID / merchantId');
  });

  it('implements signed eAPI INIT, PROCESS, STATUS and ECHO on sandbox/live endpoints',()=>{
    expect(kh).toContain('https://api.sandbox.khpos.hu/api/v1.0');
    expect(kh).toContain('https://api.khpos.hu/api/v1.0');
    for(const endpoint of ['/payment/init','/payment/process/','/payment/status/','/echo/'])expect(kh).toContain(endpoint);
    expect(kh).toContain("createSign('RSA-SHA256')");
    expect(kh).toContain("createVerify('RSA-SHA256')");
    expect(kh).toContain("returnMethod:'POST'");
    expect(kh).toContain("payOperation:'payment'");
    expect(kh).toContain("payMethod:'card'");
  });

  it('maps authoritative K&H payment statuses fail-closed',()=>{
    expect(kh).toContain("status===4||status===7||status===8");
    expect(kh).toContain("status===3||status===5");
    expect(kh).toContain("status===6");
    expect(kh).toContain("status===10");
    expect(kh).toContain('STATUS response signature invalid');
  });

  it('allocates a numeric max-10-digit provider orderNo per payment attempt',()=>{
    expect(migration).toContain('private.kh_vpos_order_no_seq');
    expect(migration).toContain('maxvalue 9999999999');
    expect(migration).toContain('provider_order_no');
    expect(migration).toContain('PAYMENT_PROVIDER_MISMATCH');
    expect(attempts).toContain('allocatePaymentProviderOrderNo');
    expect(types).toContain('providerOrderNo?:string');
    expect(orders).toContain("payment.code==='kh_card'?await allocatePaymentProviderOrderNo");
    expect(retry).toContain("payment.code==='kh_card'?await allocatePaymentProviderOrderNo");
  });

  it('supports K&H browser return by GET and POST and re-checks STATUS before changing an order',()=>{
    expect(returnRoute).toContain('export async function GET');
    expect(returnRoute).toContain('export async function POST');
    expect(returnRoute).toContain("getPaymentGatewayAdapter('kh').verifyCallback");
    expect(returnRoute).toContain('applyVerifiedPaymentEvent');
    expect(returnRoute).toContain("providerCode:'kh_card'");
    expect(returnRoute).toContain('confirmation_token');
  });
});
