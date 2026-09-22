import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  assertStorefrontTargetedPageChange,
  diffStorefrontPageDocument,
  replaceStorefrontPageNodesById,
} from '@/lib/builder/storefront-targeted-page-change';

const page=(hero='A',other='B'):StorefrontPageDocument=>({
  schemaVersion:1,pageKey:'home',pageType:'home',templateKey:'test.template',templateVersion:1,
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
});
