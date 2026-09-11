import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  SHOPERATION_COMMERCIAL_POLICY,
  getPlanMonthlyNetHuf,
  recommendCheaperCommercialCombination,
} from '../src/lib/plans/commercial-policy';

const root=process.cwd();
const read=(path:string)=>readFileSync(resolve(root,path),'utf8');

describe('Roadmap Block 24 Commercial / Security / Maturity Gate',()=>{
  it('freezes the accepted launch, Founding and trial policy without becoming entitlement authority',()=>{
    expect(getPlanMonthlyNetHuf('alap')).toBe(17990);
    expect(getPlanMonthlyNetHuf('pro')).toBe(39990);
    expect(getPlanMonthlyNetHuf('alap','founding')).toBe(14990);
    expect(getPlanMonthlyNetHuf('pro','founding')).toBe(34990);
    expect(SHOPERATION_COMMERCIAL_POLICY.founding.discountGuaranteeMonths).toBe(12);
    expect(SHOPERATION_COMMERCIAL_POLICY.trial.durationDays).toBe(30);
    expect(SHOPERATION_COMMERCIAL_POLICY.trial.mutatesPersistedPlan).toBe(false);
    expect(SHOPERATION_COMMERCIAL_POLICY.commercialAuthority).toBe('informational-only-entitlements-remain-authoritative');
    expect(SHOPERATION_COMMERCIAL_POLICY.providerContractOwner).toBe('merchant');
  });

  it('flags a cheaper valid fixed-price package but refuses to invent unknown Add-on usage pricing',()=>{
    expect(recommendCheaperCommercialCombination({currentPlan:'pro',requiredFeatures:['catalog'],requiredAddons:[]})).toEqual({
      comparable:true,currentPlan:'pro',recommendedPlan:'alap',currentMonthlyNetHuf:39990,recommendedMonthlyNetHuf:17990,savingsNetHuf:22000,missingAddonPrices:[],
    });
    expect(recommendCheaperCommercialCombination({currentPlan:'pro',requiredFeatures:['advancedAnalytics'],requiredAddons:[]}).recommendedPlan).toBe('pro');
    const ai=recommendCheaperCommercialCombination({currentPlan:'pro',requiredFeatures:['catalog'],requiredAddons:['ai-assistant']});
    expect(ai.comparable).toBe(false);
    expect(ai.missingAddonPrices).toEqual(['ai-assistant']);
    expect(SHOPERATION_COMMERCIAL_POLICY.addons['ai-assistant']).toMatchObject({billingMode:'usage',variableCostRequired:true,fixedMonthlyNetHuf:null,includedCredits:null,overageNetHuf:null});
  });

  it('server-gates AI storefront generation behind the canonical AI Add-on before provider execution',()=>{
    const server=read('src/lib/builder/storefront-ai-generator-server.ts');
    const addonGate=server.indexOf("hasAddon('ai-assistant')");
    const deny=server.indexOf("throw new Error('STOREFRONT_AI_ADDON_REQUIRED')");
    const provider=server.indexOf("fetch('https://ai-gateway.vercel.sh/v1/chat/completions'");
    expect(addonGate).toBeGreaterThan(-1);
    expect(deny).toBeGreaterThan(addonGate);
    expect(provider).toBeGreaterThan(deny);
    expect(server).toContain('requireCurrentStoreContext(\'store.manage\')');
  });

  it('removes direct execution from storefront SECURITY DEFINER trigger guards with byte-identical customer forward SQL',()=>{
    const production=read('supabase/migrations/20260911125000_block24_security_maturity_hardening.sql');
    const customer=read('supabase/customer-baseline/migrations/0018_block24_security_maturity_hardening.sql');
    expect(customer).toBe(production);
    for(const fn of ['storefront_revisions_immutable','storefront_events_immutable','storefront_preview_session_guard']){
      expect(production).toContain(`revoke all on function public.${fn}() from public, anon, authenticated, service_role;`);
    }
  });

  it('forces a fresh customer proof after adding ordered migration 0018 and wires the repository maturity artifact into CI',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as {status:string;freshInstallProofRequired:boolean;proofContractSha256:string|null};
    const migrations=readdirSync(resolve(root,'supabase/customer-baseline/migrations')).filter(name=>name.endsWith('.sql')).sort();
    expect(migrations.at(-1)).toBe('0018_block24_security_maturity_hardening.sql');
    expect(migrations).toHaveLength(18);
    expect(['snapshot-reviewed','ready']).toContain(manifest.status);
    if(manifest.status==='snapshot-reviewed'){
      expect(manifest.freshInstallProofRequired).toBe(true);
      expect(manifest.proofContractSha256).toBeNull();
    }else{
      expect(manifest.freshInstallProofRequired).toBe(false);
      expect(manifest.proofContractSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    const pkg=JSON.parse(read('package.json')) as {scripts:Record<string,string>};
    expect(pkg.scripts['market-ready:gate']).toBe('node scripts/block24-market-ready-gate.mjs');
    const ci=read('.github/workflows/ci.yml');
    expect(ci).toContain('Block 24 market-ready contract');
    expect(ci).toContain('block24-market-ready-contract');
  });
});
