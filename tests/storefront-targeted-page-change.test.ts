import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  assertStorefrontTargetedPageChange,
  diffStorefrontPageDocument,
  replaceStorefrontPageNodesById,
} from '@/lib/builder/storefront-targeted-page-change';

const page=(hero='A',other='B'):StorefrontPageDocument=>({
  schemaVersion:1,pageKey:'home',pageType:'home',templateKey:'test.template',templateVersion:1,
  metadata:{locale:'hu'},
  sections:[
    {id:'hero',componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'stretch',justify:'start',style:{minHeight:'10rem'}},children:[
      {id:'hero-title',componentKey:'content.heading',componentVersion:1,config:{text:hero,level:1,align:'left',tone:'text'}},
    ]},
    {id:'other',componentKey:'content.text',componentVersion:1,config:{text:other,as:'p',align:'left',tone:'text'}},
  ],
});

describe('Storefront targeted Page Schema change guard',()=>{
  it('patches only the requested subtree and preserves unrelated persisted state byte-for-byte',()=>{
    const current=page('Current hero','Merchant-specific other');
    const source=page('New canonical hero','Factory other');
    const after=replaceStorefrontPageNodesById({current,source,nodeIds:['hero']});
    expect((after.sections[0]?.children?.[0]?.config as Record<string,unknown>).text).toBe('New canonical hero');
    expect((after.sections[1]?.config as Record<string,unknown>).text).toBe('Merchant-specific other');
    const diff=diffStorefrontPageDocument(current,after);
    expect(diff.changedNodeIds).toEqual(['hero-title']);
    expect(diff.insertedNodeIds).toEqual([]);
    expect(diff.removedNodeIds).toEqual([]);
    expect(()=>assertStorefrontTargetedPageChange({before:current,after,allowedNodeIds:['hero']})).not.toThrow();
  });

  it('fails closed if an unrelated node changes during a targeted polish',()=>{
    const before=page();
    const after=page('Changed hero','Unexpected other');
    expect(()=>assertStorefrontTargetedPageChange({before,after,allowedNodeIds:['hero']}))
      .toThrow('STOREFRONT_TARGETED_CHANGE_SCOPE_VIOLATION:other');
  });

  it('fails closed on page metadata/template identity drift unless explicitly authorized',()=>{
    const before=page();
    const after={...page(),metadata:{unexpected:true}};
    expect(()=>assertStorefrontTargetedPageChange({before,after,allowedNodeIds:['hero']}))
      .toThrow('STOREFRONT_TARGETED_CHANGE_PAGE_FIELDS');
  });

  it('allows an explicitly scoped metadata marker alongside a targeted node patch',()=>{
    const current=page('Current hero','Merchant-specific other');
    const source=page('Canonical hero','Factory other');
    const after=replaceStorefrontPageNodesById({
      current,
      source,
      nodeIds:['hero'],
      metadataPatch:{responsiveAuthorityVersion:'shoporation.storefront-responsive-authority.v2'},
    });
    const diff=diffStorefrontPageDocument(current,after);
    expect(diff.changedNodeIds).toEqual(['hero-title']);
    expect(diff.changedPageFields).toEqual([]);
    expect(diff.changedMetadataKeys).toEqual(['responsiveAuthorityVersion']);
    expect(after.metadata).toEqual({
      locale:'hu',
      responsiveAuthorityVersion:'shoporation.storefront-responsive-authority.v2',
    });
  });

  it('fails closed when metadata drifts outside the explicit allowlist',()=>{
    const before=page();
    const after={...page(),metadata:{locale:'hu',responsiveAuthorityVersion:'shoporation.storefront-responsive-authority.v2',unexpected:true}};
    expect(()=>assertStorefrontTargetedPageChange({
      before,
      after,
      allowedNodeIds:['hero'],
      allowedMetadataKeys:['responsiveAuthorityVersion'],
    })).toThrow('STOREFRONT_TARGETED_CHANGE_METADATA_SCOPE_VIOLATION:unexpected');
  });

  it('rejects prototype-sensitive metadata keys in a targeted patch',()=>{
    const patch=Object.create(null) as Record<string,unknown>;
    patch.__proto__='forbidden';
    expect(()=>replaceStorefrontPageNodesById({
      current:page(),
      source:page(),
      nodeIds:['hero'],
      metadataPatch:patch,
    })).toThrow('STOREFRONT_TARGETED_CHANGE_METADATA_KEY_FORBIDDEN:__proto__');
  });

  it('requires acceptance draft mutation routes to invoke the canonical targeted Page Schema guard',async()=>{
    const root=path.join(process.cwd(),'src','app','api','acceptance');
    const collect=async(dir:string):Promise<string[]>=>{
      let entries;
      try{entries=await readdir(dir,{withFileTypes:true});}
      catch(error){
        if((error as NodeJS.ErrnoException).code==='ENOENT')return[];
        throw error;
      }
      const files:string[]=[];
      for(const entry of entries){
        const full=path.join(dir,entry.name);
        if(entry.isDirectory())files.push(...await collect(full));
        else if(entry.isFile()&&entry.name.endsWith('.ts'))files.push(full);
      }
      return files;
    };
    for(const file of await collect(root)){
      const source=await readFile(file,'utf8');
      if(!source.includes('save_storefront_page_draft_v1'))continue;
      expect(
        source.includes('assertStorefrontTargetedPageChange(')
        ||source.includes('replaceStorefrontPageNodesById(')
        ||source.includes('saveCurrentStorefrontTargetedPageDraft('),
        `Acceptance draft mutation bypasses canonical targeted guard: ${path.relative(process.cwd(),file)}`,
      ).toBe(true);
    }
  });

});
