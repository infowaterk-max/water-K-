import {describe,expect,it} from 'vitest';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';

const page=(pageType:string)=>PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType===pageType)!;
const find=(nodes:readonly StorefrontComponentNode[],id:string):StorefrontComponentNode|undefined=>{
  for(const node of nodes){
    if(node.id===id)return node;
    const nested=find(node.children??[],id);
    if(nested)return nested;
  }
  return undefined;
};

describe('Playroom v19 final visual polish',()=>{
  it('ships authored editorial preview fallbacks without replacing E10 authority',()=>{
    const preview=find(page('blog-index').sections,'playroom-blog-index-preview');
    expect(preview?.componentKey).toBe('editorial.journal-preview');
    expect(preview?.bindings?.items?.path).toBe('content.guides.items');
    const items=preview?.config.items as Array<Record<string,unknown>>;
    expect(items).toHaveLength(3);
    expect(items.every(item=>typeof item.image==='string'&&String(item.image).startsWith('https://images.pexels.com/'))).toBe(true);
    expect(items.every(item=>typeof item.title==='string'&&String(item.title).length>0)).toBe(true);
  });

  it('keeps the legal reading surface inside the dark Playroom visual language',()=>{
    const reading=find(page('legal').sections,'playroom-legal-reading');
    const style=reading?.config.style as Record<string,unknown>;
    expect(style.background).toContain('linear-gradient');
    expect(style.background).not.toBe('#f7fbff');
    expect(style.border).toContain('rgba(78,216,255');
    expect(style.padding).toBe('1.5rem');
  });
});
