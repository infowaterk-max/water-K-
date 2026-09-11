import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office support ticket integration',()=>{
  it('keeps support behind entitlement and support.manage authority',()=>{
    const access=read('src/lib/digital-office/access.ts');
    const route=read('src/app/api/admin/office/support-attention/route.ts');
    expect(access).toContain("'support'");
    expect(access).toContain("featureEnabled('support')");
    expect(access).toContain("roleHasPermission(role,'support.manage')");
    expect(route).toContain("getAdminRequestUser('support.manage')");
    expect(route).toContain("hasCurrentPlanFeature('support')");
    expect(route).toContain("requireCurrentStoreContext('support.manage')");
  });

  it('scopes the support attention read to the current tenant and does not report false zero on failure',()=>{
    const route=read('src/app/api/admin/office/support-attention/route.ts');
    expect(route).toContain(".from('support_tickets')");
    expect(route).toContain(".eq('instance_id',scope.instanceId)");
    expect(route).toContain(".eq('status','open')");
    expect(route).toContain("status:503");
    expect(route).toContain('count:null');
  });

  it('mounts support inbox and detail inside the Digital Office shell',()=>{
    const navigation=read('src/components/navigation/digital-office-navigation.tsx');
    const inbox=read('src/app/admin/kommunikacio/ugyfelszolgalat/page.tsx');
    const detail=read('src/app/admin/kommunikacio/ugyfelszolgalat/[id]/page.tsx');
    expect(navigation).toContain("href:'/admin/kommunikacio/ugyfelszolgalat'");
    expect(navigation).toContain("label:'Ügyfélszolgálat'");
    expect(inbox).toContain("../../ugyfelszolgalat/page");
    expect(detail).toContain("../../../ugyfelszolgalat/[id]/page");
  });

  it('shows a home-only warning and refreshes it without blocking the main dashboard',()=>{
    const alert=read('src/components/admin/digital-office-support-alert.tsx');
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(alert).toContain("pathname==='/admin/kommunikacio'");
    expect(alert).toContain("fetch('/api/admin/office/support-attention'");
    expect(alert).toContain('window.setInterval');
    expect(alert).toContain('60000');
    expect(alert).toContain('Új ügyfélszolgálati ticket érkezett');
    expect(alert).toContain('Nem tekintjük ezt nulla beérkező ügynek');
    expect(layout).toContain('<DigitalOfficeSupportAlert enabled={supportAccess}/>');
  });

  it('keeps ticket links inside Digital Office after opening the inbox',()=>{
    const inbox=read('src/app/admin/ugyfelszolgalat/page.tsx');
    const detail=read('src/app/admin/ugyfelszolgalat/[id]/page.tsx');
    expect(inbox).toContain('/admin/kommunikacio/ugyfelszolgalat/${r.id}');
    expect(detail).toContain('href="/admin/kommunikacio/ugyfelszolgalat"');
  });
});
