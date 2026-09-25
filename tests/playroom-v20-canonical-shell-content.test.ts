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

  it('keeps the accepted Playroom Contact composition and shared topic-first wizard',()=>{
    const page=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='contact')!;
    const nodes=walk(page.sections);
    expect(nodes.some(node=>node.id==='playroom-contact-options-preset')).toBe(true);
    expect(nodes.some(node=>node.componentKey==='support.contact-form')).toBe(true);
    expect(nodes.some(node=>node.id==='playroom-contact-form-surface')).toBe(false);
    expect(nodes.some(node=>node.componentKey==='support.location-map')).toBe(false);
  });

  it('preserves the accepted Playroom account navigation cards instead of importing another template IA',()=>{
    const page=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='account')!;
    const nodes=walk(page.sections);
    expect(nodes.some(node=>node.id==='playroom-account-navigation-presets')).toBe(true);
    expect(nodes.some(node=>node.id==='playroom-account-orders')).toBe(true);
    expect(nodes.some(node=>node.id==='playroom-account-favorites')).toBe(true);
    expect(nodes.some(node=>node.id==='playroom-account-profile')).toBe(true);
    expect(nodes.some(node=>node.id==='playroom-account-capability-navigation')).toBe(false);
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