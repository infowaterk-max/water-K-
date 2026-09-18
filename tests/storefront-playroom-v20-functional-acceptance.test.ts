import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {bindStorefrontExistingCommerceRuntime} from '@/lib/builder/storefront-existing-commerce-bindings';
import {composeStorefrontDigitalCommerceTemplatePackage} from '@/lib/builder/storefront-digital-commerce-composition';
import {
  planStorefrontTemplateInstallation,
  STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY,
} from '@/lib/builder/storefront-template-installation';
import {listStorefrontContextualCapabilityOpportunities} from '@/lib/builder/storefront-template-capability-discovery';
import {
  getStorefrontGlobalStyleState,
  resolveStorefrontGlobalStyleCssVariables,
  setStorefrontGlobalStyleState,
  STOREFRONT_GLOBAL_STYLES_VERSION,
} from '@/lib/builder/storefront-global-styles';
import {setStorefrontNodeStyleSlot} from '@/lib/builder/storefront-fidelity-builder-operations';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';
import {PLANS} from '@/lib/plans/catalog';

const read=(path:string)=>readFileSync(path,'utf8');
const registry=createStorefrontVisualBuilderComponentRegistry();
const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
const pro={plan:'pro' as const,features:PLANS.pro.features};
const alap={plan:'alap' as const,features:PLANS.alap.features};
const playroomPage=(pageType:StorefrontPageDocument['pageType'])=>structuredClone(PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType===pageType)!);

function findNode(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|null=>{
    for(const node of nodes){
      if(node.id===nodeId)return node;
      const child=walk(node.children??[]);
      if(child)return child;
    }
    return null;
  };
  const found=walk(document.sections);
  if(!found)throw new Error(`TEST_NODE_NOT_FOUND:${nodeId}`);
  return found;
}

function render(page:StorefrontPageDocument,bindingContext:Record<string,unknown>,viewport:'desktop'|'tablet'|'mobile'='desktop'){
  return renderToStaticMarkup(createElement(StorefrontRuntimeRenderer,{
    page:bindStorefrontExistingCommerceRuntime(page),
    viewport,
    bindingContext,
    componentRegistry:registry,
    rendererRegistry,
    capability:pro,
  }));
}

