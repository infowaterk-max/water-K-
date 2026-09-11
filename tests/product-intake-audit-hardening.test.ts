import{readFileSync}from'node:fs';
import{describe,expect,test}from'vitest';
const read=(path:string)=>readFileSync(path,'utf8');

describe('Product Intake audit hardening',()=>{
 test('new products start from a real blank draft instead of demo sneaker data',()=>{
  const page=read('src/app/admin/termekek/feltoltes/uj/page.tsx'),editor=read('src/components/admin/product-intake-editor.tsx');
  for(const marker of["name:''","shortDescription:''","description:''","baseSku:''","colors:[]","sizes:[]","sku:''"])expect(page).toContain(marker);
  for(const demo of['Shoperation Run sneaker','19677','24990',"'RUN'"])expect(editor).not.toContain(demo);
 });
 test('all eight media items stay manageable and the advertised drag drop is real',()=>{
  const media=read('src/components/admin/product-media-manager.tsx'),css=read('src/components/admin/product-media-manager.module.css');
  expect(media).toContain('const MAX_MEDIA=8');expect(media).toContain('MAX_BYTES=8*1024*1024');
  expect(media).toContain("new Set(['image/jpeg','image/png','image/webp','image/avif'])");
  expect(media).toContain('items.map((item,index)');expect(media).not.toContain('items.slice(0,5)');
  expect(media).toContain('onDragOver');expect(media).toContain('onDrop');expect(media).toContain('event.dataTransfer.files');
  expect(css).toContain('.mediaGrid');expect(css).toContain('[data-drag-active="true"]');
 });
 test('variant regeneration requires Shoperation confirmation when it can destroy entered data',()=>{
  const editor=read('src/components/admin/product-intake-editor.tsx');
  expect(editor).toContain('useShoperationConfirm');expect(editor).toContain('Variánsmátrix újragenerálása');expect(editor).toContain('confirmLabel:\'Újragenerálás\'');expect(editor).toContain('{promptDialog}{confirmDialog}');
  for(const forbidden of['window.alert','window.confirm','window.prompt'])expect(editor).not.toContain(forbidden);
 });
 test('hub catalog search is functional rather than a decorative input',()=>{
  const hub=read('src/app/admin/termekek/feltoltes/page.tsx'),search=read('src/components/admin/product-intake-search.tsx');
  expect(hub).toContain('ProductIntakeSearch');expect(hub).toContain('items={products.map');expect(search).toContain('setQuery');expect(search).toContain('includes(normalized)');expect(search).toContain('/admin/termekek/feltoltes/${item.id}');
 });
});
