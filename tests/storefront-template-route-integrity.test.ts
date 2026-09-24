import {describe,expect,it} from 'vitest';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {
  STOREFRONT_DEMO_CONTENT_NOTICE,
  augmentStorefrontTemplateDemoContent,
  evaluateStorefrontTemplateRouteIntegrity,
  getStorefrontTemplateDemoContent,
  rewriteStorefrontTemplatePreviewLinks,
} from '@/lib/builder/storefront-template-route-integrity';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';

describe('Template Route Integrity + Demo Content Foundation',()=>{
  it('auto-materializes editable draft fixtures for dynamic content links with an explicit warning contract',()=>{
    const template=augmentStorefrontTemplateDemoContent(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE);
    const shipping=getStorefrontTemplateDemoContent(template,'szallitas');
    expect(shipping).toBeTruthy();
    expect(shipping?.entityType).toBe('content');
    expect(shipping?.payload).toMatchObject({kind:'page',slug:'szallitas',status:'draft',demo:true,demoNotice:STOREFRONT_DEMO_CONTENT_NOTICE});
    expect(String(shipping?.payload.body)).toContain('Szállítási lehetőségek');
    expect(String(shipping?.payload.body)).not.toContain(STOREFRONT_DEMO_CONTENT_NOTICE);
  });

  it('keeps all implemented catalog packages route-integrity clean after shared augmentation',()=>{
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      const issues=evaluateStorefrontTemplateRouteIntegrity(template);
      expect(issues,template.manifest.templateKey+'@'+template.manifest.templateVersion).toEqual([]);
    }
  });

  it('keeps only the current Playroom v20 resolver authority route-integrity clean',()=>{
    expect(getStorefrontTemplatePackage('gaming.playroom',19)).toBeUndefined();
    const template=getStorefrontTemplatePackage('gaming.playroom',20);
    expect(template).toBeTruthy();
    expect(evaluateStorefrontTemplateRouteIntegrity(template!)).toEqual([]);
    expect(getStorefrontTemplateDemoContent(template!,'rolunk')).toBeTruthy();
  });

  it('preserves Factory candidate authority across rewritten preview navigation',()=>{
    const page=structuredClone(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='home')!);
    const rewritten=rewriteStorefrontTemplatePreviewLinks(page,{templateKey:'gaming.loot-vault',templateVersion:2,viewport:'desktop',factoryCandidate:true});
    expect(JSON.stringify(rewritten)).toContain('factory=1');
    expect(JSON.stringify(rewritten)).toContain('version=2');
  });

  it('fails closed for unknown storefront routes',()=>{
    const broken=structuredClone(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE);
    broken.pages[0]!.sections.push({id:'dead-link',componentKey:'content.button',componentVersion:1,config:{label:'Dead',href:'/nem-letezo-utvonal',variant:'secondary',size:'m',ariaLabel:'Dead'}});
    expect(evaluateStorefrontTemplateRouteIntegrity(broken)).toEqual(expect.arrayContaining([expect.objectContaining({code:'STORE_ROUTE_UNKNOWN',href:'/nem-letezo-utvonal'})]));
  });

  it('fails closed for unsupported catalog query parameters',()=>{
    const broken=structuredClone(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE);
    broken.pages[0]!.sections.push({id:'bad-filter',componentKey:'content.button',componentVersion:1,config:{label:'Bad filter',href:'/webaruhaz?magic=1',variant:'secondary',size:'m',ariaLabel:'Bad filter'}});
    expect(evaluateStorefrontTemplateRouteIntegrity(broken)).toEqual(expect.arrayContaining([expect.objectContaining({code:'CATALOG_QUERY_UNSUPPORTED',href:'/webaruhaz?magic=1'})]));
  });
});
