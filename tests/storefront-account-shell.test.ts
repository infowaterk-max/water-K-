import{readFileSync}from'node:fs';import{join}from'node:path';import{describe,expect,it}from'vitest';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
describe('storefront account shell',()=>{
 it('renders account subroutes inside the tenant storefront chrome',()=>{
  const shell=read('src/components/account/storefront-account-shell.tsx'),layout=read('src/app/fiokom/layout.tsx');
  expect(layout).toContain('StorefrontAccountShell');
  expect(shell).toContain('resolveCurrentStorefrontAccountRuntimePage');
  expect(shell).toContain("item.componentKey==='account.capability-navigation'");
  expect(shell).toContain("item.componentKey==='system.commerce-header'");
  expect(shell).toContain("item.componentKey==='system.footer'");
  expect(shell).toContain('storefrontAccountRouteContent');
 });
 it('uses the real acceptance account draft while keeping production on published account runtime',()=>{
  const source=read('src/lib/builder/storefront-runtime-source.ts');
  expect(source).toContain('resolveCurrentStorefrontAccountRuntimePage');
  expect(source).toContain("getCurrentStorefrontPageState('account')");
  expect(source).toContain("getStorefrontDigitalCommerceRuntimeModel(instance.id,request)");
  expect(source).toContain("getPublishedStorefrontPage(instance.id,'account')");
  expect(source).toContain("const authored=customerId?materialized:applyTemplateAuthComposition(materialized)");
 });
 it('themes legacy account primitives from storefront design tokens inside the shell',()=>{
  const css=read('src/app/account-workflow.css');
  expect(css).toContain('.storefrontAccountShell .accountPage');
  expect(css).toContain('var(--shoporation-color-background');
  expect(css).toContain('var(--shoporation-color-surface');
  expect(css).toContain('var(--shoporation-color-text');
  expect(css).toContain('var(--shoporation-color-border');
 });
});