describe('Playroom v20 functional acceptance',()=>{
  it('plans a real v19 -> v20 upgrade as draft-only while preserving page identities and revisions',()=>{
    const existingPages=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.map((page,index)=>({
      pageKey:`merchant-${page.pageType}`,
      pageType:page.pageType,
      draftRevision:index+7,
      draftTemplateKey:'gaming.playroom',
      draftTemplateVersion:19,
      publishedTemplateKey:'gaming.playroom',
      publishedTemplateVersion:19,
    }));
    const template=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const plan=planStorefrontTemplateInstallation({template,componentRegistry:registry,capability:pro,existingPages});
    expect(plan.mode).toBe('upgrade');
    expect(plan.templateKey).toBe('gaming.playroom');
    expect(plan.templateVersion).toBe(20);
    expect(plan.pages).toHaveLength(14);
    expect(plan.pages.every((page,index)=>page.pageKey===`merchant-${page.pageType}`&&page.expectedDraftRevision===index+7)).toBe(true);
    expect(plan.mutationBoundary).toEqual(STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY);
    expect(plan.mutationBoundary.storefrontPageDrafts).toBe(true);
    for(const key of ['products','variants','customers','orders','content','b2b','seoBusinessData'] as const)expect(plan.mutationBoundary[key]).toBe(false);

    const actions=read('src/app/admin/tartalom/builder/actions.ts');
    const start=actions.indexOf('export async function installVisualBuilderTemplateAction');
    const end=actions.indexOf('export async function generateVisualBuilderStorefrontAction',start);
    const installAction=actions.slice(start,end);
    expect(installAction).toContain('saveCurrentStorefrontTemplateDraftPlan');
    expect(installAction).not.toContain('publishVisualBuilderPageAction');
    expect(installAction).not.toContain('publishCurrentStorefrontPage');
  });

  it('keeps Contact Form on the canonical ticket authority with validation, dedupe, spam sink and accessible feedback',()=>{
    const route=read('src/app/api/support/route.ts');
    const client=read('src/components/builder/storefront-support-contact-form-client.tsx');
    const atomic=read('supabase/migrations/20260903185000_support_submission_atomic_v2.sql');
    expect(route).toContain("subject:z.string().trim().min(3).max(180)");
    expect(route).toContain("message:z.string().trim().min(10).max(4000)");
    expect(route).toContain("if(parsed.data.website)return NextResponse.json({ok:true,ticketNumber:'SUP-OK'})");
    expect(route).toContain("rpc('create_support_ticket_v2'");
    expect(route).toContain("result.duplicate===true");
    expect(route).toContain("{status:429}");
    expect(route).toContain("{status:201}");
    expect(atomic).toContain('pg_advisory_xact_lock');
    expect(atomic).toContain('SUPPORT_INITIAL_MESSAGE_EVIDENCE_MISSING');
    expect(client).toContain("fetch('/api/support'");
    expect(client).toContain("role={feedback.kind==='error'?'alert':'status'}");
    expect(client).toContain('aria-live="polite"');
  });

  it('makes Newsletter consent tenant-scoped, explicit and idempotent for an already-active subscriber',()=>{
    const route=read('src/app/api/marketing/newsletter/route.ts');
    const client=read('src/components/builder/storefront-newsletter-signup-runtime.tsx');
    expect(route).toContain("consent:z.literal(true)");
    expect(route).toContain(".eq('instance_id',instance.id)");
    expect(route).toContain(".eq('email',email)");
    expect(route).toContain(".eq('channel','email')");
    expect(route).toContain("latest?.status==='granted'");
    expect(route).toContain("duplicate:true");
    expect(route).toContain("message:'Már feliratkoztál.'");
    expect(route).toContain("status:'granted'");
    expect(route).toContain("duplicate:false");
    expect(client).toContain("data-consent-authority=\"marketing_consents\"");
    expect(client).toContain("if(!consent)");
    expect(client).toContain("role={feedback.kind==='error'?'alert':'status'}");
  });

  it('proves one Playroom package for Alap and Pro and exposes contextual locked/available capabilities from real manifests',()=>{
    for(const capability of[alap,pro]){
      const template=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V20_TEMPLATE_PACKAGE);
      const plan=planStorefrontTemplateInstallation({template,componentRegistry:registry,capability});
      expect(plan.gate.ok,capability.plan).toBe(true);
      expect(plan.pages).toHaveLength(14);
    }
    const product=playroomPage('product');
    const alapItems=listStorefrontContextualCapabilityOpportunities({document:product,capability:alap});
    const proItems=listStorefrontContextualCapabilityOpportunities({document:product,capability:pro});
    expect(alapItems.find(item=>item.key==='special:scene')?.availability).toBe('locked');
    expect(proItems.find(item=>item.key==='special:scene')?.availability).toBe('available');
    expect(alapItems.find(item=>item.key==='special:compatibility')?.availability).toBe('available');
    expect(alapItems.find(item=>item.key==='fulfillment')?.availability).toBe('available');
    expect(alapItems.find(item=>item.key==='product-documents')?.availability).toBe('available');
    const contact=listStorefrontContextualCapabilityOpportunities({document:playroomPage('contact'),capability:alap});
    expect(contact.find(item=>item.key==='support')?.availability).toBe('available');
    const home=listStorefrontContextualCapabilityOpportunities({document:playroomPage('home'),capability:alap});
    expect(home.find(item=>item.key==='newsletter')?.availability).toBe('available');
  });

  it('mutates Playroom Global Styles without changing commerce content and resets a local add-on style back to inherited',()=>{
    const original=playroomPage('product');
    const styled=setStorefrontGlobalStyleState(original,{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accent:'#22aa88',surface:'#101820',radiusScale:'rounded'}});
    expect(getStorefrontGlobalStyleState(styled).tokens).toMatchObject({accent:'#22aa88',surface:'#101820',radiusScale:'rounded'});
    expect(resolveStorefrontGlobalStyleCssVariables(styled)).toMatchObject({
      '--shoporation-color-accent':'#22aa88',
      '--shoporation-color-surface':'#101820',
      '--shoporation-radius-m':'1.125rem',
    });
    expect(findNode(styled,'playroom-product-fulfillment').config.title).toBe('Hogyan kapod meg?');

    const overridden=setStorefrontNodeStyleSlot(styled,'playroom-product-fulfillment','root','mobile',{backgroundColor:'#334455'});
    const overriddenNode=findNode(overridden,'playroom-product-fulfillment');
    const overrideSlots=overriddenNode.config.styleSlots as Record<string,Record<string,unknown>>;
    expect(resolveStorefrontVisualStyle(overrideSlots.root,'mobile').backgroundColor).toBe('#334455');

    const reset=setStorefrontNodeStyleSlot(overridden,'playroom-product-fulfillment','root','mobile',{});
    const resetNode=findNode(reset,'playroom-product-fulfillment');
    const resetSlots=resetNode.config.styleSlots as Record<string,Record<string,unknown>>;
    expect(resolveStorefrontVisualStyle(resetSlots.root,'mobile').backgroundColor).toBeUndefined();
    expect(resolveStorefrontGlobalStyleCssVariables(reset)['--shoporation-color-surface']).toBe('#101820');
  });

  it.each(['physical','digital','mixed'] as const)('renders Playroom checkout fulfillment state %s through the shared runtime',mode=>{
    const checkout=playroomPage('checkout');
    const html=render(checkout,{commerce:{digitalCommerce:{
      checkoutFulfillment:{
        state:'ready',mode,requiresShipping:mode!=='digital',
        copy:`Acceptance ${mode}`,
        lines:[
          ...(mode!=='digital'?[{id:'physical',name:'Neon Pro Controller',quantity:1,fulfillmentType:'physical'}]:[]),
          ...(mode!=='physical'?[{id:'digital',name:'Orbit Breakers Digital',quantity:1,fulfillmentType:'digital'}]:[]),
        ],
        documentCenterHref:'/fiokom/letoltesek',
      },
      postPurchase:{state:'ready',mode,paymentStatus:'pending',copy:'Fizetés után aktiválódik.',documentCenterHref:'/fiokom/letoltesek'},
    }}});
    expect(html).toContain(`data-fulfillment-mode="${mode}"`);
    expect(html).toContain(`Acceptance ${mode}`);
    if(mode==='digital')expect(html).not.toContain('Neon Pro Controller');
    if(mode==='mixed'){expect(html).toContain('Neon Pro Controller');expect(html).toContain('Orbit Breakers Digital');}
  });

  it('renders Product Documents only with real runtime document data and keeps the empty state absent',()=>{
    const product=playroomPage('product');
    const withDocument=render(product,{commerce:{digitalCommerce:{
      productFulfillment:{state:'ready',mode:'physical',copy:'Fizikai termék.',documentCenterHref:'/fiokom/letoltesek'},
      productDocuments:{state:'ready',documents:[{
        id:'manual-1',kindLabel:'Használati útmutató',title:'Neon Pro Controller kézikönyv',
        description:'Magyar használati útmutató',fileName:'controller-manual.pdf',sizeLabel:'1.2 MB',
        variantSpecific:true,downloadHref:'/api/product-documents/manual-1?variantId=variant-1',
      }]},
    }}});
    expect(withDocument).toContain('data-storefront-digital-commerce="product-documents"');
    expect(withDocument).toContain('Neon Pro Controller kézikönyv');
    expect(withDocument).toContain('controller-manual.pdf');
    const empty=render(product,{commerce:{digitalCommerce:{
      productFulfillment:{state:'ready',mode:'physical',copy:'Fizikai termék.'},
      productDocuments:{state:'ready',documents:[]},
    }}});
    expect(empty).not.toContain('data-storefront-digital-commerce="product-documents"');
  });

  it('renders the customer document center with invoice and merchant warranty while keeping authorities distinct',()=>{
    const account=playroomPage('account');
    const html=render(account,{commerce:{digitalCommerce:{documentsCenter:{
      state:'ready',
      digital:[{id:'game-1',title:'Orbit Breakers Digital',description:'Rendelés: SHOP-1001',status:'available',href:'/api/digital-downloads/asset-1?orderId=order-1'}],
      orderDocuments:[
        {id:'invoice-1',title:'Számla · INV-1001',description:'Rendelés: SHOP-1001',status:'available',href:'/fiokom/letoltesek'},
        {id:'warranty-1',title:'Garancialevél · Neon Pro Controller',description:'Merchant által feltöltött dokumentum',meta:'warranty.pdf',status:'available',href:'/api/order-documents/warranty-1'},
      ],
      productDocuments:[{id:'manual-1',title:'Controller kézikönyv',description:'Neon Pro Controller',meta:'controller-manual.pdf',status:'available',href:'/api/product-documents/manual-1?variantId=variant-1'}],
    },postPurchase:{state:'ready',mode:'mixed',paymentStatus:'paid',hasDocuments:true,documentCenterHref:'/fiokom/letoltesek'}}}});
    expect(html).toContain('data-document-authority="digital"');
    expect(html.match(/data-document-authority="order"/g)?.length).toBe(2);
    expect(html).toContain('data-document-authority="product"');
    expect(html).toContain('Számla · INV-1001');
    expect(html).toContain('Garancialevél · Neon Pro Controller');
    expect(html).toContain('Controller kézikönyv');
  });

  it('keeps Playroom factory fixtures explicit for downloadable, physical and mixed acceptance without creating a local engine',()=>{
    const fixtures=PLAYROOM_V20_TEMPLATE_PACKAGE.demoFixtures??[];
    expect(fixtures.some(item=>item.entityKey==='a3-downloadable-game'&&item.payload.fulfillment_type==='digital')).toBe(true);
    expect(fixtures.some(item=>item.entityKey==='a3-physical-controller'&&item.payload.fulfillment_type==='physical')).toBe(true);
    const source=read('src/lib/builder/templates/playroom-v20.ts');
    expect(source).not.toMatch(/createSignedUrl|digital_entitlements|place_order_provider|payment_secret|shipping_provider/i);
    for(const page of PLAYROOM_V20_TEMPLATE_PACKAGE.pages)expect(page.metadata?.digitalCommerceFactoryAcceptance).toEqual(['downloadable-game','physical-gaming-product','mixed-basket']);
  });
});
