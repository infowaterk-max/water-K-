import {describe,it} from 'vitest';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';

describe('diagnostic Loot Vault v2 canonical extraction',()=>{
  it('prints deterministic canonical package JSON in base64 chunks',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const json=JSON.stringify(build.package);
    const base64=Buffer.from(json,'utf8').toString('base64');
    const size=12000;
    const count=Math.ceil(base64.length/size);
    console.log('LV2_CANONICAL_BEGIN:'+count);
    for(let i=0;i<count;i+=1)console.log('LV2_CANONICAL_CHUNK:'+i+':'+base64.slice(i*size,(i+1)*size));
    console.log('LV2_CANONICAL_END:'+Buffer.byteLength(json,'utf8'));
  });
});
