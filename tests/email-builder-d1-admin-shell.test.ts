import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder D1 admin shell',()=>{
  it('adds a canonical marketing navigation destination backed by a real admin page',()=>{
    const nav=read('src/lib/navigation/admin-ia.ts');
    const page=read('src/app/admin/email-sablonok/page.tsx');
    expect(nav).toContain("id:'email-templates',href:'/admin/email-sablonok'");
    expect(nav).toContain("permission:'marketing.manage'");
    expect(page).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(page).toContain(".eq('instance_id',scope.instanceId)");
  });

  it('creates the Essential system draft idempotently with tenant and RBAC guards',()=>{
    const route=read('src/app/api/admin/email-builder/system-templates/essential-order-confirmation/route.ts');
    expect(route).toContain('sameOrigin');
    expect(route).toContain("getAdminRequestUser('marketing.manage')");
    expect(route).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(route).toContain("const TEMPLATE_KEY='essential.order_confirmation'");
    expect(route).toContain(".eq('instance_id',scope.instanceId).eq('template_key',TEMPLATE_KEY).maybeSingle()");
    expect(route).toContain('if(existing)return NextResponse.json({template:existing,created:false}');
    expect(route).toContain("admin.rpc('create_email_template_v1'");
    expect(route).toContain('essentialOrderConfirmation');
    expect(route).toContain('létrehozásának bizonyítéka hiányzik');
    expect(route).not.toContain('activate_email_template_v1');
  });

  it('previews the tenant draft through the real renderer with demo data and no side effects',()=>{
    const preview=read('src/app/admin/email-sablonok/[id]/elonezet/page.tsx');
    expect(preview).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(preview).toContain(".eq('instance_id',scope.instanceId).eq('id',id).maybeSingle()");
    expect(preview).toContain('renderEmail(document,demoContext');
    expect(preview).toContain('sandbox=""');
    expect(preview).toContain('srcDoc={rendered.html}');
    expect(preview).not.toContain('activate_email_template_v1');
    expect(preview).not.toContain('sendTransactionalEmail');
  });

  it('keeps D1 UI limited to draft creation and preview',()=>{
    const page=read('src/app/admin/email-sablonok/page.tsx');
    const manager=read('src/components/admin/email-template-manager.tsx');
    expect(manager).toContain('Essential piszkozat létrehozása');
    expect(page).toContain('Commerce');
    expect(page).toContain('Campaign');
    expect(page).toContain('Editorial');
    expect(page).toContain('Minimal');
    expect(manager).toContain('/api/admin/email-builder/system-templates/essential-order-confirmation');
    expect(manager).not.toContain('/activate');
    expect(manager).not.toContain('teszt');
  });
});
