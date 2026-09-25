import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {bindStorefrontExistingCommerceRuntime} from '@/lib/builder/storefront-existing-commerce-bindings';
import {applyStorefrontBuilderMutation,listStorefrontBuilderInsertableComponents} from '@/lib/builder/storefront-visual-builder';
import {composeStorefrontDigitalCommerceCapabilities,composeStorefrontDigitalCommerceTemplatePackage,STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE,STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION} from '@/lib/builder/storefront-digital-commerce-composition';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {listStorefrontContextualCapabilityOpportunities} from '@/lib/builder/storefront-template-capability-discovery';
import {getStorefrontPageSemanticContexts} from '@/lib/builder/storefront-template-capability-policy';
import {validateStorefrontPageDocument,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,STOREFRONT_TEMPLATE_LAUNCH_TARGET,STOREFRONT_TEMPLATE_PORTFOLIO_STATUS} from '@/lib/builder/storefront-template-catalog';
import {PLANS} from '@/lib/plans/catalog';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';

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
    expect(components.get('commerce.documents-center',1)?.manifest.configurable).toContain('productTitle');
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

  it('binds the B2B quote CTA to runtime authority and hides it when the customer is not eligible',()=>{
    const document=page('product','commerce.b2b-quote-cta');
    const bound=bindStorefrontExistingCommerceRuntime(document);
    expect(bound.sections[0]!.children![0]!.bindings?.model?.path).toBe('commerce.digitalCommerce.b2bQuote');
    const hidden=renderToStaticMarkup(<StorefrontRuntimeRenderer page={document} viewport="desktop" bindingContext={{commerce:{digitalCommerce:{b2bQuote:{state:'ready',eligible:false,href:null}}}}} componentRegistry={createStorefrontVisualBuilderComponentRegistry()} rendererRegistry={createStorefrontVisualBuilderRendererRegistry()} capability={capability}/>);
    expect(hidden).not.toContain('Ajánlatot kérek');
    const shown=renderToStaticMarkup(<StorefrontRuntimeRenderer page={document} viewport="desktop" bindingContext={{commerce:{digitalCommerce:{b2bQuote:{state:'ready',eligible:true,href:'/fiokom/ajanlatkeresek?variantId=v1'}}}}} componentRegistry={createStorefrontVisualBuilderComponentRegistry()} rendererRegistry={createStorefrontVisualBuilderRendererRegistry()} capability={capability}/>);
    expect(shown).toContain('Ajánlatot kérek');
    expect(shown).toContain('/fiokom/ajanlatkeresek?variantId=v1');
  });

  it('uses the real Builder mutation authority for insert, edit and responsive overrides while protecting runtime model binding',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const source=page('product','commerce.product-documents');
    const insertable=listStorefrontBuilderInsertableComponents({document:source,registry,capability,parentId:'a3-section'});
    expect(insertable.map(item=>item.componentKey)).toContain('commerce.fulfillment-summary');
    expect(insertable.find(item=>item.componentKey==='commerce.fulfillment-summary')?.bindingSlots).not.toContain('model');

    const added=applyStorefrontBuilderMutation({
      document:source,registry,capability,
      mutation:{type:'add',parentId:'a3-section',componentKey:'commerce.fulfillment-summary',componentVersion:1,nodeId:'builder-fulfillment'},
    });
    expect(findComponent(added,'commerce.fulfillment-summary')).toBe(true);

    const edited=applyStorefrontBuilderMutation({
      document:added,registry,capability,
      mutation:{type:'config',nodeId:'builder-fulfillment',key:'title',value:'Saját teljesítési cím'},
    });
    const fulfillment=edited.sections[0]!.children!.find(item=>item.id==='builder-fulfillment')!;
    expect(fulfillment.config.title).toBe('Saját teljesítési cím');

    const responsive=applyStorefrontBuilderMutation({
      document:edited,registry,capability,
      mutation:{type:'responsive',nodeId:'builder-fulfillment',viewport:'mobile',gridSpan:12,hidden:false},
    });
    const responsiveNode=responsive.sections[0]!.children!.find(item=>item.id==='builder-fulfillment')!;
    expect(responsiveNode.responsive?.mobile).toEqual({gridSpan:12,hidden:false});

    expect(()=>applyStorefrontBuilderMutation({
      document:responsive,registry,capability,
      mutation:{type:'binding',nodeId:'builder-fulfillment',slot:'model',path:'commerce.digitalCommerce.productFulfillment'},
    })).toThrow('BUILDER_BINDING_SLOT_NOT_EDITABLE');
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

  it('converges account discoverability while keeping all three document authorities visibly distinct',()=>{
    const document=page('account','commerce.documents-center');
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={document}
      viewport="desktop"
      bindingContext={{commerce:{digitalCommerce:{documentsCenter:{state:'ready',digital:[{id:'digital-1',title:'Orbit Breakers',status:'available',href:'/api/digital-downloads/asset-1'}],orderDocuments:[{id:'order-1',title:'Garancialevél',status:'available',href:'/api/order-documents/order-1'}],productDocuments:[{id:'product-1',title:'Controller kézikönyv',status:'available',href:'/api/product-documents/product-1?variantId=variant-1'}]}}}}}
      componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
      rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
      capability={capability}
    />);
    expect(html).toContain('data-document-authority="digital"');
    expect(html).toContain('data-document-authority="order"');
    expect(html).toContain('data-document-authority="product"');
    expect(html).toContain('Digitális tartalmak');
    expect(html).toContain('Rendelési dokumentumok');
    expect(html).toContain('Termékdokumentumok');
    expect(html).toContain('Controller kézikönyv');
  });

  it('composes A3 surfaces into Playroom v20 and exposes them through semantic capability discovery',()=>{
    const byType=new Map(PLAYROOM_V20_TEMPLATE_PACKAGE.pages.map(item=>[item.pageType,item]));
    const product=byType.get('product')!,cart=byType.get('cart')!,checkout=byType.get('checkout')!,account=byType.get('account')!;
    expect(findComponent(product,'commerce.fulfillment-summary')).toBe(true);
    expect(findComponent(product,'commerce.product-documents')).toBe(true);
    expect(findComponent(cart,'commerce.fulfillment-summary')).toBe(true);
    expect(findComponent(checkout,'commerce.fulfillment-summary')).toBe(false);
    expect(findComponent(checkout,'commerce.post-purchase-guidance')).toBe(false);
    expect(findComponent(account,'account.capability-navigation')).toBe(false);
    expect(findComponent(account,'commerce.account-downloads')).toBe(false);
    expect(findComponent(account,'commerce.account-documents')).toBe(false);
    expect(findComponent(account,'commerce.documents-center')).toBe(false);
    expect(getStorefrontPageSemanticContexts(product)).toEqual(expect.arrayContaining(['product.fulfillment','product.documents']));
    expect(getStorefrontPageSemanticContexts(checkout)).toEqual(expect.arrayContaining(['checkout.fulfillment','checkout.post-purchase']));
    expect(listStorefrontContextualCapabilityOpportunities({document:product,capability}).map(item=>item.key)).toEqual(expect.arrayContaining(['fulfillment','product-documents']));
  });

  it('guards every concrete template package without fabricating the remaining 42-template target',()=>{
    expect(STOREFRONT_TEMPLATE_LAUNCH_TARGET).toBe(42);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.implemented).toBe(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.length);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining).toBe(STOREFRONT_TEMPLATE_LAUNCH_TARGET-STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.length);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.fabricatedEntriesAllowed).toBe(false);
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      for(const source of template.pages.filter(item=>item.pageType in STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE)){
        const composed=composeStorefrontDigitalCommerceCapabilities(source);
        const required=STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE[source.pageType as keyof typeof STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE];
        for(const key of required)expect(findComponent(composed,key),`${template.manifest.templateKey}:${source.pageType}:${key}`).toBe(true);
        expect(validateStorefrontPageDocument(composed,registry).ok,`${template.manifest.templateKey}:${source.pageType}`).toBe(true);
        const recomposed=composeStorefrontDigitalCommerceCapabilities(composed);
        for(const key of required){
          const count=(nodes:StorefrontPageDocument['sections']):number=>nodes.reduce((sum,item)=>sum+Number(item.componentKey===key)+count(item.children??[]),0);
          expect(count(recomposed.sections),`${template.manifest.templateKey}:${source.pageType}:${key}:idempotent`).toBe(1);
        }
      }
    }
  });

  it('removes legacy full-width checkout document guidance while preserving the footer boundary',()=>{
    const source=page('checkout','commerce.fulfillment-summary');
    source.sections.push({
      id:'legacy-checkout-digital-commerce',componentKey:'layout.section',componentVersion:1,config:{},
      children:[{id:'legacy-checkout-post-purchase',componentKey:'commerce.post-purchase-guidance',componentVersion:1,config:{}}],
    });
    source.sections.push({id:'wrapped-footer',componentKey:'layout.section',componentVersion:1,config:{},children:[{id:'wrapped-footer-inner',componentKey:'system.footer',componentVersion:1,config:{}}]});
    const composed=composeStorefrontDigitalCommerceCapabilities(source);
    expect(findComponent(composed,'commerce.fulfillment-summary')).toBe(false);
    expect(findComponent(composed,'commerce.post-purchase-guidance')).toBe(false);
    expect(composed.sections.at(-1)?.id).toBe('wrapped-footer');
  });

  it('keeps account overview navigation-only and removes stale embedded document surfaces',()=>{
    const source=page('account','commerce.documents-center');
    source.sections.push({
      id:'shared-a3-account-digital-commerce',componentKey:'layout.section',componentVersion:1,config:{},
      children:[{id:'shared-a3-account-digital-commerce-container',componentKey:'layout.container',componentVersion:1,config:{},children:[
        {id:'shared-a3-account-digital-commerce-1',componentKey:'commerce.post-purchase-guidance',componentVersion:1,config:{}},
      ]}],
    });
    source.sections.push({id:'account-footer',componentKey:'system.footer',componentVersion:1,config:{}});
    const composed=composeStorefrontDigitalCommerceCapabilities(source);
    expect(findComponent(composed,'account.capability-navigation')).toBe(false);
    expect(findComponent(composed,'commerce.documents-center')).toBe(false);
    expect(findComponent(composed,'commerce.account-downloads')).toBe(false);
    expect(findComponent(composed,'commerce.account-documents')).toBe(false);
    expect(findComponent(composed,'commerce.post-purchase-guidance')).toBe(false);
    expect(composed.sections.at(-1)?.id).toBe('account-footer');
  });

  it('inserts shared capability before the footer once and preserves later merchant removal',()=>{
    const source=page('product','commerce.product-documents');
    source.sections.push({id:'a3-footer',componentKey:'editorial.footer',componentVersion:1,config:{}});
    const composed=composeStorefrontDigitalCommerceCapabilities(source);
    expect(composed.metadata?.digitalCommerceCompositionVersion).toBe(STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION);
    const capabilityIndex=composed.sections.findIndex(item=>item.id.startsWith('shared-')&&item.id.endsWith('-digital-commerce'));
    const footerIndex=composed.sections.findIndex(item=>item.id==='a3-footer');
    expect(capabilityIndex).toBeGreaterThanOrEqual(0);
    expect(capabilityIndex).toBeLessThan(footerIndex);

    const merchantEdited=structuredClone(composed);
    const prune=(nodes:StorefrontPageDocument['sections']):StorefrontPageDocument['sections']=>nodes
      .filter(item=>item.componentKey!=='commerce.fulfillment-summary')
      .map(item=>({...item,...(item.children?{children:prune(item.children)}:{})}));
    merchantEdited.sections=prune(merchantEdited.sections);
    expect(findComponent(merchantEdited,'commerce.fulfillment-summary')).toBe(false);
    const reopened=composeStorefrontDigitalCommerceCapabilities(merchantEdited);
    expect(findComponent(reopened,'commerce.fulfillment-summary')).toBe(false);
  });

  it('applies the same shared composition package-wide for template install and AI Builder paths',()=>{
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      const composed=composeStorefrontDigitalCommerceTemplatePackage(template);
      expect(composed.manifest).toEqual(template.manifest);
      for(const page of composed.pages.filter(item=>item.pageType in STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE)){
        const required=STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE[page.pageType as keyof typeof STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE];
        for(const key of required)expect(findComponent(page,key),`${template.manifest.templateKey}:${page.pageType}:${key}`).toBe(true);
      }
    }
    const actions=readFileSync(join(process.cwd(),'src/app/admin/tartalom/builder/actions.ts'),'utf8');
    const ai=readFileSync(join(process.cwd(),'src/lib/builder/storefront-ai-generator-server.ts'),'utf8');
    expect(actions).toContain('composeStorefrontDigitalCommerceTemplatePackage(sourceTemplate)');
    expect(ai).toContain('composeStorefrontDigitalCommerceTemplatePackage(sourceTemplate)');
  });

  it('uses safe shared preview fixtures for every template and Builder preview instead of real customer authority',()=>{
    const template=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.find(item=>item.manifest.templateKey!=='gaming.playroom')!;
    const product=template.pages.find(item=>item.pageType==='product')!;
    const preview=augmentStorefrontDigitalCommercePreviewContext({template,page:product,context:{}}) as{commerce?:{digitalCommerce?:{productFulfillment?:{mode?:string};productDocuments?:{documents?:unknown[]}}}};
    expect(preview.commerce?.digitalCommerce?.productFulfillment?.mode).toBe('digital');
    expect(preview.commerce?.digitalCommerce?.productDocuments?.documents?.length).toBeGreaterThan(0);
    const runtimeSource=readFileSync(join(process.cwd(),'src/lib/builder/storefront-runtime-source.ts'),'utf8');
    expect(runtimeSource).toContain('augmentStorefrontDigitalCommercePreviewContext({page');
    expect(runtimeSource).not.toContain('guestToken');
  });

  it('hydrates the live Builder canvas with the same safe shared preview fixture instead of customer data',()=>{
    const builderPage=readFileSync(join(process.cwd(),'src/app/admin/tartalom/builder/page.tsx'),'utf8');
    expect(builderPage).toContain("import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview'");
    expect(builderPage).toContain('composeStorefrontDigitalCommerceCapabilities(document)');
    expect(builderPage).toContain('augmentStorefrontDigitalCommercePreviewContext({page:editorDocument,context:bindingContext})');
    expect(builderPage).toContain('document={editorDocument}');
    expect(builderPage).toContain('bindingContext={editorBindingContext}');
    expect(builderPage).not.toContain('listAccountDigitalDownloads');
    expect(builderPage).not.toContain('listGuestDigitalDownloads');
  });

  it('wires published runtime models only through server authority and keeps Builder preview fixture-only',()=>{
    const server=readFileSync(join(process.cwd(),'src/lib/builder/storefront-digital-commerce-server.ts'),'utf8');
    expect(server).toContain("import 'server-only'");
    expect(server).toContain('classifyCheckoutFulfillment');
    expect(server).toContain('listStorefrontProductDocuments');
    expect(server).toContain('listAccountDigitalDownloadSurface');
    expect(server).toContain('listAccountOrderDocuments');
    expect(server).toContain('listAccountProductDocuments');
    expect(server).not.toContain('guestToken');
    const runtimeSource=readFileSync(join(process.cwd(),'src/lib/builder/storefront-runtime-source.ts'),'utf8');
    expect(runtimeSource).toContain('getStorefrontDigitalCommerceRuntimeModel(instance.id,digitalCommerceRequest)');
    expect(runtimeSource).toContain('digitalCommerceRequest.pageType!==materialized.pageType');
    expect(runtimeSource).toContain('augmentStorefrontDigitalCommercePreviewContext({page');
  });

  it('keeps COD, guest access and Product Documents on their canonical server authorities',()=>{
    const checkout=readFileSync(join(process.cwd(),'src/components/checkout/checkout-form.tsx'),'utf8');
    const orderRoute=readFileSync(join(process.cwd(),'src/app/api/orders/route.ts'),'utf8');
    const guestPage=readFileSync(join(process.cwd(),'src/app/digitalis-hozzaferes/page.tsx'),'utf8');
    const downloadRoute=readFileSync(join(process.cwd(),'src/app/api/digital-downloads/[assetId]/route.ts'),'utf8');
    const digital=readFileSync(join(process.cwd(),'src/lib/commerce/digital-commerce.ts'),'utf8');
    const productDocuments=readFileSync(join(process.cwd(),'src/lib/commerce/product-documents.ts'),'utf8');
    expect(checkout).toContain("containsDigital?paymentOptions.filter(option=>option.flow!=='cash_on_delivery')");
    expect(orderRoute).toContain("fulfillment.digitalLines>0&&payment.flow==='cash_on_delivery'");
    expect(guestPage).toContain('listGuestDigitalDownloads(instance.id,orderId,token)');
    expect(digital).toContain(".is('revoked_at',null).gt('expires_at',now)");
    expect(downloadRoute).toContain('guestToken');
    expect(downloadRoute).toContain('authorizeDigitalDownload');
    expect(downloadRoute).not.toContain('getPublicUrl');
    expect(productDocuments).toContain("admin.rpc('list_storefront_product_documents_v1'");
    expect(productDocuments).toContain("admin.rpc('authorize_product_document_download_v1'");
  });

  it('renders exhausted and revoked account states without emitting a download link',()=>{
    const document=page('account','commerce.documents-center');
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={document} viewport="desktop"
      bindingContext={{commerce:{digitalCommerce:{documentsCenter:{state:'ready',digital:[
        {id:'exhausted',title:'Elfogyott keret',status:'exhausted',href:'/api/digital-downloads/forged'},
        {id:'revoked',title:'Visszavont',status:'revoked',href:'/api/digital-downloads/forged-2'},
      ],orderDocuments:[],productDocuments:[]}}}}}
      componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
      rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
      capability={capability}/>)
    expect(html).toContain('Letöltési keret elfogyott');
    expect(html).toContain('Hozzáférés visszavonva');
    expect(html).not.toContain('/api/digital-downloads/forged');
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
    const runtimeServer=readFileSync(join(process.cwd(),'src/lib/builder/storefront-digital-commerce-server.ts'),'utf8');
    expect(runtimeServer).toContain('normalizeFulfillment(row.fulfillment_type??row.products?.fulfillment_type)');
    expect(runtimeServer).not.toContain("row.fulfillment_type==='digital'||row.products?.fulfillment_type==='digital'");
  });
});
