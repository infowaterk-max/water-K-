import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');
const migration=read('supabase/migrations/20260903101000_external_logistics_carrier_matrix.sql');
const settings=read('src/lib/commerce/settings.ts');
const checkout=read('src/components/checkout/checkout-form.tsx');
const orders=read('src/app/api/orders/route.ts');
const display=read('src/lib/order-display.ts');

describe('external logistics carrier matrix',()=>{
  it('contains the six Water-K carrier choices with correct fulfillment kinds',()=>{
    for(const code of ['external_gls_home','external_mpl_home','external_mpl_automata','external_mpl_postapont','external_foxpost','external_gls_parcel']){
      expect(migration).toContain(`'${code}'`);
    }
    expect(migration).toContain("'GLS Házhozszállítás'");
    expect(migration).toContain("'MPL Házhozszállítás'");
    expect(migration).toContain("'Posta / Csomagautomata'");
    expect(migration).toContain("'Postapontok (COOP/MOL)'");
    expect(migration).toContain("'FOXPOST'");
    expect(migration).toContain("'GLS CsomagPont / Automata'");
    expect(migration.match(/'parcel_point'/g)?.length).toBe(4);
    expect(migration.match(/'home_delivery'/g)?.length).toBe(2);
  });

  it('marks external logistics choices in resolved checkout settings',()=>{
    expect(settings).toContain('externalLogistics:boolean');
    expect(settings).toContain("externalLogistics:p.adapterKey==='external_logistics_email'");
  });

  it('collects partner-managed pickup point text without calling a carrier API validator',()=>{
    expect(checkout).toContain("shipping.externalLogistics?");
    expect(checkout).toContain('Átvételi pont / automata');
    expect(orders).toContain('if (!shipping.externalLogistics)');
  });

  it('keeps customer-facing labels and carrier tracking families',()=>{
    for(const code of ['external_gls_home','external_mpl_home','external_mpl_automata','external_mpl_postapont','external_foxpost','external_gls_parcel']){
      expect(display).toContain(code);
    }
    expect(display).toContain("shippingMethod==='external_foxpost'");
    expect(display).toContain("shippingMethod==='external_gls_home'");
    expect(display).toContain("shippingMethod==='external_mpl_home'");
  });
});
