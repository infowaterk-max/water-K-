import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office attachment quarantine and malware scan gate',()=>{
  const migration=read('supabase/migrations/20260909204751_digital_office_attachment_quarantine_scan_v1.sql');
  const cleanup=read('supabase/migrations/20260909204810_digital_office_attachment_scan_cleanup_hardening_v1.sql');
  const prepare=read('src/app/api/admin/office/attachments/prepare/route.ts');
  const statusRoute=read('src/app/api/admin/office/attachments/status/route.ts');
  const scanRoute=read('src/app/api/admin/office/attachments/scan/route.ts');
  const scanner=read('src/lib/office/attachment-malware-scanner.ts');
  const inspector=read('src/lib/office/attachment-content-security.ts');
  const composer=read('src/components/admin/office-private-message-form.tsx');
  const finalize=read('src/app/api/admin/office/attachments/finalize/route.ts');

  it('models explicit quarantine scan states with nonce-bound attempts and SHA-256 evidence',()=>{
    expect(migration).toContain("scan_status in('awaiting_upload','pending_scan','clean','infected','rejected','scan_error')");
    expect(migration).toContain('scan_nonce uuid');
    expect(migration).toContain('scan_attempts integer not null default 0');
    expect(migration).toContain("sha256~'^[0-9a-f]{64}$'");
    expect(migration).toContain('admin_begin_office_attachment_scan_v1');
    expect(migration).toContain('scan_nonce=v_nonce');
    expect(migration).toContain('admin_complete_office_attachment_scan_v1');
    expect(migration).toContain('scan_nonce=p_scan_nonce');
  });

  it('makes ready state impossible without a clean verdict and matching detected content type',()=>{
    expect(migration).toContain("if new.status='ready' then");
    expect(migration).toContain("new.scan_status<>'clean'");
    expect(migration).toContain('new.detected_content_type is distinct from new.content_type');
    expect(migration).toContain("raise exception 'OFFICE_ATTACHMENT_SCAN_REQUIRED'");
    expect(migration).toContain("if new.scan_status in('infected','rejected') and new.status<>'revoked'");
    expect(finalize).toContain('OFFICE_ATTACHMENT_SCAN_REQUIRED');
  });

  it('keeps scan evidence service-only and body-free',()=>{
    expect(migration).toContain('create table if not exists public.office_attachment_security_events');
    expect(migration).toContain('alter table public.office_attachment_security_events enable row level security');
    expect(migration).toContain('revoke all on table public.office_attachment_security_events from public,anon,authenticated');
    expect(migration).toContain('grant select,insert on table public.office_attachment_security_events to service_role');
    expect(migration).not.toContain('file_body');
    expect(migration).not.toContain('file_content');
    expect(migration).toContain('No file body is stored in evidence.');
  });

  it('runs signature inspection and malware scanning before finalize',()=>{
    const upload=composer.indexOf('uploadToSignedUrl(');
    const scan=composer.indexOf("fetch('/api/admin/office/attachments/scan'",upload);
    const finalizeCall=composer.indexOf("fetch('/api/admin/office/attachments/finalize'",scan);
    expect(upload).toBeGreaterThan(0);
    expect(scan).toBeGreaterThan(upload);
    expect(finalizeCall).toBeGreaterThan(scan);
    expect(composer).toContain('Biztonsági és vírusellenőrzés…');
    expect(scanRoute).toContain('inspectOfficePrivateAttachmentContent');
    expect(scanRoute).toContain('scanOfficePrivateAttachmentMalware');
  });

  it('fails closed when no scanner is configured and never silently marks that result clean',()=>{
    expect(scanner).toContain('OFFICE_MALWARE_SCANNER_URL');
    expect(scanner).toContain('OFFICE_MALWARE_SCANNER_TOKEN');
    expect(scanner).toContain("status:'unavailable'");
    expect(scanner).toContain("reason:'scanner_not_configured'");
    expect(scanner).toContain("url.protocol!=='https:'");
    expect(scanner).toContain('raw.length>4096');
    expect(scanRoute).toContain("verdict.status==='unavailable'||verdict.status==='error'");
    expect(scanRoute).toContain("result:'scan_error'");
    expect(scanRoute).toContain('A vírusellenőrző jelenleg nincs biztonságosan konfigurálva vagy nem érhető el.');
  });

  it('disables attachment UI unless Pro entitlement and an authenticated valid HTTPS scanner configuration both exist',()=>{
    expect(statusRoute).toContain('getAdminRequestUser()');
    expect(statusRoute).toContain("hasCurrentPlanFeature('teamChatSecureAttachments')");
    expect(statusRoute).toContain("reason:'pro_required'");
    expect(statusRoute).toContain('requireCurrentStoreContext()');
    expect(statusRoute).toContain('officeMalwareScannerConfigured()');
    expect(statusRoute).toContain("'Cache-Control':'no-store'");
    expect(scanner).toContain("scannerEndpoint()!==null");
    expect(composer).toContain("fetch('/api/admin/office/attachments/status',{cache:'no-store'})");
    expect(composer).toContain('disabled={!availability.enabled||busy}');
    expect(composer).toContain('A Pro csatolmányküldés a biztonsági scanner jóváhagyásáig és konfigurálásáig le van tiltva.');
    expect(composer).toContain('Szöveges belső üzenetet továbbra is küldhetsz.');
  });

  it('deletes rejected/infected objects from private storage when possible and otherwise leaves them quarantined',()=>{
    expect(scanRoute).toContain("result:'rejected'");
    expect(scanRoute).toContain("result:'infected'");
    expect(scanRoute).toContain(".remove([item.storagePath])");
    expect(scanRoute).toContain("reason:'quarantine_delete_failed'");
    expect(scanRoute).toContain("reason:'infected_quarantine_delete_failed'");
    expect(migration).toContain("set status='revoked',expires_at=null,scan_status='infected'");
    expect(migration).toContain("set status='revoked',expires_at=null,scan_status='rejected'");
  });

  it('invalidates stale scan nonces when quarantine reservations expire',()=>{
    expect(cleanup).toContain("set status='revoked',expires_at=null,scan_status='rejected',scan_nonce=null");
    expect(cleanup).toContain("quarantine_reason='reservation_expired'");
    expect(cleanup).toContain("'scanNonceInvalidated',v_attachment.scan_nonce is not null");
    expect(cleanup).toContain('scanStatusBefore');
  });

  it('uses non-upsert signed upload URLs so content cannot be silently replaced after scanning',()=>{
    expect(prepare).toContain('createSignedUploadUrl(item.path)');
    expect(prepare).not.toContain('createSignedUploadUrl(item.path,{upsert:true})');
    expect(prepare).not.toContain('createSignedUploadUrl(item.path, { upsert: true })');
    expect(composer).not.toContain('upsert:true');
  });

  it('rejects risky active formats and structures before any external malware verdict',()=>{
    expect(inspector).toContain('pdf_active_content_rejected');
    expect(inspector).toContain('csv_formula_injection_risk');
    expect(inspector).toContain('office_active_or_embedded_content');
    expect(inspector).toContain('office_zip_ratio_invalid');
    expect(inspector).toContain('filename_extension_mismatch');
    const inspection=scanRoute.indexOf('inspectOfficePrivateAttachmentContent');
    const malware=scanRoute.indexOf('scanOfficePrivateAttachmentMalware',inspection);
    expect(malware).toBeGreaterThan(inspection);
  });

  it('does not activate any specific third-party scanner or send files anywhere until configured',()=>{
    const lower=(scanner+'\n'+scanRoute+'\n'+migration).toLowerCase();
    expect(lower).not.toContain('virustotal');
    expect(lower).not.toContain('metadefender');
    expect(lower).not.toContain('clamav.org');
    expect(lower).not.toContain('gmail');
    expect(lower).not.toContain('openai');
    expect(lower).not.toContain('anthropic');
  });
});