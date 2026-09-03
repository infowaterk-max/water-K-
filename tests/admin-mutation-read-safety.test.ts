import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin mutation read-safety',()=>{
  test('sales center disables every mutation when any decision input failed to load',()=>{
    const page=read('src/app/admin/ertekesites/page.tsx');
    expect(page).toContain('canAct=!loadError');
    expect(page).toContain('canAct?<CommercialRefresh');
    expect(page).toContain('canAct?<><OpportunityActions');
    expect(page).toContain('canAct?<TaskActions');
    expect(page).toContain('canAct?<OfferActions');
    expect(page).toContain("summaryResult.error?'—'");
  });

  test('coupon management separates analytical failures from mutation prerequisites',()=>{
    const page=read('src/app/admin/kuponok/page.tsx');
    expect(page).toContain('canManageCoupons=!ce');
    expect(page).toContain('canSimulate=!ve');
    expect(page).toContain("oe?'—':totalUses");
    expect(page).toContain('!ce&&!oe&&ranked.map');
    expect(page).toContain('!ce&&coupons.map');
  });

  test('coupon toggle checks server failure, network failure and confirms deactivation',()=>{
    const source=read('src/components/admin/coupon-manager.tsx');
    expect(source).toContain('if(!response.ok)');
    expect(source).toContain('window.confirm');
    expect(source).toContain('A kupon állapotát nem tekintjük módosítottnak.');
    expect(source).toContain('finally{setBusy(false)}');
  });

  test('communication center never presents failed reads as zero and withholds marketing approval on consent read failure',()=>{
    const page=read('src/app/admin/kommunikacio/page.tsx');
    const actions=read('src/components/admin/communication-job-actions.tsx');
    expect(page).toContain('loadError=Boolean(jobError||runError||eventError||consentError)');
    expect(page).toContain("jobError?'—':awaitingApproval.length");
    expect(page).toContain("runError?'—':staleRunning");
    expect(page).toContain("consent===null?'Marketing · hozzájárulás nem ellenőrizhető'");
    expect(page).toContain("allowApproval={j.purpose!=='marketing'||!consentError}");
    expect(actions).toContain('allowApproval=true');
    expect(actions).toContain('Hálózati hiba. A műveletet nem tekintjük végrehajtottnak.');
  });
});
