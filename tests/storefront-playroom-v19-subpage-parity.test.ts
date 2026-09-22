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
const style=(pageType:string,id:string)=>find(page(pageType).sections,id)?.config.style as Record<string,unknown>|undefined;

describe('Playroom v19 reference subpage parity',()=>{
  it('keeps the three acceptance archetypes on the accepted Home grammar',()=>{
    for(const pageType of ['catalog','product','blog-article']){
      expect(page(pageType).metadata?.homeParityGrammar).toBe(true);
      expect(page(pageType).metadata?.compactMedia).toBe(true);
      expect(page(pageType).metadata?.subpageParityRelease).toBe('playroom-v19-reference-archetypes-v2');
    }
  });

  it('caps decorative catalog and editorial media instead of letting it dominate the page',()=>{
    expect(style('catalog','playroom-catalog-hero-image')?.maxHeight).toBe('16.5rem');
    expect(style('blog-article','playroom-blog-article-image')?.maxHeight).toBe('19rem');
    expect(style('product','playroom-product-story-image')?.maxHeight).toBe('16rem');
  });

  it('makes the catalog denser while preserving real catalog authority',()=>{
    const grid=find(page('catalog').sections,'playroomCatalogGrid');
    expect(grid?.bindings?.products?.path).toBe('catalog.existingCommerceProducts');
    expect(grid?.config.columns).toBe(4);
    expect(find(page('catalog').sections,'playroom-catalog-platform-navigation')?.componentKey).toBe('guided.attribute-navigation');
  });

  it('compresses product media without replacing product, pricing or compatibility authority',()=>{
    const gallery=find(page('product').sections,'playroom-product-gallery');
    expect(gallery?.bindings?.images?.path).toBe('product.gallery');
    expect(gallery?.config.aspectRatio).toBe('16 / 10');
    const main=(gallery?.config.styleSlots as Record<string,{base?:Record<string,unknown>}>).main?.base;
    expect(main?.maxHeight).toBe('25rem');
    expect(find(page('product').sections,'playroom-product-info')?.bindings?.price?.path).toBe('pricing.displayPrice');
    expect(find(page('product').sections,'playroom-product-compatibility')?.bindings?.items?.path).toBe('compatibility.productEvidence');
  });

  it('keeps editorial copy and image merchant-content bound',()=>{
    expect(find(page('blog-article').sections,'playroom-blog-article-title')?.bindings?.text?.path).toBe('content.article.title');
    expect(find(page('blog-article').sections,'playroom-blog-article-body-copy')?.bindings?.text?.path).toBe('content.article.body');
    expect(find(page('blog-article').sections,'playroom-blog-article-image')?.bindings?.src?.path).toBe('content.article.image');
  });
});
