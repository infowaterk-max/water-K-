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

  test('keeps Fresh Install proof state fail-closed for the current baseline contract',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'))as{status?:string;freshInstallProofRequired?:boolean;proofContractSha256?:string|null;notes?:string};
    expect(['ready','snapshot-reviewed']).toContain(manifest.status);
    if(manifest.status==='ready'){
      expect(manifest.freshInstallProofRequired).toBe(false);
      expect(manifest.proofContractSha256).toMatch(/^[a-f0-9]{64}$/);
    }else{
      expect(manifest.freshInstallProofRequired).toBe(true);
      expect(manifest.proofContractSha256).toBeNull();
    }
    expect(manifest.notes).toContain('0001-0018');
    expect(manifest.notes).toContain('0034_product_documents_merchant_workflow.sql');
    expect(manifest.notes).toContain('Production remained untouched');
  });
});
