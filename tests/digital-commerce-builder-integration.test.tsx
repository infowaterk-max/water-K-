import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {bindStorefrontExistingCommerceRuntime} from '@/lib/builder/storefront-existing-commerce-bindings';
import {listStorefrontContextualCapabilityOpportunities} from '@/lib/builder/storefront-template-capability-discovery';
import {getStorefrontPageSemanticContexts} from '@/lib/builder/storefront-template-capability-policy';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {PLANS} from '@/lib/plans/catalog';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';

const A3_KEYS=['commerce.fulfillment-summary','commerce.product-documents','commerce.documents-center','commerce.post-purchase-guidance'] as const;
const capability={plan:'alap' as const,features:PLANS.alap.features};

const page=(pageType:StorefrontPageDocument['pageType'],componentKey:string):StorefrontPageDocument=>({
  schemaVersion:1,pageKey:`a3-${pageType}`,pageType,templateKey:'test.a3',templateVersion:1,
  sections:[{id:'a3-section',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'s',width:'full'},children:[{id:'a3-component',componentKey,componentVersion:1,config:{title:'Teszt'}}]}],
});

const findComponent=(document:StorefrontPageDocument,key:string)=>{
  let found=false;
  const walk=(nodes:StorefrontPageDocument['sections'])=>nodes.forEach(node=>{if(node.componentKey===key)found=true;walk(node.children??[])});
  walk(document.sections);return found;
};

describe('Digital Commerce A3 shared Builder integration',()=>{
  it('registers every A3 surface in the shared Builder and renderer registries with runtime-only business models',()=>{
    const components=createStorefrontVisualBuilderComponentRegistry();
    const renderers=createStorefrontVisualBuilderRendererRegistry();
    for(const key of A3_KEYS){
      const definition=components.get(key,1);
      expect(definition,key).toBeDefined();
      expect(renderers.get(key,1),`${key} renderer`).toBeDefined();
      expect(definition?.runtimeBindingSlots).toContain('model');
      expect(definition?.bindingSlots??[]).not.toContain('model');
    }
  });

  it('overwrites forged Page Schema model bindings with canonical shared runtime authority paths',()=>{
    const source=page('product','commerce.fulfillment-summary');
    source.sections[0]!.children![0]!.bindings={model:{path:'commerce.existingEngines.finders'}};
    const bound=bindStorefrontExistingCommerceRuntime(source);
    expect(bound.sections[0]!.children![0]!.bindings?.model?.path).toBe('commerce.digitalCommerce.productFulfillment');

    const documents=page('product','commerce.product-documents');
    documents.sections[0]!.children![0]!.bindings={model:{path:'commerce.existingEngines.configurators'}};
    expect(bindStorefrontExistingCommerceRuntime(documents).sections[0]!.children![0]!.bindings?.model?.path).toBe('commerce.digitalCommerce.productDocuments');
  });

  it('renders fulfillment from runtime data with live storefront tokens and without authored commerce truth',()=>{
    const document=page('product','commerce.fulfillment-summary');
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={document}
      viewport="desktop"
      bindingContext={{commerce:{digitalCommerce:{productFulfillment:{state:'ready',mode:'digital',copy:'Fizetés után azonnal letölthető.',documentCenterHref:'/fiokom/letoltesek'}}}}}
      componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
      rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
      capability={capability}
    />);
    expect(html).toContain('data-storefront-digital-commerce="fulfillment-summary"');
    expect(html).toContain('data-fulfillment-mode="digital"');
    expect(html).toContain('Digitális kézbesítés');
    expect(html).toContain('Fizetés után azonnal letölthető.');
    expect(html).toContain('var(--shoporation-color-');
  });

  it('keeps Product Documents invisible when the authority returns no documents',()=>{
    const document=page('product','commerce.product-documents');
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={document}
      viewport="desktop"
      bindingContext={{commerce:{digitalCommerce:{productDocuments:{state:'ready',documents:[]}}}}}
      componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
      rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
      capability={capability}
    />);
    expect(html).not.toContain('data-storefront-digital-commerce="product-documents"');
  });

  it('composes A3 surfaces into Playroom v20 and exposes them through semantic capability discovery',()=>{
    const byType=new Map(PLAYROOM_V20_TEMPLATE_PACKAGE.pages.map(item=>[item.pageType,item]));
    const product=byType.get('product')!,cart=byType.get('cart')!,checkout=byType.get('checkout')!,account=byType.get('account')!;
    expect(findComponent(product,'commerce.fulfillment-summary')).toBe(true);
    expect(findComponent(product,'commerce.product-documents')).toBe(true);
    expect(findComponent(cart,'commerce.fulfillment-summary')).toBe(true);
    expect(findComponent(checkout,'commerce.fulfillment-summary')).toBe(true);
    expect(findComponent(checkout,'commerce.post-purchase-guidance')).toBe(true);
    expect(findComponent(account,'commerce.documents-center')).toBe(true);
    expect(getStorefrontPageSemanticContexts(product)).toEqual(expect.arrayContaining(['product.fulfillment','product.documents']));
    expect(getStorefrontPageSemanticContexts(checkout)).toEqual(expect.arrayContaining(['checkout.fulfillment','checkout.post-purchase']));
    expect(listStorefrontContextualCapabilityOpportunities({document:product,capability}).map(item=>item.key)).toEqual(expect.arrayContaining(['fulfillment','product-documents']));
    expect(listStorefrontContextualCapabilityOpportunities({document:account,capability}).map(item=>item.key)).toContain('documents-center');
  });

  it('ships explicit Playroom factory fixtures for digital, physical and mixed acceptance without creating a template-local engine',()=>{
    const fixtures=PLAYROOM_V20_TEMPLATE_PACKAGE.demoFixtures??[];
    expect(fixtures.some(item=>item.entityKey==='a3-downloadable-game'&&item.payload.fulfillment_type==='digital')).toBe(true);
    expect(fixtures.some(item=>item.entityKey==='a3-physical-controller'&&item.payload.fulfillment_type==='physical')).toBe(true);
    for(const pageDocument of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){
      expect(pageDocument.metadata?.digitalCommerceFactoryAcceptance).toEqual(['downloadable-game','physical-gaming-product','mixed-basket']);
    }
  });

  it('keeps storefront fulfillment projection aligned with the canonical variant-over-product precedence',()=>{
    const source=readFileSync(join(process.cwd(),'src/lib/catalog-server.ts'),'utf8');
    expect(source).toContain("instance_id,fulfillment_type,products!inner");
    expect(source).toContain("fulfillmentType:normalizeFulfillment(row.fulfillment_type??product?.fulfillment_type)");
  });
});
