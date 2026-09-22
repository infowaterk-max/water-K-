import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('Team Permissions checkbox UX',()=>{
  it('keeps role presets immutable and manages simple extras through overrides',()=>{
    const actions=read('src/app/admin/csapat/[userId]/actions.ts');
    expect(actions).toContain('replacePermissionExtrasAction');
    expect(actions).toContain("admin.from('store_role_permission_presets')");
    expect(actions).toContain('const extras=[...new Set(requested)].filter(code=>!inherited.has(code))');
    expect(actions).toContain('const preserved=rows.filter(row=>!isSimpleRoleExtra(row)).map(entryFromRow)');
    expect(actions).toContain("effect:'allow' as const,scopeType:'all' as const,scopeValue:null,validUntil:null");
    expect(actions).toContain('merchant_replace_permission_overrides_v1');
    expect(actions).not.toContain(".from('store_role_permission_presets').update(");
    expect(actions).not.toContain(".from('store_role_permission_presets').insert(");
    expect(actions).not.toContain(".from('store_role_permission_presets').delete(");
  });

  it('renders inherited capabilities as fixed role grants and extras as checkboxes',()=>{
    const controls=read('src/components/admin/team-permission-controls.tsx');
    const page=read('src/app/admin/csapat/[userId]/page.tsx');
    expect(controls).toContain('Szerepkör + extra');
    expect(controls).toContain("name={inherited?undefined:'extraPermissionCode'}");
    expect(controls).toContain('disabled={inherited||!canManage}');
    expect(controls).toContain("inherited?' · szerepkörből':''");
    expect(controls).toContain('Extra jogosultságok mentése');
    expect(page).toContain('presetCodes={presets.map(item=>item.permission_code)}');
  });

  it('keeps advanced deny, scope and expiry controls available separately',()=>{
    const controls=read('src/components/admin/team-permission-controls.tsx');
    expect(controls).toContain('<summary><strong>Haladó eltérések</strong> · tiltás, adatkör, lejárat</summary>');
    expect(controls).toContain('<option value="deny">Egyedi tiltás</option>');
    expect(controls).toContain('<option value="topic">Kijelölt témakör</option>');
    expect(controls).toContain('<option value="90d">90 nap</option>');
  });

  it('does not expose a misleading full-custom mode before route migration is complete',()=>{
    const controls=read('src/components/admin/team-permission-controls.tsx');
    expect(controls).toContain('Teljes egyéni mód');
    expect(controls).toContain('csak a bepipált jogok érvényesek');
    expect(controls).toContain('minden érintett admin-route a finom capability evaluatort használja');
  });
});
