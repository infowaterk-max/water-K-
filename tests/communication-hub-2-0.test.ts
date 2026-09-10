import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const foundation=read('supabase/migrations/20260910070000_communication_hub_2_0_foundation_v1.sql');
const assignment=read('supabase/migrations/20260910070100_communication_hub_2_0_mailbox_default_assignment_v1.sql');
const advanced=read('supabase/migrations/20260910070200_communication_hub_2_0_advanced_guards_and_object_links_v1.sql');
const fkIndexes=read('supabase/migrations/20260910070300_communication_hub_2_0_fk_indexes_v1.sql');
const worker=read('src/lib/communication/worker.ts');
const provider=read('src/lib/communication/provider.ts');
const inbound=read('src/app/api/webhooks/communication/route.ts');
const resendInbound=read('src/lib/communication/resend-inbound.ts');
const composerActions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
const hubActions=read('src/app/admin/kommunikacio/iroda/communication-hub-actions.ts');
const officePage=read('src/app/admin/kommunikacio/iroda/page.tsx');

describe('Roadmap Block 9 Communication Hub 2.0',()=>{
  it('extends the existing Office model without seeding or activating external infrastructure',()=>{
    for(const field of['responsible_user_id','customer_user_id','customer_ref text','sales_owner_user_id'])expect(foundation).toContain(field);
    const all=`${foundation}\n${assignment}\n${advanced}\n${fkIndexes}`.toLowerCase();
    expect(all).not.toContain('insert into public.office_mailboxes');
    expect(all).not.toContain('update public.office_mailboxes set is_active=true');
    expect(all).not.toContain("storage_bucket text not null default 'public'");
    expect(all).not.toContain('dns/mx');
  });

  it('keeps customer identity, CRM reference and sales ownership distinct and tenant checked',()=>{
    for(const evidence of['OFFICE_CUSTOMER_USER_NOT_IN_INSTANCE','OFFICE_CUSTOMER_REF_NOT_IN_INSTANCE','OFFICE_SALES_OWNER_ACTIVE_MEMBER_REQUIRED'])expect(foundation).toContain(evidence);
    expect(advanced).toContain('admin_update_office_thread_relationships_v2');
    expect(hubActions).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    expect(hubActions).toContain('admin_update_office_thread_relationships_v2');
  });

  it('uses mailbox responsibility only as a default and never overwrites an existing assignee',()=>{
    expect(assignment).toContain("new.assigned_to is not null");
    expect(assignment).toContain('responsible_user_id');
    expect(assignment).toContain('office_customer_mailbox_default_assignee_v1');
  });

  it('records the actual actor separately from proven delegation provenance',()=>{
    for(const evidence of['acting_for_user_id','delegation_id','source_user_id=new.acting_for_user_id','delegate_user_id=new.author_id',"dp.permission_code in('office.thread.reply','office.email.compose')",'OFFICE_EMAIL_ACTIVE_DELEGATION_REQUIRED'])expect(foundation).toContain(evidence);
    expect(composerActions).toContain('actingForUserId');
  });

  it('reuses one private attachment engine with explicit inbound, outbound and Team Chat boundaries',()=>{
    for(const evidence of["source in('internal_upload','provider_inbound','customer_outbound')","new.source='internal_upload'","new.source='provider_inbound'","new.source='customer_outbound'","v_message_kind<>'email_in'","v_message_kind<>'email_out'"])expect(foundation).toContain(evidence);
    expect(foundation).toContain('service_prepare_inbound_office_attachments_v1');
    expect(foundation).toContain('service_begin_inbound_office_attachment_scan_v1');
    expect(foundation).toContain('service_finalize_inbound_office_attachment_v1');
    expect(foundation).toContain('admin_prepare_office_email_attachments_v1');
    expect(foundation).toContain('admin_begin_office_email_attachment_scan_v1');
    expect(foundation).toContain("scan_status='clean'");
    expect(inbound).toContain('persistResendInboundAttachments');
    expect(resendInbound).toContain('getResendReceivedEmailAttachments');
    expect(worker).toContain('officeAttachmentsForJob');
    expect(provider).toContain('attachments?:CommunicationAttachment[]');
  });

  it('keeps advanced team email capabilities Pro-only while ordinary customer email remains compatible',()=>{
    expect(advanced).toContain("officeCommunicationAdvanced");
    expect(advanced).toContain('admin_update_office_mailbox_responsibility_v2');
    expect(advanced).toContain('admin_update_office_thread_relationships_v2');
    expect(advanced).toContain('admin_queue_office_email_v6');
    expect(composerActions).toContain('admin_queue_office_email_v6');
    expect(officePage).toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
  });

  it('reuses office_message_object_links atomically instead of creating a parallel relation engine',()=>{
    expect(advanced).toContain('insert into public.office_message_object_links');
    expect(advanced).toContain("v_message.kind='email_out'");
    expect(advanced).toContain("v_thread.conversation_type<>'customer'");
    expect(advanced).toContain('OFFICE_OBJECT_LINK_EVIDENCE_MISSING');
    expect(advanced).not.toContain('create table public.office_email_object_links');
  });

  it('queues outbound attachments and business links only with transaction evidence',()=>{
    expect(foundation).toContain('admin_queue_office_email_v5');
    expect(foundation).toContain('draft_reservation_id=v_draft_id');
    expect(foundation).toContain("source='customer_outbound'");
    expect(advanced).toContain('v_result:=public.admin_queue_office_email_v5');
    expect(advanced).toContain("jsonb_build_object('objectLinked'");
  });

  it('covers every new user/delegation foreign key with a maintenance index',()=>{
    for(const index of[
      'office_mailboxes_responsible_user_fk_idx',
      'office_threads_customer_user_fk_idx',
      'office_threads_sales_owner_user_fk_idx',
      'office_messages_acting_for_user_fk_idx',
      'office_messages_delegation_fk_idx',
    ])expect(fkIndexes).toContain(index);
    for(const column of['responsible_user_id','customer_user_id','sales_owner_user_id','acting_for_user_id','delegation_id'])expect(fkIndexes).toContain(`(${column})`);
  });

  it('never turns untrusted inbound email content into business commands',()=>{
    for(const forbidden of['place_order','refund','update_order'])expect(inbound).not.toContain(forbidden);
    expect(resendInbound).not.toContain('eval(');
  });
});
