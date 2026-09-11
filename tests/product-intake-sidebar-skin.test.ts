import{readFileSync}from'node:fs';
import{describe,expect,test}from'vitest';
const read=(path:string)=>readFileSync(path,'utf8');

describe('Product Intake sidebar skin isolation',()=>{
 test('binds sidebar isolation to a stable route marker instead of a CSS-module class name',()=>{
  const layout=read('src/app/admin/termekek/feltoltes/layout.tsx'),css=read('src/app/admin/termekek/feltoltes/product-intake-sidebar.css');
  expect(layout).toContain('data-product-intake-route="true"');
  expect(css).toContain('.adminGrid:has([data-product-intake-route="true"])>.adminSide');
  expect(css).not.toContain(':has(.productIntakeScreen)');
  expect(css).toContain('linear-gradient(180deg,#172c29 0%,#11231f 100%)!important');
  expect(css).toContain('.adminQuickTasks a');
  expect(css).toContain('background:rgba(255,255,255,.045)!important');
  expect(css).toContain('.adminNavSectionTrigger[data-active="true"]');
  expect(css).toContain('.adminHelpDiscovery summary');
  expect(css).toContain('.adminStoreLink');
 });
 test('matches the canonical Shoperation workspace sidebar palette',()=>{
  const routeCss=read('src/app/admin/termekek/feltoltes/product-intake-sidebar.css'),canonical=read('src/app/admin/workspace-design-system.css');
  for(const marker of['#172c29','#11231f','#dce9e5','#28b797','#63d2ba']){expect(routeCss).toContain(marker);expect(canonical).toContain(marker)}
 });
});
