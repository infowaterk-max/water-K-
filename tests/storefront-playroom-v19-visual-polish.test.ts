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
const visibleStrings=(nodes:readonly StorefrontComponentNode[]):string[]=>nodes.flatMap(node=>{
  const own=['text','title','copy','description','subtitle','label'].flatMap(key=>typeof node.config[key]==='string'?[String(node.config[key])]:[]);
  return[...own,...visibleStrings(node.children??[])];
});

describe('Playroom v19 final visual polish',()=>{
  it('ships authored editorial preview fallbacks without replacing E10 authority',()=>{
    const preview=find(page('blog-index').sections,'playroom-blog-index-preview');
    expect(preview?.componentKey).toBe('editorial.journal-preview');
    expect(preview?.bindings?.items?.path).toBe('content.guides.items');
    const items=preview?.config.items as Array<Record<string,unknown>>;
    expect(items).toHaveLength(3);
    expect(items.every(item=>typeof item.image==='string'&&String(item.image).startsWith('https://images.pexels.com/'))).toBe(true);
    expect(items.every(item=>typeof item.title==='string'&&String(item.title).length>0)).toBe(true);
    const coop=items.find(item=>item.id==='coop-night');
    expect(String(coop?.image)).toContain('/7987293/');
    expect(String(preview?.bindings?.items?.fallback)).not.toContain('/9071471/');
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

  it('keeps internal architecture vocabulary out of customer-facing template copy',()=>{
    const copy=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.flatMap(item=>visibleStrings(item.sections)).join(' | ');
    for(const internal of ['E13','authority','Semantic slot','template-local','Provider-neutral','lifestyle fotó'])expect(copy).not.toContain(internal);
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

  it('keeps every Playroom v19 footer balanced on mobile',()=>{
    for(const document of PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages){
      const nodes:any[]=[];
      const walk=(items:any[])=>items.forEach(item=>{nodes.push(item);walk(item.children??[])});
      walk(document.sections as any[]);
      const brand=nodes.find(item=>item.id==='playroom-footer-brand');
      const shop=nodes.find(item=>item.id==='playroom-footer-shop');
      const world=nodes.find(item=>item.id==='playroom-footer-world');
      const about=nodes.find(item=>item.id==='playroom-footer-about');
      const social=nodes.find(item=>item.id==='playroom-footer-social');
      expect(brand,document.pageType).toBeTruthy();
      expect(brand?.responsive?.mobile?.gridSpan,document.pageType).toBe(12);
      for(const item of [shop,world,about,social])expect(item?.responsive?.mobile?.gridSpan,document.pageType).toBe(6);
      const footerNavigation=nodes.filter(item=>item.componentKey==='system.navigation'&&String(item.id).startsWith('playroom-footer-'));
      expect(footerNavigation.length,document.pageType).toBeGreaterThan(0);
      for(const navigation of footerNavigation){
        expect(navigation.config.layout,document.pageType+':'+navigation.id).toBe('vertical');
        expect(Array.isArray(navigation.config.items),document.pageType+':'+navigation.id).toBe(true);
        expect((navigation.config.items as unknown[]).length,document.pageType+':'+navigation.id).toBeGreaterThan(0);
      }
      expect(social,document.pageType).toBeTruthy();
    }
  });
  it('keeps every Playroom v19 commerce header compact and reachable on mobile',()=>{
    for(const document of PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages){
      const header=document.sections.find(section=>section.componentKey==='system.commerce-header');
      expect(header,document.pageType).toBeTruthy();
      const inner=header?.config.innerStyle as Record<string,Record<string,unknown>>;
      const brand=header?.config.brandStyle as Record<string,Record<string,unknown>>;
      const logo=header?.config.logoStyle as Record<string,Record<string,unknown>>;
      expect(inner.mobile?.padding,document.pageType).toBe('.5rem .8rem .42rem');
      expect(brand.mobile?.fontSize,document.pageType).toBe('.9rem');
      expect(logo.mobile?.width,document.pageType).toBe('2.1rem');
      const navigation=header?.children?.find(child=>child.componentKey==='system.navigation');
      const navigationStyle=navigation?.config.style as Record<string,Record<string,unknown>>;
      expect(navigationStyle.mobile?.gap,document.pageType).toBe('.65rem');
      expect(navigationStyle.mobile?.fontSize,document.pageType).toBe('.68rem');
      const search=header?.children?.find(child=>child.componentKey==='system.search');
      expect(search?.config.placeholder,document.pageType).toBe('Keresés játékra, konzolra…');
    }
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
