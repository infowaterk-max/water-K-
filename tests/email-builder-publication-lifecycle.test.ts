import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder publication lifecycle UI',()=>{
  it('exposes version history separately from editing',()=>{
    const library=read('src/app/admin/email-sablonok/page.tsx');
    const page=read('src/app/admin/email-sablonok/[id]/verziok/page.tsx');
    expect(library).toContain('Verziók és aktiválás');
    expect(page).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(page).toContain(".eq('instance_id',scope.instanceId).eq('template_id',id)");
    expect(page).toContain('draftMatchesActive');
    expect(page).toContain('<EmailPublicationPanel');
  });

  it('requires explicit typed confirmation before activation',()=>{
    const panel=read('src/components/admin/email-publication-panel.tsx');
    expect(panel).toContain("confirmation!=='AKTIVÁLÁS'");
    expect(panel).toContain("/activate`,{method:'POST'}");
    expect(panel).toContain('Nincs publikálandó változás.');
    expect(panel).toContain('Visszaállítás piszkozatba');
  });

  it('restores immutable versions only into the draft and keeps active pointer untouched',()=>{
    const route=read('src/app/api/admin/email-builder/templates/[id]/versions/[versionId]/restore-draft/route.ts');
    expect(route).toContain("getAdminRequestUser('marketing.manage')");
    expect(route).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(route).toContain('sameOrigin');
    expect(route).toContain(".eq('instance_id',scope.instanceId).eq('template_id',id).eq('id',versionId)");
    expect(route).toContain("admin.rpc('save_email_template_draft_v1'");
    expect(route).toContain("select('draft_schema_version,draft_document,active_version_id')");
    expect(route).not.toContain('activate_email_template_v1');
  });
});
