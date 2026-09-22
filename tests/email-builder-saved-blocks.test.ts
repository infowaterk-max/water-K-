import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=()=>read('supabase/migrations/20260911132500_email_builder_saved_blocks.sql');

describe('Email Builder saved blocks',()=>{
  it('stores reusable blocks tenant-scoped with RLS and FK indexes',()=>{
    const sql=migration();
    expect(sql).toContain('create table if not exists public.email_saved_blocks');
    expect(sql).toContain('instance_id uuid not null references public.webshop_instances(id)');
    expect(sql).toContain('email_saved_blocks_instance_idx');
    expect(sql).toContain('email_saved_blocks_created_by_idx');
    expect(sql).toContain('email_saved_blocks_updated_by_idx');
    expect(sql).toContain('alter table public.email_saved_blocks enable row level security');
    expect(sql).toContain('create policy email_saved_blocks_store_read');
    expect(sql).toContain('public.can_read_store(instance_id)');
  });

  it('keeps saved-block writes behind marketing authority and service-role-only RPCs',()=>{
    const sql=migration();
    expect(sql).toContain('create or replace function public.save_email_saved_block_v1');
    expect(sql).toContain('create or replace function public.delete_email_saved_block_v1');
    expect(sql.match(/public\.can_manage_marketing\(p_instance_id,p_actor\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain('revoke all on function public.save_email_saved_block_v1(uuid,uuid,text,jsonb) from public,anon,authenticated');
    expect(sql).toContain('revoke all on function public.delete_email_saved_block_v1(uuid,uuid,uuid) from public,anon,authenticated');
    expect(sql).toContain('grant execute on function public.save_email_saved_block_v1(uuid,uuid,text,jsonb) to service_role');
    expect(sql).toContain('grant execute on function public.delete_email_saved_block_v1(uuid,uuid,uuid) to service_role');
    expect(sql).toContain("'email.saved_block_created'");
    expect(sql).toContain("'email.saved_block_deleted'");
  });

  it('validates list/create/delete API boundaries and tenant evidence',()=>{
    const collection=read('src/app/api/admin/email-builder/saved-blocks/route.ts');
    const item=read('src/app/api/admin/email-builder/saved-blocks/[id]/route.ts');
    for(const source of[collection,item]){
      expect(source).toContain("getAdminRequestUser('marketing.manage')");
      expect(source).toContain("requireCurrentStoreContext('marketing.manage')");
    }
    expect(collection).toContain('emailBlockSchema');
    expect(collection).toContain('sameOrigin');
    expect(collection).toContain("rpc('save_email_saved_block_v1'");
    expect(collection).toContain(".eq('instance_id',auth.scope.instanceId)");
    expect(item).toContain('sameOrigin');
    expect(item).toContain("rpc('delete_email_saved_block_v1'");
    expect(item).toContain(".eq('instance_id',auth.scope.instanceId)");
  });

  it('makes the custom block library real without auto-saving or activating the draft',()=>{
    const library=read('src/components/admin/email-builder-saved-block-library.tsx');
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(library).toContain("fetch('/api/admin/email-builder/saved-blocks'");
    expect(library).toContain("method:'POST'");
    expect(library).toContain("method:'DELETE'");
    expect(library).toContain('Kijelölt blokk mentése');
    expect(library).toContain('＋ Beszúrás');
    expect(editor).toContain('SavedBlockLibrary');
    expect(editor).toContain('function insertSavedBlock');
    expect(editor).toContain('id:newId(source.type)');
    expect(editor).toContain('commit({...document,blocks})');
    expect(library).not.toContain('/activate');
    expect(library).not.toContain('saveDraft');
  });
});