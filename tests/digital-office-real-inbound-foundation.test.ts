import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('Digital Office real inbound foundation',()=>{
  const migration=read('supabase/migrations/20260908030000_digital_office_real_inbound_foundation_v1.sql');
  const normalization=read('supabase/migrations/20260908030500_digital_office_mailbox_normalization_v1.sql');
  const leastPrivilege=read('supabase/migrations/20260908031000_digital_office_real_inbound_least_privilege_v1.sql');
  const webhook=read('src/app/api/webhooks/communication/route.ts');
  const helper=read('src/lib/communication/resend-inbound.ts');
  const worker=read('src/lib/communication/worker.ts');
  const provider=read('src/lib/communication/provider.ts');

  it('does not seed or select any existing webshop email address',()=>{
    const sql=migration.toLowerCase();
    expect(sql).toContain('create table if not exists public.office_mailboxes');
    expect(sql).not.toContain('insert into public.office_mailboxes');
    expect(sql).not.toContain('support_email');
    expect(sql).not.toContain('okospolymer');
    expect(sql).not.toContain('waterk.hu');
    expect(normalization).toContain('inbound_address=lower(trim(inbound_address))');
  });

  it('keeps mailbox addresses and reply tokens service-only',()=>{
    const sql=migration.toLowerCase();
    expect(sql).toContain('create table if not exists public.office_thread_email_routes');
    expect(sql).toContain('revoke all on table public.office_mailboxes from public,anon,authenticated');
    expect(sql).toContain('revoke all on table public.office_thread_email_routes from public,anon,authenticated');
    expect(sql).toContain('office_thread_email_routes_reply_token_unique');
    expect(worker).toContain("admin.from('office_thread_email_routes')");
    expect(worker).not.toContain("select('id,conversation_type,mailbox_key,reply_token')");
  });

  it('restricts service-role mailbox metadata access to CRUD and covers the composite route FK',()=>{
    expect(leastPrivilege).toContain('revoke all on table public.office_mailboxes from service_role');
    expect(leastPrivilege).toContain('grant select,insert,update,delete on table public.office_mailboxes to service_role');
    expect(leastPrivilege).toContain('revoke all on table public.office_thread_email_routes from service_role');
    expect(leastPrivilege).toContain('grant select,insert,update,delete on table public.office_thread_email_routes to service_role');
    expect(leastPrivilege).toContain('office_thread_email_routes_thread_instance_idx');
    expect(leastPrivilege).not.toContain('grant truncate');
    expect(leastPrivilege).not.toContain('grant trigger');
    expect(leastPrivilege).not.toContain('grant references');
  });

  it('threads only by strong reply token or RFC reply evidence and retires sender-only v2',()=>{
    expect(migration).toContain("v_match_method:='reply_token'");
    expect(migration).toContain("v_match_method:='in_reply_to'");
    expect(migration).toContain("v_match_method:='references'");
    expect(migration).toContain('No sender-only or latest-order fallback');
    expect(migration).toContain('revoke all on function public.record_inbound_office_email_v2');
    expect(migration).toContain('from public,anon,authenticated,service_role');
    expect(migration).not.toContain('order by o.created_at desc');
  });

  it('verifies raw Resend webhook signatures before retrieving untrusted email content',()=>{
    expect(webhook).toContain('const raw=await request.text()');
    expect(webhook).toContain('verifySvix(raw,request,resendSecret)');
    expect(webhook).toContain("if(event.type==='email.received')return handleReceived(event)");
    expect(webhook).toContain('getResendReceivedEmail(emailId)');
    expect(helper).toContain("method:'GET'");
    expect(helper).toContain("cache:'no-store'");
    expect(helper).toContain('receivedEmailBody');
  });

  it('keeps inbound email as data only and never executes business actions from content',()=>{
    expect(webhook).toContain("db.rpc('record_inbound_office_email_v3'");
    expect(webhook).not.toContain('refund');
    expect(webhook).not.toContain('place_order');
    expect(webhook).not.toContain('update_order');
    expect(migration).toContain('never performs business actions');
  });

  it('requires a dedicated active Office mailbox before an Office reply can be sent',()=>{
    expect(worker).toContain("if(job.template_key!=='support_reply')return null");
    expect(worker).toContain(".eq('is_active',true).maybeSingle()");
    expect(worker).toContain("throw new Error('OFFICE_REPLY_MAILBOX_NOT_CONFIGURED')");
    expect(worker).toContain('plusReplyAddress');
    expect(provider).toContain("if(message.templateKey==='support_reply'&&!explicitReplyTo)throw new Error('OFFICE_REPLY_MAILBOX_NOT_CONFIGURED')");
    expect(provider).toContain("message.templateKey==='support_reply'?null:message.identity.supportEmail");
  });

  it('keeps reply-token aliases deterministic and mailbox scoped',()=>{
    expect(helper).toContain('const plus=local.lastIndexOf');
    expect(helper).toContain('replyToken:candidate');
    expect(migration).toContain('office_thread_email_routes_reply_token_unique');
    expect(migration).toContain("and (t.mailbox_key is null or t.mailbox_key=v_mailbox_key)");
  });
});
