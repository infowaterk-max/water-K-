import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {ADMIN_UI_ACCESS_CONTRACT_VERSION,resolveAdminUiAccess} from '../src/lib/admin/ui-access-contract';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Roadmap Block 5 - Role-aware UI contract',()=>{
  it('uses a stable Builder-ready contract identifier',()=>{
    expect(ADMIN_UI_ACCESS_CONTRACT_VERSION).toBe('shoporation.admin-ui-access.v1');
  });

  it('enables a component when capability and required permissions are available',()=>{
    const access=resolveAdminUiAccess({
      id:'automation-control',
      feature:'automation',
      readPermission:'analytics.read',
      managePermission:'store.manage',
    },{featureEnabled:true,canRead:true,canManage:true});
    expect(access.mode).toBe('enabled');
    expect(access.reason).toBe('available');
  });

  it('keeps readable components visible but read-only without manage permission',()=>{
    const access=resolveAdminUiAccess({
      id:'growth-control',
      feature:'advancedAnalytics',
      readPermission:'analytics.read',
      managePermission:'marketing.manage',
    },{featureEnabled:true,canRead:true,canManage:false});
    expect(access.mode).toBe('read-only');
    expect(access.reason).toBe('permission');
  });

  it('fails closed on missing read permission before exposing a package upsell',()=>{
    const access=resolveAdminUiAccess({
      id:'executive-control',
      feature:'executiveAnalytics',
      readPermission:'analytics.read',
    },{featureEnabled:false,canRead:false});
    expect(access.mode).toBe('hidden');
    expect(access.reason).toBe('permission');
  });

  it('returns upgrade-required only for an authorized reader lacking the feature capability',()=>{
    const access=resolveAdminUiAccess({
      id:'executive-control',
      feature:'executiveAnalytics',
      readPermission:'analytics.read',
    },{featureEnabled:false,canRead:true});
    expect(access.mode).toBe('upgrade-required');
    expect(access.reason).toBe('feature');
  });

  it('hides audience-restricted components outside their configured audience',()=>{
    const access=resolveAdminUiAccess({id:'pilot-evidence',audience:'pilot'},{audienceAllowed:false});
    expect(access.mode).toBe('hidden');
    expect(access.reason).toBe('audience');
  });

  it('renders stable access-state metadata through the shared admin component',()=>{
    const component=read('src/components/admin/admin-access-state.tsx');
    expect(component).toContain('data-access-contract={ADMIN_UI_ACCESS_CONTRACT_VERSION}');
    expect(component).toContain('data-access-id={decision.id}');
    expect(component).toContain('data-access-state={decision.mode}');
    expect(component).toContain("decision.mode==='upgrade-required'");
  });

  it('moves automation actions onto the shared role-aware state without confusing load failure with read-only access',()=>{
    const page=read('src/app/admin/automatizalas/page.tsx');
    expect(page).toContain("id:'automation-control'");
    expect(page).toContain("managePermission:'store.manage'");
    expect(page).toContain("access.mode==='enabled'&&!loadError");
    expect(page).toContain("access.mode==='read-only'");
    expect(page).toContain('AdminAccessStateNotice');
    expect(page).toContain('Módosítás átmenetileg letiltva.');
    expect(page).toContain('Hiányos automatizálási állapot mellett');
  });
});
