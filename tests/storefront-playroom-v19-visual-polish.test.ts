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

  it('removes the rejected couch lifestyle fallback from editorial hero media while preserving article bindings',()=>{
    const indexMedia=find(page('blog-index').sections,'playroom-blog-index-feature-image');
    expect(String(indexMedia?.config.src)).not.toContain('/9071471/');
    expect(String(indexMedia?.config.src)).toContain('/33888375/');

    const articleMedia=find(page('blog-article').sections,'playroom-blog-article-image');
    expect(String(articleMedia?.config.src)).not.toContain('/9071471/');
    expect(String(articleMedia?.config.src)).toContain('/7987293/');
    expect(articleMedia?.bindings?.src?.path).toBe('content.article.image');
    expect(String(articleMedia?.bindings?.src?.fallback)).toContain('/7987293/');
  });

  it('keeps account, faq and contact opening compositions compact instead of repeating stacked status cards',()=>{
    for(const [pageType,sectionId] of [
      ['account','playroom-account-hero'],
      ['faq','playroom-faq-hero'],
      ['contact','playroom-contact-hero'],
    ] as const){
      const opening=page(pageType).sections.find(section=>section.id===sectionId);
      expect(opening?.config.spacing).toBe('s');
    }
    expect(find(page('account').sections,'playroom-account-status')?.children).toHaveLength(3);
    expect(find(page('faq').sections,'playroom-faq-topics')?.children).toHaveLength(3);
    expect(find(page('contact').sections,'playroom-contact-expectations')?.children).toHaveLength(3);
  });

  it('keeps the legal reading surface inside the dark Playroom visual language',()=>{
    const reading=find(page('legal').sections,'playroom-legal-reading');
    const style=reading?.config.style as Record<string,unknown>;
    expect(style.background).toContain('linear-gradient');
    expect(style.background).not.toBe('#f7fbff');
    expect(style.border).toContain('rgba(78,216,255');
    expect(style.padding).toBe('1.4rem');
  });
});
