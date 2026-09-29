import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  RESERVED_STOREFRONT_ENGINE_IDS,
  SHARED_STOREFRONT_ENGINE_IDS,
  STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY,
  STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY_VERSION,
  validateStorefrontEngineBinding,
  validateStorefrontEngineFunctionalProofRegistry,
} from '@/lib/builder/template-factory/engine-functional-proof-registry';
import {evaluateTemplateFactoryPreflight} from '@/lib/builder/template-factory/procedural-memory';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';

const templateFiles=()=>{
  const root='src/lib/builder/templates';
  const result:string[]=[];
  const walk=(dir:string)=>{
    for(const entry of readdirSync(dir,{withFileTypes:true})){
      const path=join(dir,entry.name);
      if(entry.isDirectory())walk(path);
      else if(/\.tsx?$/.test(entry.name))result.push(path);
    }
  };
  walk(root);
  return result;
};

describe('Control Plane shared engine functional-proof closure',()=>{
  it('registers the full current shared engine catalog and reserves E12 until an explicit future authority exists',()=>{
    expect(STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY_VERSION).toBe('shoporation.storefront-engine-functional-proof-registry.v2');
    expect(SHARED_STOREFRONT_ENGINE_IDS).toEqual(['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E13']);
    expect(RESERVED_STOREFRONT_ENGINE_IDS).toEqual(['E12']);
    const validation=validateStorefrontEngineFunctionalProofRegistry();
    expect(validation.ok,validation.issues.join(',')).toBe(true);
    expect(validation.engineIds).toEqual(SHARED_STOREFRONT_ENGINE_IDS);
  });

  it('requires every registered engine to point at a real source module and proof producer',()=>{
    for(const entry of STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY){
      expect(existsSync(entry.sourceModule),entry.engineId+' source '+entry.sourceModule).toBe(true);
      const producer=entry.proofProducer.split('#')[0];
      expect(existsSync(producer),entry.engineId+' proof '+producer).toBe(true);
      expect(entry.requiredInvariants.length,entry.engineId).toBeGreaterThan(0);
      expect(entry.productionMutationAllowed,entry.engineId).toBe(false);
    }
  });

  it('fails registry validation when any current shared engine loses its proof definition',()=>{
    const incomplete=STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.filter(entry=>entry.engineId!=='E6');
    const validation=validateStorefrontEngineFunctionalProofRegistry(incomplete);
    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain('ENGINE_FUNCTIONAL_PROOF_REQUIRED_ENGINE_MISSING:E6');
  });

  it('fails closed for reserved or unknown engine bindings',()=>{
    expect(validateStorefrontEngineBinding('E2+E12')).toMatchObject({ok:false});
    expect(validateStorefrontEngineBinding('E2+E12').issues).toContain('ENGINE_FUNCTIONAL_PROOF_RESERVED_ENGINE_REFERENCED:E12');
    expect(validateStorefrontEngineBinding('E2+E14').issues).toContain('ENGINE_FUNCTIONAL_PROOF_UNREGISTERED_ENGINE:E14');
  });

  it('proves every engine ID referenced anywhere in canonical template sources is registered',()=>{
    const registered=new Set<string>(SHARED_STOREFRONT_ENGINE_IDS);
    const unknown:{file:string;engineId:string}[]=[];
    const observed=new Set<string>();
    for(const file of templateFiles()){
      const source=readFileSync(file,'utf8');
      for(const engineId of source.match(/\bE\d{1,2}\b/g)??[]){
        observed.add(engineId);
        if(!registered.has(engineId))unknown.push({file,engineId});
      }
    }
    expect(unknown).toEqual([]);
    for(const engineId of SHARED_STOREFRONT_ENGINE_IDS)expect(observed.has(engineId),engineId+' is not referenced by canonical template sources').toBe(true);
  });

  it('blocks Template Factory preflight before implementation when a page binds an unregistered engine',()=>{
    const home=LOOT_VAULT_V2_FACTORY_RECIPE.pageOverrides?.home;
    expect(home).toBeTruthy();
    const badRecipe={
      ...LOOT_VAULT_V2_FACTORY_RECIPE,
      pageOverrides:{
        ...LOOT_VAULT_V2_FACTORY_RECIPE.pageOverrides,
        home:{...home!,metadata:{...(home!.metadata??{}),engineBinding:'E2+E14'}},
      },
    };
    const preflight=evaluateTemplateFactoryPreflight(badRecipe);
    expect(preflight.ok).toBe(false);
    expect(preflight.issues).toContainEqual(expect.objectContaining({
      code:'TF_PREFLIGHT_ENGINE_FUNCTIONAL_PROOF_COVERAGE_REQUIRED',
      path:'pageOverrides.home.metadata.engineBinding',
      message:'ENGINE_FUNCTIONAL_PROOF_UNREGISTERED_ENGINE:E14',
    }));
  });
});
