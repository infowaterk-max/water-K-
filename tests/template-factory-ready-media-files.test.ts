import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_TEMPLATE_FACTORY_RECIPES} from '@/lib/builder/template-factory/recipe-registry';

describe('Template Factory ready media physical proof',()=>{
  it('requires every ready template asset to be package-owned and physically present under public/',()=>{
    const invalid:string[]=[];
    for(const recipe of STOREFRONT_TEMPLATE_FACTORY_RECIPES){
      for(const asset of recipe.media.assets){
        if(asset.state!=='ready')continue;
        if(!asset.src.startsWith('/')){
          invalid.push(`${recipe.templateKey}:${asset.key}:not-local:${asset.src}`);
          continue;
        }
        if(!existsSync(resolve(process.cwd(),'public',asset.src.slice(1))))invalid.push(`${recipe.templateKey}:${asset.key}:missing:${asset.src}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('keeps Loot Vault visual slots planned until the actual files exist',()=>{
    const loot=STOREFRONT_TEMPLATE_FACTORY_RECIPES.find(recipe=>recipe.templateKey==='gaming.loot-vault');
    expect(loot).toBeTruthy();
    expect(loot!.media.assets).toHaveLength(14);
    expect(loot!.media.assets.every(asset=>asset.state==='planned')).toBe(true);
  });
});
