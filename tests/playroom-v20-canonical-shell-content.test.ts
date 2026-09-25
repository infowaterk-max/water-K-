import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import {applyStorefrontTemplateDemoContent,applyStorefrontTemplateDemoNotice,getStorefrontTemplateDemoContent,STOREFRONT_DEMO_CONTENT_NOTICE} from '@/lib/builder/storefront-template-route-integrity';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);

const account=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
const content=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='content')!;

describe('Playroom v20 canonical shell and content contract',()=>{
  it('uses one identical commerce header and footer across every page preset',()=>{
    const header=JSON.stringify(account.sections[0]);
    const footer=JSON.stringify(account.sections.at(-1));
    expect(account.sections[0]?.componentKey).toBe('system.commerce-header');
    for(const page of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){
      expect(JSON.stringify(page.sections[0]),page.pageType).toBe(header);
      expect(JSON.stringify(page.sections.at(-1)),page.pageType).toBe(footer);
    }
  });

  it('uses the generic readable information archetype for content pages',()=>{
    const ids=content.sections.map(section=>section.id);
    expect(ids).toContain('playroom-content-information-intro');
    expect(ids).toContain('playroom-content-information-body-section');
    expect(ids).not.toContain('playroom-content-feature-preset');
    const serialized=JSON.stringify(content);
    expect(serialized).toContain('"demoContentRole":"title"');
    expect(serialized).toContain('"demoContentRole":"summary"');
    expect(serialized).toContain('"demoContentRole":"body"');
    expect(serialized).toContain('whiteSpace');
    expect(serialized).toContain('pre-line');
  });

  it('keeps the accepted Playroom shell while exposing the complete information footer',()=>{
    for(const page of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const header=nodes.find(node=>node.componentKey==='system.commerce-header');
      expect(header,page.pageType).toBeTruthy();
      expect(nodes.some(node=>node.id==='playroom-account-nav')).toBe(true);
      const footerHrefs=nodes.filter(node=>node.id.startsWith('playroom-footer-')&&node.componentKey==='system.navigation')
        .flatMap(node=>((node.config.items??[]) as {href?:string}[]).map(item=>item.href));
      for(const href of ['/aszf','/adatvedelem','/impresszum','/szallitas-es-fizetes','/kapcsolat','/gyik'])expect(footerHrefs).toContain(href);
    }
  });

  it('keeps the accepted Playroom Contact composition on a continuous dark canvas with the shared topic-first wizard',()=>{
    const page=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='contact')!;
    const nodes=walk(page.sections);
    expect(nodes.some(node=>node.id==='playroom-contact-options-preset')).toBe(true);
    expect(nodes.some(node=>node.componentKey==='support.contact-form')).toBe(true);
    const surface=nodes.find(node=>node.id==='playroom-contact-form-surface');
    expect(surface).toBeTruthy();
    expect(JSON.stringify(surface?.config.style)).toContain('#020b17');
    const sharedForm=nodes.find(node=>node.id==='playroom-contact-form');
    expect(sharedForm?.componentKey).toBe('support.contact-form');
    expect(sharedForm?.config.style).toBeUndefined();
  });

  it('preserves the accepted Playroom account card language while exposing the complete customer workspace',()=>{
    const page=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='account')!;
    const nodes=walk(page.sections);
    expect(nodes.some(node=>node.id==='playroom-account-navigation-presets')).toBe(true);
    for(const id of ['orders','favorites','profile','downloads','documents','cases','returns','marketing','loyalty']){
      expect(nodes.some(node=>node.id===`playroom-account-${id}`),id).toBe(true);
    }
    expect(nodes.some(node=>node.id==='playroom-account-capability-navigation')).toBe(false);
    const hrefs=nodes.filter(node=>node.componentKey==='content.button').map(node=>String(node.config.href??''));
    for(const href of ['/fiokom#rendelesek','/fiokom/kivansaglista','/fiokom/letoltesek','/fiokom/dokumentumok','/fiokom/ugyek','/fiokom/visszakuldes','/fiokom#fiokadatok','/fiokom#marketing','/fiokom/huseg']){
      expect(hrefs).toContain(href);
    }
  });

  it('locks the three PO-observed shell regressions before reacceptance',()=>{
    for(const page of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){
      const header=walk(page.sections).find(node=>node.componentKey==='system.commerce-header');
      const cart=((header?.config.utilityItems??[]) as {label?:string;href?:string;symbol?:string}[]).find(item=>item.href==='/kosar');
      expect(cart?.label,page.pageType).toBe('Kosár');
      expect(cart?.symbol,page.pageType).toBe('🛒');
    }
    const home=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='home')!;
    const featured=walk(home.sections).find(node=>node.id==='playroomFeaturedGames');
    expect((featured?.config.styleSlots as any).card.mobile.minWidth).toBe('15rem');
    const catalog=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='catalog')!;
    const grid=walk(catalog.sections).find(node=>node.id==='playroomCatalogGrid');
    expect(grid?.config.ctaAction).toBe('add-to-cart');
    expect(grid?.config.ctaLabel).toBe('Kosárba');
    expect((grid?.config.styleSlots as any).grid.mobile.gridTemplateColumns).toBe('1fr');
  });

  it('ships a connected Playroom product–collection–editorial world instead of isolated demo prose',()=>{
    const fixtures=PLAYROOM_V20_TEMPLATE_PACKAGE.demoFixtures??[];
    const products=fixtures.filter(item=>item.entityType==='product'&&item.payload.installAsDemoProduct===true);
    const collections=fixtures.filter(item=>item.entityType==='collection');
    const editorial=fixtures.filter(item=>item.entityType==='content'&&item.payload.showroomReady===true);
    expect(products.length).toBeGreaterThanOrEqual(12);
    expect(collections.length).toBeGreaterThanOrEqual(6);
    expect(editorial.length).toBeGreaterThanOrEqual(12);
    for(const product of products){
      expect(Array.isArray(product.payload.relatedProducts),product.entityKey).toBe(true);
      expect(Array.isArray(product.payload.relatedContent),product.entityKey).toBe(true);
      expect((product.payload.relatedProducts as unknown[]).length,product.entityKey).toBeGreaterThan(0);
      expect((product.payload.relatedContent as unknown[]).length,product.entityKey).toBeGreaterThan(0);
    }
    for(const collection of collections){
      expect(Array.isArray(collection.payload.products),collection.entityKey).toBe(true);
      expect(Array.isArray(collection.payload.relatedContent),collection.entityKey).toBe(true);
    }
    const blog=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='blog-index')!;
    const preview=walk(blog.sections).find(node=>node.id==='playroom-blog-index-preview');
    expect((preview?.config.items as unknown[]).length).toBeGreaterThanOrEqual(8);
  });

  it('ships meaningful showroom-ready Playroom editorial content instead of generic placeholder copy',()=>{
    const guide=getStorefrontTemplateDemoContent(PLAYROOM_V20_TEMPLATE_PACKAGE,'platform-guide');
    expect(guide?.payload.showroomReady).toBe(true);
    expect(String(guide?.payload.title)).toBe('Melyik platform illik hozzád?');
    expect(String(guide?.payload.excerpt).length).toBeGreaterThan(70);
    expect(String(guide?.payload.body).length).toBeGreaterThan(500);
    expect(String(guide?.payload.body)).toContain('Konzol');
    expect(String(guide?.payload.body)).toContain('PC');
    for(const slug of ['rolunk','fenntarthatosag','karrier','szallitas','fizetes','visszakuldes']){
      const fixture=getStorefrontTemplateDemoContent(PLAYROOM_V20_TEMPLATE_PACKAGE,slug);
      expect(fixture?.payload.showroomReady,slug).toBe(true);
      expect(String(fixture?.payload.excerpt??'').length,slug).toBeGreaterThan(45);
      expect(String(fixture?.payload.body??'').length,slug).toBeGreaterThan(180);
    }
  });

  it('applies semantic demo content without changing the accepted page structure',()=>{
    const fixture=getStorefrontTemplateDemoContent(PLAYROOM_V20_TEMPLATE_PACKAGE,'rolunk')!;
    const beforeIds=walk(content.sections).map(node=>node.id);
    const bound=applyStorefrontTemplateDemoContent(content,fixture.payload);
    const afterIds=walk(bound.sections).map(node=>node.id);
    expect(afterIds).toEqual(beforeIds);
    const nodes=walk(bound.sections);
    expect(nodes.find(node=>node.id==='playroom-content-information-title')?.config.text).toBe(fixture.payload.title);
    expect(nodes.find(node=>node.id==='playroom-content-information-summary')?.config.text).toBe(fixture.payload.excerpt);
    expect(nodes.find(node=>node.id==='playroom-content-information-body')?.config.text).toBe(fixture.payload.body);
  });

  it('materializes distinct legal and informational demo content instead of title-swapped placeholders',()=>{
    const slugs=['aszf','adatvedelem','impresszum','szallitas-es-fizetes','szallitas','fizetes','visszakuldes'];
    const bodies=slugs.map(slug=>{
      const fixture=getStorefrontTemplateDemoContent(PLAYROOM_V20_TEMPLATE_PACKAGE,slug);
      expect(fixture,slug).toBeTruthy();
      const body=String(fixture?.payload.body??'');
      expect(body.length,slug).toBeGreaterThan(80);
      return body;
    });
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it('renders demo notices with explicit high-contrast text independent of theme text tokens',()=>{
    const noticed=applyStorefrontTemplateDemoNotice(content);
    const serialized=JSON.stringify(noticed.sections[1]);
    expect(serialized).toContain(STOREFRONT_DEMO_CONTENT_NOTICE);
    expect(serialized).toContain('#ffd86b');
    expect(serialized).toContain('#211600');
    expect(serialized).toContain('MINTA TARTALOM');
  });
});