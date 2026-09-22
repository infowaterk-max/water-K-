import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{describe,expect,it}from'vitest';

const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');
const migration=read('supabase/migrations/20260908090900_storefront_template_installation.sql').toLowerCase();
const server=read('src/lib/builder/storefront-template-persistence.ts');

describe('Storefront Runtime Wave 0D template persistence',()=>{
  it('materializes all template page drafts in one database transaction through the single-page authority',()=>{
    expect(migration).toContain('create or replace function public.save_storefront_template_drafts_v1');
    expect(migration).toContain("jsonb_typeof(p_pages)<>'array'");
    expect(migration).toContain('jsonb_array_length(p_pages)>32');
    expect(migration).toContain('v_result:=public.save_storefront_page_draft_v1(');
    expect(migration).toContain("p_operation_key||':p'||lpad(v_index::text,2,'0')");
    expect(migration).toContain("raise exception 'storefront_template_page_key_duplicate'");
    expect(migration).toContain("raise exception 'storefront_template_page_type_duplicate'");
  });

  it('serializes parent-operation replays, fingerprints page payloads and emits one explicit template-level audit record',()=>{
    expect(migration).toContain("pg_advisory_xact_lock(");
    expect(migration).toContain("'storefront-template:'||p_instance_id::text||':'||p_operation_key");
    expect(migration).toContain("action='storefront.template_drafts_materialized'");
    expect(migration).toContain("metadata->>'operationkey'=p_operation_key");
    expect(migration).toContain("v_existing->'pages'->v_index->>'documentsha256'");
    expect(migration).toContain("p_pages->v_index->>'documentsha256'");
    expect(migration).toContain("raise exception 'storefront_template_operation_key_conflict'");
    expect(migration).toContain("'storefront.template_drafts_materialized'");
    expect(migration).toContain("'mutationscope','storefront_page_drafts_only'");
  });

  it('keeps the RPC service-role only and rechecks storefront management authority',()=>{
    expect(migration).toContain('if not public.can_manage_storefront(p_instance_id,p_actor_user_id)');
    expect(migration).toContain('revoke all on function public.save_storefront_template_drafts_v1(uuid,uuid,text,integer,jsonb,text)');
    expect(migration).toContain('grant execute on function public.save_storefront_template_drafts_v1(uuid,uuid,text,integer,jsonb,text)');
    expect(migration).toContain('to service_role;');
  });

  it('has regression evidence that template materialization does not write commerce/customer/catalog tables',()=>{
    const protectedTables=['products','product_variants','orders','customers','profiles','customer_instance_roles','b2b_accounts','collections'];
    for(const table of protectedTables){
      expect(migration).not.toMatch(new RegExp(`(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`));
    }
  });

  it('exposes a current-store server helper that sends only page-schema drafts to the template RPC',()=>{
    expect(server).toContain("requireCurrentStoreContext('store.manage')");
    expect(server).toContain("admin.rpc('save_storefront_template_drafts_v1'");
    expect(server).toContain('hashStorefrontPageDocument(page.document)');
    expect(server).toContain("mutationScope:'storefront_page_drafts_only'");
    expect(server).not.toContain('.from(');
    expect(server).not.toContain("from('products')");
    expect(server).not.toContain("from('orders')");
    expect(server).not.toContain("from('customers')");
  });
});
