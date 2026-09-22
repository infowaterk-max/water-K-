import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('storefront review evidence safety',()=>{
  test('purchase verification read failure cannot become a false unverified review',()=>{
    const actions=read('src/app/termek/[slug]/actions.ts');
    expect(actions).toContain('error:purchaseError');
    expect(actions).toContain('if(purchaseError)redirect');
    expect(actions).toContain('verified_purchase:Boolean(purchases?.length)');
  });

  test('successful review submission requires returned row evidence',()=>{
    const actions=read('src/app/termek/[slug]/actions.ts');
    expect(actions).toContain(".from('product_reviews').insert(");
    expect(actions).toContain(".select('id').single()");
    expect(actions).toContain('error||!review?.id');
  });
});
