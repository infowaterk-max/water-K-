import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(resolve(process.cwd(),'supabase/migrations/20260903093000_restore_commerce_provider_catalog.sql'),'utf8');

describe('commerce provider catalog repair',()=>{
  it('restores the canonical provider set idempotently without enabling tenant connections',()=>{
    const codes=[
      'szamlazz','bank_transfer','cash_on_delivery','kh_card','stripe','simplepay','barion',
      'custom_payment_api','pickup','foxpost','gls','mpl','dpd','packeta','expressone','custom_shipping_api'
    ];
    for(const code of codes)expect(sql).toContain(`'${code}'`);
    expect(sql).toContain('on conflict(code) do update');
    expect(sql).toContain('commerce_provider_catalog');
    expect(sql).not.toContain('webshop_instance_provider_connections');
    expect(sql).not.toContain('enabled=true');
  });
});
