import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';
import{CANONICAL_ACCOUNT_CAPABILITIES,resolveAccountCapabilities,resolveTemplateAccountCapabilityOptIns}from'@/lib/account/account-capabilities';
import{normalizeStorefrontTemplateRuntimeComposition}from'@/lib/builder/storefront-template-runtime-normalization';
import{createStorefrontTemplatePreviewBindingContext}from'@/lib/builder/storefront-template-preview-demo';
import{augmentStorefrontDigitalCommercePreviewContext}from'@/lib/builder/storefront-digital-commerce-preview';
import type{StorefrontComponentNode}from'@/lib/builder/storefront-runtime';
import{PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE}from'@/lib/builder/templates/playroom-v19-canonical';
import{LOOT_VAULT_V2_TEMPLATE_PACKAGE}from'@/lib/builder/templates/gaming/loot-vault/v2';
import{STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES}from'@/lib/builder/storefront-template-catalog';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const flatten=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...flatten(node.children??[])]);

describe('shared storefront account capability navigation',()=>{
 it('keeps the platform IA rail as the only authenticated account navigation authority',()=>{
  const account=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
  const normalized=normalizeStorefrontTemplateRuntimeComposition(account);
  expect(flatten(normalized.sections).filter(node=>node.componentKey==='account.capability-navigation')).toHaveLength(0);
  const shell=read('src/components/account/storefront-account-shell.tsx'),rail=read('src/components/account/account-subnav.tsx');
  expect(shell).toContain('data-account-navigation-authority="platform-ia"');
  expect(rail).toContain('data-account-navigation-source="platform-ia"');
  expect(rail).toContain('className="accountCapabilityRail"');
 });
 it('derives preview capabilities from the same canonical resolver without creating a second rendered navigation surface',()=>{
  const account=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
  const base=createStorefrontTemplatePreviewBindingContext({template:PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,page:account});
  const context=augmentStorefrontDigitalCommercePreviewContext({template:PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,page:account,context:base});
  const items=((context.commerce as any).digitalCommerce.accountCapabilities.items) as Array<{key:string;label:string;href:string}>;
  expect(items.map(item=>item.key)).toEqual(CANONICAL_ACCOUNT_CAPABILITIES.filter(item=>item.optional!=='collection').map(item=>item.key));
  expect(items.some(item=>item.key==='collection')).toBe(false);
 });
 it('opts the shared Collection capability in only from canonical account metadata',()=>{
  const account=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
  expect(account.metadata?.collectionTracker).toBe('shared-account-capability-v1');
  expect(resolveTemplateAccountCapabilityOptIns(account.metadata)).toEqual(['collection']);
  const enabled=resolveAccountCapabilities({showLoyalty:false,showB2BOrganization:false,showB2BQuotes:false,templateCapabilities:resolveTemplateAccountCapabilityOptIns(account.metadata)});
  expect(enabled.some(item=>item.key==='collection'&&item.href==='/fiokom/gyujtemenyem')).toBe(true);
  const base=createStorefrontTemplatePreviewBindingContext({template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,page:account});
  const context=augmentStorefrontDigitalCommercePreviewContext({template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,page:account,context:base});
  const items=((context.commerce as any).digitalCommerce.accountCapabilities.items) as Array<{key:string;href:string}>;
  expect(items).toEqual(expect.arrayContaining([expect.objectContaining({key:'collection',href:'/fiokom/gyujtemenyem'})]));
 });
 it('removes stale template-local account navigation from every implemented template',()=>{
  for(const template of [...STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE]){
   const account=template.pages.find(page=>page.pageType==='account');if(!account)continue;
   const nodes=flatten(normalizeStorefrontTemplateRuntimeComposition(account).sections);
   expect(nodes.filter(node=>node.componentKey==='account.capability-navigation'),template.manifest.templateKey).toHaveLength(0);
   expect(nodes.some(node=>node.componentKey==='commerce.account-downloads'),template.manifest.templateKey).toBe(false);
   expect(nodes.some(node=>node.componentKey==='commerce.account-documents'),template.manifest.templateKey).toBe(false);
   expect(nodes.some(node=>node.componentKey==='commerce.documents-center'),template.manifest.templateKey).toBe(false);
  }
 });
 it('keeps the complete capability set in the shared rail resolver',()=>{
  expect(CANONICAL_ACCOUNT_CAPABILITIES.map(item=>item.key)).toEqual(expect.arrayContaining(['overview','orders','downloads','documents','wishlist','collection','cases','returns','profile','marketing']));
 });
});
