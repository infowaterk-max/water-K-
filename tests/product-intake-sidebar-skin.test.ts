import{readFileSync}from'node:fs';
import{describe,expect,test}from'vitest';
const read=(path:string)=>readFileSync(path,'utf8');

describe('Product Intake sidebar skin isolation',()=>{
 test('keeps the canonical Shoperation quick-task sidebar skin on every Product Intake route',()=>{
  const layout=read('src/app/admin/termekek/feltoltes/layout.tsx');
  const css=read('src/app/admin/termekek/feltoltes/product-intake-sidebar.css');
  expect(layout).toContain("import'./product-intake-sidebar.css'");
  expect(css).toContain('.adminDiscoveryLayer');
  expect(css).toContain('background:transparent!important');
  expect(css).toContain('.adminQuickTasks a');
  expect(css).toContain('background:rgba(255,255,255,.045)!important');
  expect(css).toContain('color:#dce9e5!important');
  expect(css).toContain('.adminHelpDiscovery summary');
  expect(css).toContain('color:#63d2ba!important');
 });
});
