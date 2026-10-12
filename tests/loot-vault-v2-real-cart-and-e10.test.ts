import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';
import {createStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-preview-demo';
import {applyAuthoredTemplatePreviewFallbacks} from '@/lib/builder/storefront-template-preview-canonical';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {attachStorefrontPreviewCartNavigation} from '@/lib/builder/storefront-preview-cart-navigation';
import {STOREFRONT_STORY_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-story';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {normalizeStorefrontTemplateRuntimeComposition} from '@/lib/builder/storefront-template-runtime-normalization';
import {ensureStorefrontResponsiveAuthority} from '@/lib/builder/storefront-responsive-isolation';
import {materializeStorefrontFidelityPage} from '@/lib/builder/storefront-fidelity-engine';
import {bindStorefrontExistingCommerceRuntime} from '@/lib/builder/storefront-existing-commerce-bindings';
import {bindStorefrontGrowthMarketingRuntime} from '@/lib/builder/storefront-growth-marketing';
import {PLANS} from '@/lib/plans/catalog';
const read=(p:string)=>readFileSync(p,'utf8');
const template=LOOT_VAULT_V2_TEMPLATE_PACKAGE;
function previewContext(pageType:'home'|'product'){
  const page=template.pages.find(p=>p.pageType===pageType)!;
  return augmentStorefrontDigitalCommercePreviewContext({template,page,context:applyAuthoredTemplatePreviewFallbacks({page,context:createStorefrontTemplatePreviewBindingContext({template,page})})});
}
describe('F35 actual Loot Vault cart and editorial contract',()=>{
  it('binds isolated demo stock and real purchase identity, never a template-wide inventory default',()=>{
    const home=previewContext('home') as {catalog:{featured:Array<{productId:string;slug:string;unitPrice:number;availableQuantity:number;stockLabel:string}>}};
    expect(home.catalog.featured.length).toBeGreaterThan(2);
    expect(home.catalog.featured[0]).toMatchObject({productId:'preview-loot-vault-vault-sentinel',slug:'preview-loot-vault-vault-sentinel',unitPrice:89990,availableQuantity:6});
    const preorder=home.catalog.featured.find(p=>p.stockLabel==='Előrendelhető');
    expect(preorder?.availableQuantity).toBe(0);
    const pdp=previewContext('product') as {product:{id:string;slug:string};pricing:{unitPrice:number};inventory:{availableQuantity:number}};
    expect(pdp.product).toMatchObject({id:'preview-loot-vault-vault-sentinel',slug:'preview-loot-vault-vault-sentinel'});
    expect(pdp.pricing.unitPrice).toBe(59990);
    expect(pdp.inventory.availableQuantity).toBe(6);
    expect(read('src/lib/builder/storefront-digital-commerce-preview.ts')).toContain("input.template?.manifest.templateKey==='gaming.loot-vault'");
  });
  it('retains stock/identity guarded cart authority for both product cards and PDP',()=>{
    const grid=read('src/components/builder/storefront-commerce.tsx');
    const client=read('src/components/builder/storefront-purchase-controls-client.tsx');
    expect(grid).toContain('showPurchaseActions=bool(config.showPurchaseActions,false)');
    expect(grid).toContain('<StorefrontPurchaseControlsClient compact productId={product.productId}');
    expect(client).toContain('const purchasable=canIdentify&&maximum>=minimum');
    expect(client).toContain('disabled={!purchasable}');
    expect(client).toContain('add({productId,variantId,slug,name,unitPrice,quantity,minimumQuantity:minimum,orderMultiple:step})');
    expect(client).toContain('cartHref={cartHref}');
  });
  it('keeps confirmation navigation within the exact preview candidate, not the public cart route',()=>{
    const page=template.pages.find(p=>p.pageType==='product')!;
    const rewritten=attachStorefrontPreviewCartNavigation(page,{templateKey:'gaming.loot-vault',templateVersion:2,viewport:'mobile',factoryCandidate:true});
    const nodes:typeof page.sections[number][]=[];
    const visit=(items:typeof page.sections)=>items.forEach(node=>{nodes.push(node);if(node.children)visit(node.children)});
    visit(rewritten.sections);
    expect(nodes.find(n=>n.componentKey==='commerce.purchase-controls')?.config.cartHref).toBe('/storefront-template-preview?template=gaming.loot-vault&version=2&page=cart&viewport=mobile&factory=1');
    const confirmation=read('src/components/cart/add-to-cart-confirmation.tsx');
    expect(confirmation).toContain('cartHref.startsWith');
    expect(confirmation).toContain('<Link href={safeCartHref}');
  });
  it('uses one real authored story.feature without losing story.index on the blog index',()=>{
    const page=template.pages.find(p=>p.pageType==='blog-index')!;
    const nodes:typeof page.sections[number][]=[];
    const visit=(items:typeof page.sections)=>items.forEach(node=>{nodes.push(node);if(node.children)visit(node.children)});
    visit(page.sections);
    const feature=nodes.filter(n=>n.componentKey==='story.feature');
    expect(feature).toHaveLength(1);
    expect(feature[0]!.config).toMatchObject({title:'A tárgy mögött mindig van egy világ.',ctaLabel:'Tovább olvasom'});
    expect(nodes.some(n=>n.componentKey==='story.index')).toBe(true);
    expect(read('src/components/builder/storefront-story.tsx')).toContain('data-storefront-story="feature"');
  });
  it('allows and actually validates the authored blog-index Story Feature through the shared runtime manifest',()=>{
    const feature=STOREFRONT_STORY_COMPONENT_DEFINITIONS.find(definition=>definition.manifest.componentKey==='story.feature');
    expect(feature?.manifest.pageTypes).toContain('blog-index');
    const page=template.pages.find(candidate=>candidate.pageType==='blog-index')!;
    const normalized=normalizeStorefrontTemplateRuntimeComposition(page);
    const runtimePage=materializeStorefrontFidelityPage(bindStorefrontGrowthMarketingRuntime(bindStorefrontExistingCommerceRuntime(ensureStorefrontResponsiveAuthority(normalized))),'desktop');
    const result=validateStorefrontPageDocument(runtimePage,createStorefrontVisualBuilderComponentRegistry(),{plan:'pro',features:[...PLANS.pro.features]});
    expect(result.violations.filter(violation=>violation.severity==='error')).toEqual([]);
    expect(result.ok).toBe(true);
  });

});
