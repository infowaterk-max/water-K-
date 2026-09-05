import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('production pilot communication UI remediation',()=>{
  test('approval action is shown only for jobs that actually require approval',()=>{
    const actions=read('src/components/admin/communication-job-actions.tsx');
    const page=read('src/app/admin/kommunikacio/page.tsx');
    expect(actions).toContain('requiresApproval:boolean');
    expect(actions).toContain("status==='pending'&&requiresApproval&&!approved&&allowApproval");
    expect(page.match(/requiresApproval=\{j\.requires_approval\}/g)?.length).toBeGreaterThanOrEqual(3);
  });

  test('communication actions use Shoperation dialogs instead of native browser prompt or confirm',()=>{
    const actions=read('src/components/admin/communication-job-actions.tsx');
    expect(actions).not.toContain('window.prompt');
    expect(actions).not.toContain('window.confirm');
    expect(actions).toContain('role="dialog"');
    expect(actions).toContain('aria-modal="true"');
    expect(actions).toContain('Kiküldési feladat törlése');
    expect(actions).toContain('Új küldési időpont');
  });

  test('slow communication mutations expose disabled pending feedback',()=>{
    const actions=read('src/components/admin/communication-job-actions.tsx');
    expect(actions).toContain('ActionSpinner');
    expect(actions).toContain('Jóváhagyás…');
    expect(actions).toContain('Mentés…');
    expect(actions).toContain('Újrapróbálás…');
    expect(actions).toContain('Törlés…');
    expect(actions).toContain('disabled={busy}');
  });

  test('communication queue has mobile cards and admin navigation collapses before narrow-table layout',()=>{
    const page=read('src/app/admin/kommunikacio/page.tsx');
    const css=read('src/app/admin/communication-pilot-fixes.css');
    const layout=read('src/app/admin/layout.tsx');
    expect(page).toContain('communicationQueueDesktop');
    expect(page).toContain('communicationQueueCards');
    expect(page).toContain('communicationQueueCard');
    expect(css).toContain('@media(max-width:1050px)');
    expect(css).toContain('.communicationQueueDesktop{display:none!important}');
    expect(css).toContain('.communicationQueueCards{display:grid}');
    expect(css).toContain('.adminGrid{display:block!important');
    expect(layout).toContain("import './communication-pilot-fixes.css';");
  });

  test('scheduled communication times are not rendered in the server UTC timezone',()=>{
    const page=read('src/app/admin/kommunikacio/page.tsx');
    const actions=read('src/components/admin/communication-job-actions.tsx');
    expect(page).toContain("timeZone:'Europe/Budapest'");
    expect(actions).toContain('function localDateTimeInputValue(value:string)');
    expect(actions).toContain('date.getHours()');
    expect(actions).toContain('setRescheduleValue(localDateTimeInputValue(scheduledAt))');
    expect(actions).not.toContain('setRescheduleValue(scheduledAt.slice(0,16))');
  });
});
