import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Digital Commerce and document customer baseline parity',()=>{
  test.each([
    ['supabase/migrations/20260914130000_digital_commerce_foundation.sql','supabase/customer-baseline/migrations/0024_digital_commerce_foundation.sql'],
    ['supabase/migrations/20260914131500_digital_commerce_admin_hardening.sql','supabase/customer-baseline/migrations/0025_digital_commerce_admin_hardening.sql'],
    ['supabase/migrations/20260914131500_order_customer_document_vault.sql','supabase/customer-baseline/migrations/0026_order_customer_document_vault.sql'],
    ['supabase/migrations/20260914133000_digital_fulfillment_checkout_closure.sql','supabase/customer-baseline/migrations/0027_digital_fulfillment_checkout_closure.sql'],
    ['supabase/migrations/20260914133500_digital_order_lifecycle_closure.sql','supabase/customer-baseline/migrations/0028_digital_order_lifecycle_closure.sql'],
    ['supabase/migrations/20260914145500_product_documents_foundation.sql','supabase/customer-baseline/migrations/0029_product_documents_foundation.sql'],
    ['supabase/migrations/20260914150000_product_documents_runtime_hardening.sql','supabase/customer-baseline/migrations/0030_product_documents_runtime_hardening.sql'],
  ])('mirrors %s into the customer forward baseline',(production,customer)=>{
    expect(read(customer)).toBe(read(production));
  });

  test('records the successful empty-target Fresh Install proof for the current baseline contract',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'))as{status?:string;freshInstallProofRequired?:boolean;proofContractSha256?:string|null;notes?:string};
    expect(manifest.status).toBe('ready');
    expect(manifest.freshInstallProofRequired).toBe(false);
    expect(manifest.proofContractSha256).toBe('49dade94a34dccea12de8ab22a8cc90b412cab69d8601734156dfb72655c81a7');
    expect(manifest.notes).toContain('0030_product_documents_runtime_hardening.sql');
    expect(manifest.notes).toContain('b53067ff76fb6a0804f1b8becfe22f4168f59517');
    expect(manifest.notes).toContain('Production remained untouched');
  });
});
