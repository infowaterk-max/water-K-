import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20260910050000_communication_hub_2_0_foundation_v1.sql');
const worker=read('src/lib/communication/worker.ts');
const provider=read('src/lib/communication/provider.ts');
const inbound=read('src/app/api/webhooks/communication/route.ts');
const resendInbound=read('src/lib/communication/resend-inbound.ts');

describe('Roadmap Block 9 Communication Hub 2.0',()=>{
  it('extends the existing Office model without seeding or activating a mailbox',()=>{
    expect(migration).toContain('add column if not exists responsible_user_id');
    expect(migration).toContain('add column if not exists customer_user_id');
    expect(migration).toContain('add column if not exists customer_ref text');
    expect(migration).toContain('add column if not exists sales_owner_user_id');
    expect(migration.toLowerCase()).not.toContain('insert into public.office_mailboxes');
    expect(migration.toLowerCase()).not.toContain('update public.office_mailboxes set is_active=true');
  });

  it('keeps customer identity and CRM references distinct and tenant checked',()=>{
    expect(migration).toContain('OFFICE_CUSTOMER_USER_NOT_IN_INSTANCE');
    expect(migration).toContain('OFFICE_CUSTOMER_REF_NOT_IN_INSTANCE');
    expect(migration).toContain('OFFICE_SALES_OWNER_ACTIVE_MEMBER_REQUIRED');
    expect(migration).toContain('admin_update_office_thread_relationships_v1');
  });

  it('records actual actor separately from explicitly proven delegation provenance',()=>{
    expect(migration).toContain('acting_for_user_id');
    expect(migration).toContain('delegation_id');
    expect(migration).toContain('source_user_id=new.acting_for_user_id');
    expect(migration).toContain('delegate_user_id=new.author_id');
    expect(migration).toContain("dp.permission_code in('office.thread.reply','office.email.compose')");
    expect(migration).toContain('OFFICE_EMAIL_ACTIVE_DELEGATION_REQUIRED');
  });

  it('reuses one private attachment engine with explicit source boundaries',()=>{
    expect(migration).toContain("source in('internal_upload','provider_inbound','customer_outbound')");
    expect(migration).toContain("new.source='internal_upload'");
    expect(migration).toContain("new.source='provider_inbound'");
    expect(migration).toContain("new.source='customer_outbound'");
    expect(migration).toContain("v_message_kind<>'email_in'");
    expect(migration).toContain("v_message_kind<>'email_out'");
    expect(migration).not.toContain("storage_bucket text not null default 'public'");
  });

  it('keeps inbound attachments quarantined until clean scan evidence exists',()=>{
    expect(migration).toContain('service_prepare_inbound_office_attachments_v1');
    expect(migration).toContain('service_begin_inbound_office_attachment_scan_v1');
    expect(migration).toContain('service_finalize_inbound_office_attachment_v1');
    expect(migration).toContain("scan_status='clean'");
    expect(migration).toContain("status='ready'");
    expect(inbound).toContain('persistResendInboundAttachments');
    expect(resendInbound).toContain('getResendReceivedEmailAttachments');
  });

  it('allows outbound attachments only through the exact draft snapshot and clean evidence',()=>{
    expect(migration).toContain('admin_prepare_office_email_attachments_v1');
    expect(migration).toContain('admin_begin_office_email_attachment_scan_v1');
    expect(migration).toContain('admin_queue_office_email_v5');
    expect(migration).toContain("draft_reservation_id=v_draft_id");
    expect(migration).toContain("source='customer_outbound'");
    expect(migration).toContain("scan_status='clean'");
    expect(worker).toContain('officeAttachmentsForJob');
    expect(provider).toContain('attachments?:CommunicationAttachment[]');
  });

  it('never turns untrusted inbound email content into business commands',()=>{
    expect(inbound).not.toContain('place_order');
    expect(inbound).not.toContain('refund');
    expect(inbound).not.toContain('update_order');
    expect(resendInbound).not.toContain('eval(');
  });
});
