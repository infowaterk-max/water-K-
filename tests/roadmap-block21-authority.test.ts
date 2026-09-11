import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_AUTHORITY,
  storefrontRuntimeResolutionContract,
} from '@/lib/builder/storefront-template-authority';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Roadmap Block 21 — lifecycle authority',()=>{
  it('keeps install/switch draft-only and delegates publish/rollback/preview to the existing canonical RPCs',()=>{
    expect(STOREFRONT_TEMPLATE_AUTHORITY.templateMaterialization).toMatchObject({
      authority:'save_storefront_template_drafts_v1',
      output:'draft-revisions-only',
      atomic:true,
      idempotent:true,
      publishes:false,
    });
    expect(STOREFRONT_TEMPLATE_AUTHORITY.pageLifecycle).toMatchObject({
      saveDraft:'save_storefront_page_draft_v1',
      publish:'publish_storefront_page_v1',
      rollback:'rollback_storefront_page_v1',
      preview:'create_storefront_preview_session_v1',
      secondPublicationAuthority:false,
    });
  });

  it('retains server-derived tenant authority and no business-state mutation boundary',()=>{
    expect(STOREFRONT_TEMPLATE_AUTHORITY.tenantIdentity.clientSuppliedAuthority).toBe(false);
    expect(STOREFRONT_TEMPLATE_AUTHORITY.tenantIdentity.serverScopeRequired).toBe(true);
    expect(Object.values(STOREFRONT_TEMPLATE_AUTHORITY.businessMutationBoundary).every(value=>value===false)).toBe(true);
  });

  it('uses the same schema semantics for preview and published runtime resolution without activation',()=>{
    expect(storefrontRuntimeResolutionContract('preview',{pageKey:'home'})).toMatchObject({source:'preview',samePageSchemaSemantics:true,activatesTenant:false});
    expect(storefrontRuntimeResolutionContract('published',{pageType:'home'})).toMatchObject({source:'published',samePageSchemaSemantics:true,activatesTenant:false});
    expect(()=>storefrontRuntimeResolutionContract('published',{pageKey:''})).toThrow('STOREFRONT_PAGE_KEY_REQUIRED');
  });

  it('reuses the proven 0004/0005 persistence authority instead of adding a duplicate Block 21 schema',()=>{
    const runtime=read('supabase/customer-baseline/migrations/0004_storefront_runtime_persistence.sql');
    const install=read('supabase/customer-baseline/migrations/0005_storefront_template_installation.sql');
    expect(runtime).toContain('create table if not exists public.storefront_pages');
    expect(runtime).toContain('create or replace function public.publish_storefront_page_v1');
    expect(runtime).toContain('create or replace function public.rollback_storefront_page_v1');
    expect(runtime).toContain('create or replace function public.create_storefront_preview_session_v1');
    expect(install).toContain('create or replace function public.save_storefront_template_drafts_v1');
    expect(install).toContain('storefront_page_drafts_only');
  });
});
