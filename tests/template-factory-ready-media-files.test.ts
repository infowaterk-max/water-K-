import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_TEMPLATE_FACTORY_RECIPES} from '@/lib/builder/template-factory/recipe-registry';

describe('Template Factory ready media physical proof',()=>{
  it('requires every ready local media asset to exist under public/',()=>{
    const missing:string[]=[];
    for(const recipe of STOREFRONT_TEMPLATE_FACTORY_RECIPES){
      for(const asset of recipe.media.assets){
        if(asset.state!=='ready'||!asset.src.startsWith('/'))continue;
        if(!existsSync(resolve(process.cwd(),'public',asset.src.slice(1))))missing.push(`${recipe.templateKey}:${asset.key}:${asset.src}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('does not confuse planned slots with ready physical assets',()=>{
    const loot=STOREFRONT_TEMPLATE_FACTORY_RECIPES.find(recipe=>recipe.templateKey==='gaming.loot-vault');
    expect(loot).toBeTruthy();
    expect(loot!.media.assets).toHaveLength(14);
    expect(loot!.media.assets.every(asset=>asset.state==='planned')).toBe(true);
  });
});
