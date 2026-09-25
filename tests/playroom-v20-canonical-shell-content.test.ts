import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import {applyStorefrontTemplateDemoNotice,getStorefrontTemplateDemoContent,STOREFRONT_DEMO_CONTENT_NOTICE,STOREFRONT_REQUIRED_ACCOUNT_CAPABILITY_ROUTES,STOREFRONT_REQUIRED_MOBILE_NAVIGATION_ROUTES} from '@/lib/builder/storefront-template-route-integrity';
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
    expect(serialized).toContain('content.page.title');
    expect(serialized).toContain('content.page.summary');
    expect(serialized).toContain('content.page.body');
    expect(serialized).toContain('whiteSpace');
    expect(serialized).toContain('pre-line');
  });

  it('keeps shopper navigation complete and uses a recognizable cart affordance',()=>{
    for(const page of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const header=nodes.find(node=>node.componentKey==='system.commerce-header');
      expect(header,page.pageType).toBeTruthy();
      expect((header?.config.mobileMenuItems as {href:string}[]).map(item=>item.href),page.pageType).toEqual([...STOREFRONT_REQUIRED_MOBILE_NAVIGATION_ROUTES]);
      const cart=((header?.config.utilityItems??[]) as {href?:string;symbol?:string}[]).find(item=>item.href==='/kosar');
      expect(cart?.symbol).toBe('🛒');
      const footerHrefs=nodes.filter(node=>node.id.startsWith('playroom-footer-')&&node.componentKey==='system.navigation')
        .flatMap(node=>((node.config.items??[]) as {href?:string}[]).map(item=>item.href));
      for(const href of ['/aszf','/adatvedelem','/impresszum','/kapcsolat','/gyik'])expect(footerHrefs).toContain(href);
    }
  });

  it('keeps Contact complete with company details, embedded map and the shared wizard',()=>{
    const page=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='contact')!;
    const nodes=walk(page.sections);
    expect(nodes.some(node=>node.componentKey==='support.location-map')).toBe(true);
    expect(nodes.some(node=>node.componentKey==='support.contact-form')).toBe(true);
    const formSurface=nodes.find(node=>node.id==='playroom-contact-form-surface');
    expect(formSurface).toBeTruthy();
    expect(JSON.stringify(formSurface?.config.style)).toContain('#020b17');
    const serialized=JSON.stringify(page);
    for(const token of ['Cím:','Telefon:','E-mail:','Nyitvatartás:'])expect(serialized).toContain(token);
    expect(page.metadata?.contactCompleteness).toEqual({
      companyDetails:true,
      embeddedMap:'shared-support-location-map-v1',
      formWizard:'storefront-form-wizard-v1',
    });
  });

  it('keeps the accepted Playroom mobile account UX while exposing the full canonical capability set off-mobile',()=>{
    const page=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='account')!;
    const nodes=walk(page.sections);
    const nav=nodes.find(node=>node.id==='playroom-account-capability-navigation');
    expect(nav).toBeTruthy();
    expect(nav?.config.presentation).toBe('account-capability-demo');
    const hrefs=((nav?.config.items??[]) as {href:string}[]).map(item=>item.href);
    for(const href of STOREFRONT_REQUIRED_ACCOUNT_CAPABILITY_ROUTES)expect(hrefs).toContain(href);
    const acceptedMobile=nodes.find(node=>node.id==='playroom-account-navigation-presets-mobile');
    expect(acceptedMobile).toBeTruthy();
    expect((acceptedMobile?.config.style as Record<string,Record<string,unknown>>).desktop?.display).toBe('none');
    expect((acceptedMobile?.config.style as Record<string,Record<string,unknown>>).tablet?.display).toBe('none');
    expect((acceptedMobile?.config.style as Record<string,Record<string,unknown>>).mobile?.display).toBe('block');
    expect(nodes.some(node=>node.id==='playroom-account-orders')).toBe(true);
    expect(nodes.some(node=>node.id==='playroom-account-favorites')).toBe(true);
    expect(nodes.some(node=>node.id==='playroom-account-profile')).toBe(true);
    const capabilitySection=nodes.find(node=>node.id==='playroom-account-capabilities');
    expect((capabilitySection?.config.style as Record<string,Record<string,unknown>>).mobile?.display).toBe('none');
    expect(page.metadata?.accountCompleteness).toEqual({
      navigationAuthority:'shared-account-capabilities',
      presentation:'accepted-playroom-mobile-plus-desktop-capabilities',
      longTileDirectory:false,
    });
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