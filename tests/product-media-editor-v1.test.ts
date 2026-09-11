import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const migrationPath='supabase/migrations/20260911051500_product_media_editor_v1.sql';
const baselinePath='supabase/customer-baseline/migrations/0013_product_media_editor_v1.sql';

describe('Product Media Editor v1',()=>{
 it('keeps production and customer-baseline migration byte-identical',()=>{
  expect(read(migrationPath)).toBe(read(baselinePath));
 });
 it('stores non-destructive presentation metadata and tenant presets',()=>{
  const sql=read(migrationPath);
  expect(sql).toContain('create table if not exists public.product_media_presentations');
  expect(sql).toContain("context in('card','detail','mobile')");
  expect(sql).toContain('zoom between 1 and 3');
  expect(sql).toContain('offset_x between -50 and 50');
  expect(sql).toContain('create table if not exists public.product_media_presets');
  expect(sql).not.toMatch(/update public\.product_media set storage_path/i);
 });
 it('keeps all media mutations service-role mediated and permission checked',()=>{
  const sql=read(migrationPath);
  for(const fn of['save_product_media_presentations_v1','create_product_media_preset_v1','delete_product_media_preset_v1','apply_product_media_to_variants_v1']){
   expect(sql).toContain(`revoke all on function public.${fn}`);
   expect(sql).toContain(`grant execute on function public.${fn}`);
  }
  expect(sql.match(/can_manage_catalog\(p_instance_id,p_actor\)/g)?.length).toBeGreaterThanOrEqual(4);
  expect(sql).toContain("raise exception 'CATALOG_MEDIA_VARIANT_SCOPE_INVALID'");
  expect(sql).toContain("p_mode not in('same-media','presentation-only')");
 });
 it('requires a draft product for presentation changes and variant fan-out',()=>{
  const sql=read(migrationPath);
  expect(sql.match(/active=false\) then raise exception 'PRODUCT_DRAFT_REQUIRED'/g)?.length).toBe(2);
 });
 it('does not create variants during media application and skips missing own images for presentation-only mode',()=>{
  const sql=read(migrationPath),apply=sql.slice(sql.indexOf('create or replace function public.apply_product_media_to_variants_v1'));
  expect(apply).not.toMatch(/insert into public\.product_variants/i);
  expect(apply).toContain('primary_media_id is null');
  expect(apply).toContain("'skippedVariantIds'");
 });
 it('protects the API and validates bounded visual transforms',()=>{
  const route=read('src/app/api/admin/catalog/media/presentation/route.ts');
  expect(route).toContain("getAdminRequestUser('catalog.manage')");
  expect(route).toContain("requireCurrentStoreContext('catalog.manage')");
  expect(route).toContain('zoom:z.number().min(1).max(3)');
  expect(route).toContain("z.enum(['same-media','presentation-only'])");
  expect(route).toContain("admin.rpc('apply_product_media_to_variants_v1'");
 });
 it('offers visual drag/zoom, three live previews, presets and transparent variant groups',()=>{
  const editor=read('src/components/admin/product-media-editor.tsx'),meta=read('src/lib/catalog-media-presentation.ts');
  for(const label of['Termékkártya','Termékoldal','Mobil'])expect(meta).toContain(label);
  for(const label of['Fogd meg és húzd a képet','Preset mentése','Azonos szín · minden méret','Azonos méret · minden szín','Minden létező variáns'])expect(editor).toContain(label);
  expect(editor).toContain('MEDIA_PRESENTATION_CONTEXTS.map');
  expect(editor).toContain('onPointerMove={moveDrag}');
  expect(editor).toContain('type="range"');
  expect(editor).toContain("mode==='presentation-only'");
  expect(editor).toContain('A rendszer nem hoz létre új variánst.');
  expect(editor).not.toMatch(/window\.(alert|confirm|prompt)/);
 });
 it('persists the current source edit before server-side variant fan-out',()=>{
  const editor=read('src/components/admin/product-media-editor.tsx');
  const apply=editor.slice(editor.indexOf('async function applyVariants'));
  expect(apply.indexOf('persistCurrentPresentation(normalized)')).toBeGreaterThanOrEqual(0);
  expect(apply.indexOf("action:'applyVariants'")).toBeGreaterThan(apply.indexOf('persistCurrentPresentation(normalized)'));
 });
 it('keeps parent variant state synchronized so autosave cannot restore stale media assignments',()=>{
  const intake=read('src/components/admin/product-intake-editor.tsx');
  expect(intake).toContain("if(mode==='same-media'){setVariants");
  expect(intake).toContain('onVariantApply={applyMediaToVariants}');
  expect(intake).toContain('onPresentation={updateMediaPresentation}');
 });
 it('keeps image editing discoverable without hover-only controls',()=>{
  const manager=read('src/components/admin/product-media-manager.tsx'),css=read('src/components/admin/product-media-manager.module.css');
  expect(manager).toContain('✎ Szerkesztés');
  expect(css).toContain('.mediaActions{');
  expect(css).toContain('opacity:1');
 });
 it('loads presentations and presets in both edit and new-product flows',()=>{
  const edit=read('src/app/admin/termekek/feltoltes/[id]/page.tsx'),fresh=read('src/app/admin/termekek/feltoltes/uj/page.tsx');
  expect(edit).toContain("from('product_media_presentations')");
  expect(edit).toContain("from('product_media_presets')");
  expect(fresh).toContain("from('product_media_presets')");
  expect(edit).not.toContain('as never');expect(fresh).not.toContain('as never');
 });
 it('propagates saved media presentation into the storefront runtime',()=>{
  const catalog=read('src/lib/catalog-server.ts'),product=read('src/lib/catalog.ts'),page=read('src/app/termek/[slug]/page.tsx'),image=read('src/components/catalog/product-media-image.tsx');
  expect(catalog).toContain("from('product_media_presentations')");
  expect(catalog).toContain('imagePresentation:');
  expect(product).toContain('imagePresentation?:MediaPresentationSet');
  expect(page).toContain('presentation={product.imagePresentation}');
  expect(page).toContain('context="detail"');
  expect(image).toContain("objectFit:'contain'");
 });
 it('preserves Product Media Editor as baseline 0013 while later roadmap work may advance the ordered baseline',()=>{
  const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'))as{status:string;freshInstallProofRequired:boolean;notes:string};
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(read(baselinePath)).toBe(read(migrationPath));
  expect(manifest.notes).toContain('Product Media Editor adds 0013');
  expect(manifest.notes).toContain('0001-0017');
 });
});
