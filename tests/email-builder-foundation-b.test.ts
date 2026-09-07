import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
import{validateEmailDocumentForActivation}from'../src/lib/email-builder/validation';
import{emailRenderContextSchema}from'../src/lib/email-builder/context-schema';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const sql=()=>read('supabase/migrations/20260907214000_email_builder_foundation_b.sql').toLowerCase().replace(/\s+/g,' ');
const indexSql=()=>read('supabase/migrations/20260907215500_email_builder_foundation_b_indexes.sql').toLowerCase().replace(/\s+/g,' ');

describe('Email Builder Foundation B database contract',()=>{
  it('creates tenant-scoped brand, template and immutable version storage with RLS and least-privilege grants',()=>{
    const source=sql();
    for(const table of['email_brand_kits','email_templates','email_template_versions']){
      expect(source).toContain(`create table if not exists public.${table}`);
      expect(source).toContain(`alter table public.${table} enable row level security`);
      expect(source).toContain(`revoke all on table public.${table} from anon,authenticated`);
    }
    expect(source).toContain('instance_id uuid not null');
    expect(source).toContain('grant select on table public.email_brand_kits,public.email_templates,public.email_template_versions to authenticated');
    expect(source).toContain('grant all on table public.email_brand_kits,public.email_templates,public.email_template_versions to service_role');
    expect(source).toContain('create unique index if not exists email_brand_kits_default_uidx');
    expect(source).toContain('create trigger email_template_versions_immutable before update or delete');
    expect(source).toContain("raise exception 'email_template_version_immutable'");
  });

  it('covers Email Builder foreign keys with supporting indexes',()=>{
    const source=indexSql();
    for(const name of[
      'email_brand_kits_created_by_idx',
      'email_brand_kits_updated_by_idx',
      'email_templates_created_by_idx',
      'email_templates_updated_by_idx',
      'email_templates_brand_kit_tenant_fk_idx',
      'email_templates_active_version_fk_idx',
      'email_template_versions_created_by_idx',
      'email_template_versions_template_fk_idx',
    ])expect(source).toContain(`create index if not exists ${name}`);
  });

  it('keeps all write RPCs tenant-bound, permission-checked and service-role only',()=>{
    const source=sql();
    for(const fn of['save_default_email_brand_kit_v1','create_email_template_v1','save_email_template_draft_v1','activate_email_template_v1']){
      expect(source).toContain(`create or replace function public.${fn}`);
      expect(source).toContain(`revoke all on function public.${fn}`);
      expect(source).toContain(`grant execute on function public.${fn}`);
    }
    expect((source.match(/public\.can_manage_marketing\(p_instance_id,p_actor\)/g)??[]).length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("raise exception 'email_document_identity_mismatch'");
    expect(source).toContain("raise exception 'email_brand_kit_tenant_mismatch'");
  });

  it('activates by inserting a new immutable version and atomically points the template at it',()=>{
    const source=sql();
    const start=source.indexOf('create or replace function public.activate_email_template_v1');
    const activation=source.slice(start);
    expect(activation).toContain('for update');
    expect(activation).toContain('insert into public.email_template_versions');
    expect(activation).toContain('coalesce(max(version_number),0)+1');
    expect(activation).toContain('set active_version_id=v_version,status=\'active\'');
    expect(activation).toContain("'email.template_activated'");
  });
});

describe('Email Builder Foundation B API contract',()=>{
  it('guards preview and mutation APIs with origin, RBAC and current tenant context',()=>{
    for(const path of[
      'src/app/api/admin/email-builder/preview/route.ts',
      'src/app/api/admin/email-builder/templates/route.ts',
      'src/app/api/admin/email-builder/templates/[id]/route.ts',
      'src/app/api/admin/email-builder/templates/[id]/activate/route.ts',
      'src/app/api/admin/email-builder/brand-kit/route.ts',
    ]){
      const source=read(path);
      expect(source).toContain("getAdminRequestUser('marketing.manage')");
      expect(source).toContain("requireCurrentStoreContext('marketing.manage')");
    }
    for(const path of[
      'src/app/api/admin/email-builder/preview/route.ts',
      'src/app/api/admin/email-builder/templates/route.ts',
      'src/app/api/admin/email-builder/templates/[id]/route.ts',
      'src/app/api/admin/email-builder/templates/[id]/activate/route.ts',
      'src/app/api/admin/email-builder/brand-kit/route.ts',
    ])expect(read(path)).toContain('sameOrigin');
  });

  it('scopes persisted reads by instance and requires evidence after writes',()=>{
    const create=read('src/app/api/admin/email-builder/templates/route.ts');
    const save=read('src/app/api/admin/email-builder/templates/[id]/route.ts');
    const activate=read('src/app/api/admin/email-builder/templates/[id]/activate/route.ts');
    const brand=read('src/app/api/admin/email-builder/brand-kit/route.ts');
    expect(create).toContain(".eq('instance_id',auth.scope.instanceId)");
    expect(save).toContain(".eq('instance_id',auth.scope.instanceId)");
    expect(activate).toContain(".eq('instance_id',scope.instanceId)");
    expect(brand).toContain(".eq('instance_id',auth.scope.instanceId)");
    expect(create).toContain('létrehozásának bizonyítéka');
    expect(save).toContain('mentés bizonyítéka');
    expect(activate).toContain('aktív verzió bizonyítéka');
    expect(brand).toContain('mentésének bizonyítéka');
  });
});

describe('Email Builder activation and preview validation',()=>{
  it('blocks a marketing document without a footer at activation time',()=>{
    const result=validateEmailDocumentForActivation({schemaVersion:1,templateKey:'campaign.test',family:'campaign',purpose:'marketing',language:'hu',subject:'Teszt',preheader:'Előnézet',design:{},metadata:{},blocks:[{id:'h1',type:'heading',version:1,content:{text:'Teszt',level:'h1',align:'left'},style:{},responsive:{}}]});
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Marketing email requires a footer before activation');
  });

  it('rejects unsafe preview URLs before rendering',()=>{
    const parsed=emailRenderContextSchema.safeParse({store:{name:'Shop',siteUrl:'javascript:alert(1)'},customer:{firstName:'Teszt'}});
    expect(parsed.success).toBe(false);
  });
});
