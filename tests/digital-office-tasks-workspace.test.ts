import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const route='/admin/kommunikacio/feladatok';

describe('Digital Office Tasks independent and entitlement-protected workspace',()=>{
  it('navigates to a genuine route, not a dashboard anchor',()=>{
    const nav=read('src/components/navigation/digital-office-navigation.tsx');
    const home=read('src/app/admin/kommunikacio/page.tsx');
    expect(nav).toContain(`href:'${route}',label:'Feladatok'`);
    expect(nav).not.toContain('/admin/kommunikacio#feladatok');
    expect(home).toContain(`href="${route}"`);
    expect(home).not.toContain('<a href="#feladatok"');
  });

  it('enforces Pro permission, reads tasks under actual logged-in RLS and never shows false empty on failures',()=>{
    const page=read('src/app/admin/kommunikacio/feladatok/page.tsx');
    expect(page).toContain('getDigitalOfficeAccess');
    expect(page).toContain('!access.advancedEmail||!access.canSupport');
    expect(page).toContain("createClient as createOfficeUserClient");
    expect(page).toContain("db.from('office_tasks')");
    expect(page).not.toContain("server.from('office_tasks')");
    expect(page).toContain('taskResult.error||bindingResult.error||profileResult.error');
    expect(page).toContain('{!loadError&&');
  });

  it('provides actionable creation, assignment, due date, filtering and completion',()=>{
    const page=read('src/app/admin/kommunikacio/feladatok/page.tsx');
    for(const term of['createTaskAction','completeTaskAction','name="assigneeUserId"','name="title"','name="due"','?status=open','?status=done','Feladat létrehozása','Lezárás'])expect(page).toContain(term);
    expect(page).toContain("['owner','admin'].includes(b.role_code)");
  });

  it('tasks use the narrowly scoped service-only audited RPC, not the missing legacy workspace RPC',()=>{
    const actions=read('src/app/admin/kommunikacio/iroda/actions.ts');
    const sql=read('supabase/customer-baseline/managed-forward/office31_fresh_task_actions_v1.sql');
    expect(actions).toContain("db.rpc('admin_mutate_office_task_v1'");
    expect(actions).toContain('assigneeUserId:assigneeUserId||userId');
    expect(actions).toContain(`revalidatePath('${route}')`);
    expect(sql).toContain('OFFICE_TASK_ASSIGNEE_NOT_ACTIVE_IN_STORE');
    expect(sql).toContain('OFFICE_TASK_ASSIGNMENT_PERMISSION_REQUIRED');
    expect(sql).toContain('OFFICE_TASK_COMPLETION_PERMISSION_REQUIRED');
    expect(sql).toContain('office.task_created');
    expect(sql).toContain('office.task_completed');
    expect(sql).toContain('TO service_role');
    expect(sql).toContain('FROM public,anon,authenticated,service_role');
    expect(sql).not.toContain('GRANT SELECT ON public.office_tasks');
  });
});
