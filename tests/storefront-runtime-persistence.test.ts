import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{describe,expect,it}from'vitest';

const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');
const migration=read('supabase/migrations/20260908070700_storefront_runtime_persistence.sql').toLowerCase();
const server=read('src/lib/builder/storefront-persistence.ts');

describe('Storefront Runtime Wave 0B persistence',()=>{
  it('creates tenant-scoped page heads, immutable revisions, preview sessions and lifecycle evidence',()=>{
    for(const table of['storefront_pages','storefront_page_revisions','storefront_preview_sessions','storefront_page_events']){
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on public.${table} from public,anon,authenticated`);
    }
    expect(migration).toContain('unique(instance_id,page_key)');
    expect(migration).toContain('unique(instance_id,page_id,revision_number)');
    expect(migration).toContain('foreign key(instance_id,page_id) references public.storefront_pages(instance_id,id)');
    expect(migration).toContain('foreign key(instance_id,page_id,revision_id)');
    expect(migration).toContain('references public.storefront_page_revisions(instance_id,page_id,id)');
  });

  it('keeps revision and event history append-only and preview capabilities revocable without identity mutation',()=>{
    expect(migration).toContain("raise exception 'storefront_revision_immutable'");
    expect(migration).toContain("raise exception 'storefront_event_immutable'");
    expect(migration).toContain("raise exception 'storefront_preview_delete_forbidden'");
    expect(migration).toContain("raise exception 'storefront_preview_identity_immutable'");
    expect(migration).toContain('before update or delete on public.storefront_page_revisions');
    expect(migration).toContain('before update or delete on public.storefront_page_events');
    expect(migration).toContain('before update or delete on public.storefront_preview_sessions');
  });

  it('uses optimistic concurrency and idempotency for draft, publish and rollback',()=>{
    expect(migration).toContain('create or replace function public.save_storefront_page_draft_v1');
    expect(migration).toContain('p_expected_draft_revision integer');
    expect(migration).toContain("raise exception 'storefront_draft_stale'");
    expect(migration).toContain('unique(instance_id,operation_key)');
    expect(migration).toContain("raise exception 'storefront_operation_key_conflict'");
    expect(migration).toContain('create or replace function public.publish_storefront_page_v1');
    expect(migration).toContain('create or replace function public.rollback_storefront_page_v1');
    expect(migration).toContain("raise exception 'storefront_published_stale'");
    expect(migration).toContain("'rollback_published'");
  });

  it('publishes and rolls back by creating new immutable monotonic revisions instead of rewriting history',()=>{
    expect(migration).toContain("v_page.next_revision,'published'");
    expect(migration).toContain('v_draft.document,v_draft.document_sha256,v_draft.id');
    expect(migration).toContain('v_target.document,v_target.document_sha256,v_target.id');
    expect(migration).toContain('set published_revision_id=v_revision.id,next_revision=v_page.next_revision+1');
    expect(migration).not.toContain('update public.storefront_page_revisions set document=');
  });

  it('keeps all mutations service-only and verifies current owner/admin authority again inside the transaction',()=>{
    expect(migration).toContain('create or replace function public.can_manage_storefront');
    expect(migration).toContain("public.has_store_role(p_instance_id,array['owner','admin'],p_user_id)");
    expect((migration.match(/if not public\.can_manage_storefront\(p_instance_id,p_actor_user_id\)/g)??[]).length).toBeGreaterThanOrEqual(5);
    for(const rpc of[
      'save_storefront_page_draft_v1(uuid,uuid,text,text,integer,text,integer,jsonb,text,integer,text)',
      'publish_storefront_page_v1(uuid,uuid,uuid,integer,text)',
      'rollback_storefront_page_v1(uuid,uuid,uuid,integer,integer,text)',
      'create_storefront_preview_session_v1(uuid,uuid,uuid,integer,text,timestamptz,text)',
      'revoke_storefront_preview_session_v1(uuid,uuid,uuid,text)',
    ]){
      expect(migration).toContain(`revoke all on function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
    expect(migration).toContain('to service_role;');
  });

  it('binds previews to hashed immutable draft revisions with bounded expiry and no plaintext token persistence',()=>{
    expect(migration).toContain("token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$')");
    expect(migration).toContain("p_expires_at>now()+interval '24 hours'");
    expect(migration).toContain("revision_number=p_revision_number and kind='draft'");
    expect(server).toContain("randomBytes(32).toString('base64url')");
    expect(server).toContain("createHash('sha256').update(token).digest('hex')");
    expect(server).toContain(".eq('token_hash',tokenHash).is('revoked_at',null).gt('expires_at',now)");
    expect(server).not.toContain('p_token:token');
  });

  it('uses current store RBAC in the server API and records atomic admin audit evidence',()=>{
    expect((server.match(/requireCurrentStoreContext\('store\.manage'\)/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect(server).toContain("requireCurrentStoreContext('store.read')");
    expect(server).toContain("admin.rpc('save_storefront_page_draft_v1'");
    expect(server).toContain("admin.rpc('publish_storefront_page_v1'");
    expect(server).toContain("admin.rpc('rollback_storefront_page_v1'");
    expect(server).toContain(".eq('id',page.published_revision_id)");
    expect((migration.match(/insert into public\.admin_audit_log/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect(migration).toContain("'audit_source','database_rpc'");
  });

  it('persists Page Schema identity and a deterministic SHA-256 document evidence value',()=>{
    expect(migration).toContain('storefront_assert_page_document_identity');
    expect(migration).toContain("coalesce(p_document->>'pagekey','')<>p_page_key");
    expect(migration).toContain("coalesce(p_document->>'pagetype','')<>p_page_type");
    expect(migration).toContain("coalesce(p_document->>'templatekey','')<>p_template_key");
    expect(migration).toContain('pg_catalog.octet_length(p_document::text)>2097152');
    expect(server).toContain("createHash('sha256').update(JSON.stringify(canonicalize(document))).digest('hex')");
  });
});
