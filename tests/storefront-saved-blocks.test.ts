import {describe,expect,it} from 'vitest';
import {
  cloneStorefrontSavedBlockWithFreshIds,
  insertStorefrontSavedBlock,
  parseStorefrontSavedBlockFragment,
} from '@/lib/builder/storefront-saved-blocks';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const fragment:StorefrontComponentNode={
  id:'saved-root',
  componentKey:'layout.section',
  componentVersion:1,
  config:{gap:'m'},
  children:[{
    id:'saved-child',
    componentKey:'content.text',
    componentVersion:1,
    config:{text:'Mentett tartalom'},
  }],
};

const page:StorefrontPageDocument={
  schemaVersion:1,
  pageKey:'home',
  pageType:'home',
  templateKey:'test-template',
  templateVersion:1,
  sections:[{
    id:'existing-root',
    componentKey:'layout.section',
    componentVersion:1,
    config:{},
  }],
};

describe('storefront saved blocks',()=>{
  it('parses a canonical fragment without mutating the source',()=>{
    const source=structuredClone(fragment);
    const parsed=parseStorefrontSavedBlockFragment(source);
    expect(parsed).toEqual(fragment);
    parsed.config.gap='xl';
    expect(source.config.gap).toBe('m');
  });

  it('regenerates every node id and avoids ids already present on the page',()=>{
    const ids=['existing-root','fresh-child'];
    let cursor=0;
    const cloned=cloneStorefrontSavedBlockWithFreshIds(fragment,new Set(['existing-root']),()=>ids[cursor++]??`fresh-${cursor}`);
    expect(cloned.id).not.toBe('saved-root');
    expect(cloned.id).toBe('fresh-child');
    expect(cloned.children?.[0]?.id).not.toBe('saved-child');
    expect(fragment.id).toBe('saved-root');
    expect(fragment.children?.[0]?.id).toBe('saved-child');
  });

  it('inserts a cloned top-level fragment without mutating the current working copy',()=>{
    let counter=0;
    const result=insertStorefrontSavedBlock(page,fragment,{index:0,idFactory:()=>`fresh-${++counter}`});
    expect(result.insertedNodeId).toBe('fresh-1');
    expect(result.document.sections).toHaveLength(2);
    expect(result.document.sections[0]?.id).toBe('fresh-1');
    expect(result.document.sections[0]?.children?.[0]?.id).toBe('fresh-2');
    expect(page.sections).toHaveLength(1);
    expect(page.sections[0]?.id).toBe('existing-root');
  });

  it('rejects duplicate ids inside a stored fragment',()=>{
    expect(()=>parseStorefrontSavedBlockFragment({
      ...fragment,
      children:[{...fragment.children![0],id:'saved-root'}],
    })).toThrow('STOREFRONT_SAVED_BLOCK_NODE_ID_INVALID');
  });

  it('fails closed when the id factory cannot produce a unique valid id',()=>{
    expect(()=>cloneStorefrontSavedBlockWithFreshIds(fragment,new Set(['taken']),()=> 'taken')).toThrow('STOREFRONT_SAVED_BLOCK_ID_GENERATION_FAILED');
  });
});
