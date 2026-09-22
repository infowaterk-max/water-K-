import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('checkout recovery result evidence',()=>{
  test('authenticated checkout recovery cannot report stored without RPC row evidence',()=>{
    const route=read('src/app/api/account/checkout-recovery/route.ts');
    expect(route).toContain('upsert_checkout_recovery_intent_v2');
    expect(route).toContain("const recovery=(data??{})as{id?:string;token?:string;expiresAt?:string}");
    expect(route).toContain("if(!recovery.id)return NextResponse.json({error:'A kosármentés eredménye nem igazolható.'},{status:500})");
    expect(route).toContain('return NextResponse.json({ok:true,stored:true,recovery})');
  });

  test('database recovery upsert returns a concrete recovery id',()=>{
    const sql=read('supabase/migrations/20260901165100_communication_tenant_closure.sql');
    expect(sql).toContain('upsert_checkout_recovery_intent_v2');
    expect(sql).toContain("return jsonb_build_object('id',r.id,'token',r.recovery_token,'expiresAt',r.expires_at)");
  });
});
