import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontPresetBundle} from '@/lib/builder/storefront-presets';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {listStorefrontContextualCapabilityOpportunities} from '@/lib/builder/storefront-template-capability-discovery';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {PLAYROOM_V20_TEMPLATE_PACKAGE,PLAYROOM_V20_TEMPLATE_VERSION} from '@/lib/builder/templates/gaming/playroom/v20';
import {PLANS} from '@/lib/plans/catalog';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const page=(type:typeof PLAYROOM_V20_TEMPLATE_PACKAGE.pages[number]['pageType'])=>PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(candidate=>candidate.pageType===type)!;
const walk=(nodes:readonly typeof PLAYROOM_V20_TEMPLATE_PACKAGE.pages[number]['sections'][number][],key:string):boolean=>nodes.some(node=>node.componentKey===key||walk(node.children??[],key));

describe('Playroom v20 launch capability consolidation',()=>{
  it('publishes one consolidated v20 while keeping historical Playroom packages out of the active resolver',()=>{
    expect(PLAYROOM_V20_TEMPLATE_VERSION).toBe(20);
    expect(PLAYROOM_V20_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(20);
    expect(PLAYROOM_V20_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(PLAYROOM_V20_TEMPLATE_PACKAGE.pages.every(document=>document.templateVersion===20)).toBe(true);
    expect(getStorefrontTemplatePackage('gaming.playroom')?.manifest.templateVersion).toBe(20);
    expect(getStorefrontTemplatePackage('gaming.playroom',19)).toBeUndefined();
    expect(STOREFRONT_TEMPLATE_CATALOG.filter(item=>item.templateKey==='gaming.playroom')).toHaveLength(1);
  });

  it('ships the working newsletter and support authorities in natural factory locations',()=>{
    expect(walk(page('home').sections,'marketing.newsletter-signup')).toBe(true);
    expect(walk(page('contact').sections,'support.contact-form')).toBe(true);
    expect(page('home').metadata?.templateVersionPolicy).toBe('bump-only-for-factory-composition-or-schema-change');
    expect(page('contact').metadata?.adaptivePlanModel).toBe('same-template-alap-pro-entitlement-aware');
    const supportRenderer=read('src/components/builder/storefront-support.tsx');
    const supportClient=read('src/components/builder/storefront-support-contact-form-client.tsx');
    const formWizard=read('src/components/forms/storefront-form-wizard.tsx');
    expect(supportRenderer).toContain('StorefrontSupportContactFormClient');
    expect(supportClient).toContain('endpoint="/api/support"');
    expect(formWizard).toContain('fetch(endpoint');
    expect(formWizard).toContain('data-storefront-form-wizard="shared-v1"');
    const newsletter=read('src/components/builder/storefront-newsletter-signup-runtime.tsx');
    expect(newsletter).toContain("fetch('/api/marketing/newsletter'");
    expect(newsletter).toContain('--shoporation-radius-s');
  });

  it('keeps the same package valid for both Alap and Pro instead of creating a second visual skin',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const capability of[{plan:'alap' as const,features:PLANS.alap.features},{plan:'pro' as const,features:PLANS.pro.features}]){
      for(const document of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){
        const result=validateStorefrontPageDocument(document,registry,capability);
        expect(result.ok,`${capability.plan}:${document.pageType}:${result.violations.map(item=>item.code).join(',')}`).toBe(true);
      }
    }
  });

  it('exposes factory sections through the shared preset system',()=>{
    const bundle=createStorefrontPresetBundle(PLAYROOM_V20_TEMPLATE_PACKAGE);
    expect(bundle.templateVersion).toBe(20);
    expect(bundle.pagePresets).toHaveLength(14);
    expect(bundle.sectionPresets.some(item=>item.nodeId==='playroom-home-newsletter')).toBe(true);
    expect(bundle.sectionPresets.some(item=>item.nodeId==='playroom-contact-form')).toBe(true);
  });

  it('discovers contextual Pro capabilities from real manifests and keeps them locked on Alap',()=>{
    const product=page('product');
    const alap=listStorefrontContextualCapabilityOpportunities({document:product,capability:{plan:'alap',features:PLANS.alap.features}});
    const pro=listStorefrontContextualCapabilityOpportunities({document:product,capability:{plan:'pro',features:PLANS.pro.features}});
    const alapScene=alap.find(item=>item.key==='special:scene');
    const proScene=pro.find(item=>item.key==='special:scene');
    expect(alapScene?.availability).toBe('locked');
    expect(alapScene?.requiredPlan).toBe('pro');
    expect(alapScene?.requiredFeatures).toContain('interactiveSceneCommerce');
    expect(proScene?.availability).toBe('available');
    expect(alap.some(item=>item.key==='special:compatibility'&&item.availability==='available')).toBe(true);
    const contact=listStorefrontContextualCapabilityOpportunities({document:page('contact'),capability:{plan:'alap',features:PLANS.alap.features}});
    expect(contact.some(item=>item.key==='support'&&item.availability==='available')).toBe(true);
  });
});
