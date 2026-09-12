import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontSharedContentRendererRegistry} from '@/components/builder/storefront-shared-content';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontSharedContentComponentRegistry} from '@/lib/builder/storefront-shared-content';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {PLANS} from '@/lib/plans/catalog';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const trustItems=[
  {id:'stock',symbol:'◌',label:'Raktáron',copy:'Készletinformáció'},
  {id:'shipping',symbol:'↗',label:'Gyors szállítás',copy:'Szállítási információ'},
  {id:'returns',symbol:'✓',label:'Visszaküldés',copy:'Visszaküldési feltétel'},
] as const;
const page:StorefrontPageDocument={
  schemaVersion:1,
  pageKey:'shared-content.product',
  pageType:'product',
  templateKey:'reference.shared-content',
  templateVersion:1,
  sections:[
    {
      id:'trust',componentKey:'content.trust-strip',componentVersion:1,
      config:{
        columns:3,mobileColumns:1,presentation:'compact',items:trustItems,
        styleSlots:{root:{base:{borderTop:'1px solid #e6e6e6'},mobile:{gap:'.4rem'}},label:{base:{fontWeight:750}}},
      },
      bindings:{items:{path:'content.productTrust.items',fallback:trustItems}},
    },
    {
      id:'comparison',componentKey:'editorial.before-after',componentVersion:1,
      config:{
        eyebrow:'MERCHANT EVIDENCE',title:'Dokumentált összehasonlítás',copy:'Csak hitelesített merchant evidence esetén jelenik meg.',
        beforeImage:'/demo/evidence-before.jpg',beforeImageAlt:'Kiinduló állapot',beforeLabel:'Előtte',
        afterImage:'/demo/evidence-after.jpg',afterImageAlt:'Későbbi állapot',afterLabel:'Utána',
        caption:'A képek a kereskedő által hitelesített evidence rekordhoz tartoznak.',evidenceStatus:'verified',presentation:'evidence-pair',
      },
      bindings:{
        beforeImage:{path:'content.beforeAfter.beforeImage',fallback:'/demo/evidence-before.jpg'},
        afterImage:{path:'content.beforeAfter.afterImage',fallback:'/demo/evidence-after.jpg'},
        evidenceStatus:{path:'content.beforeAfter.evidenceStatus',fallback:'verified'},
      },
    },
  ],
};

const render=(document:StorefrontPageDocument,viewport:'desktop'|'tablet'|'mobile')=>renderToStaticMarkup(
  <StorefrontRuntimeRenderer page={document} viewport={viewport} bindingContext={{}} componentRegistry={createStorefrontSharedContentComponentRegistry()} rendererRegistry={createStorefrontSharedContentRendererRegistry()} capability={capability}/>,
);

describe('Shared fidelity content primitives',()=>{
  it('registers one canonical trust-strip and before-after contract in the Builder registry',()=>{
    const components=createStorefrontVisualBuilderComponentRegistry();
    const renderers=createStorefrontVisualBuilderRendererRegistry();
    expect(components.get('content.trust-strip',1)?.manifest.responsiveMode).toBe('grid');
    expect(components.get('editorial.before-after',1)?.manifest.capability).toEqual({minPlan:'alap',features:['contentMarketing']});
    expect(renderers.get('content.trust-strip',1)).toBeDefined();
    expect(renderers.get('editorial.before-after',1)).toBeDefined();
  });

  it('renders trust items responsively from the shared primitive without hidden duplicate DOM',()=>{
    const desktop=render(page,'desktop');
    const mobile=render(page,'mobile');
    expect(desktop).toContain('data-storefront-content="trust-strip"');
    expect(desktop).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(mobile).toContain('grid-template-columns:repeat(1,minmax(0,1fr))');
    expect((desktop.match(/Raktáron/g)??[])).toHaveLength(1);
    expect((mobile.match(/Raktáron/g)??[])).toHaveLength(1);

    const threeColumn=structuredClone(page);
    const trust=threeColumn.sections.find(section=>section.id==='trust')!;
    trust.config={...trust.config,mobileColumns:3};
    expect(render(threeColumn,'mobile')).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
  });

  it('renders before/after only when evidence is explicitly verified and both images are safe',()=>{
    const verified=render(page,'desktop');
    expect(verified).toContain('data-storefront-editorial="before-after"');
    expect(verified).toContain('data-evidence-status="verified"');
    expect(verified).toContain('/demo/evidence-before.jpg');
    expect(verified).toContain('/demo/evidence-after.jpg');

    const unverified=structuredClone(page);
    const node=unverified.sections.find(section=>section.id==='comparison')!;
    node.config={...node.config,evidenceStatus:'draft'};
    node.bindings=undefined;
    const hidden=render(unverified,'desktop');
    expect(hidden).not.toContain('data-storefront-editorial="before-after"');
    expect(hidden).not.toContain('/demo/evidence-before.jpg');

    const unsafe=structuredClone(page);
    const unsafeNode=unsafe.sections.find(section=>section.id==='comparison')!;
    unsafeNode.config={...unsafeNode.config,afterImage:'javascript:alert(1)'};
    unsafeNode.bindings=undefined;
    expect(render(unsafe,'desktop')).not.toContain('data-storefront-editorial="before-after"');
  });
});
