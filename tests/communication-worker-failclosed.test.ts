import fs from 'node:fs';
import path from 'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('communication worker fail-closed status',()=>{
  test('blocks queued Digital Office replies on current Pro downgrade or revocation before external delivery',()=>{
    const worker=read('src/lib/communication/worker.ts');
    const start=worker.indexOf("if(job.template_key==='support_reply'){",worker.indexOf("const jobs=(data??[])"));
    const send=worker.indexOf('const result=await provider.send(',start);
    const resolution=worker.indexOf('resolveOfficeReplyTo(admin,instanceId,job)',start);
    const gate=worker.indexOf("getFeatureEntitlementDecision(instanceId,'officeCommunicationAdvanced')",start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(gate).toBeGreaterThan(start);
    expect(gate).toBeLessThan(resolution);
    expect(resolution).toBeLessThan(send);
    const body=worker.slice(start,resolution);
    expect(body).toContain('if(officeEntitlement===null)throw new Error(\'ENTITLEMENT_PROOF_UNAVAILABLE_AT_SEND_TIME\')');
    expect(body).toContain('if(officeEntitlement.enabled!==true)');
    expect(body).toContain("persistFailedClaim(admin,instanceId,job,'OFFICE_PRO_ENTITLEMENT_REVOKED_AT_SEND_TIME',false)");
    expect(body).toContain('summary.blocked++;continue;');
    expect(worker).toContain("if(job.instance_id!==instanceId)throw new Error('COMMUNICATION_TENANT_MISMATCH')");
  });

  test('unknown entitlement proof retries within existing bounded policy and never defaults to enabled',()=>{
    const worker=read('src/lib/communication/worker.ts');
    expect(worker).toContain("throw new Error('ENTITLEMENT_PROOF_UNAVAILABLE_AT_SEND_TIME')");
    expect(worker).toContain("retry=job.attempts<5&&!message.startsWith('OFFICE_')");
    expect(worker).toContain('await persistFailedClaim(admin,instanceId,job,message,retry)');
    expect(worker).not.toContain('officeEntitlement?.enabled??true');
  });

  test('normal Alap transactional and consent-bound marketing jobs skip the Pro-only Office gate',()=>{
    const worker=read('src/lib/communication/worker.ts');
    const onlyOffice=worker.slice(worker.indexOf("if(job.template_key==='support_reply'){",worker.indexOf("const jobs=(data??[])")),worker.indexOf('const [replyTo,attachments]'));
    expect(onlyOffice).toContain("getFeatureEntitlementDecision(instanceId,'officeCommunicationAdvanced')");
    expect(onlyOffice).toContain("if(job.template_key==='support_reply')");
    expect(worker).toContain("if(job.purpose==='marketing')");
    expect(worker).toContain("has_marketing_consent_v2");
    expect(worker).toContain("if(job.template_key==='stock_available')");
    expect(worker).not.toContain("if(job.purpose==='transactional')await getFeatureEntitlementDecision");
  });

  test('partial tenant failures are visible to internal and cron callers',()=>{
    const internal=read('src/app/api/internal/communication-worker/route.ts');
    const cron=read('src/app/api/cron/integrations/route.ts');
    expect(internal).toContain('summary.tenantFailures===0');
    expect(internal).toContain('{status:ok?200:503}');
    expect(cron).toContain('const ok=inventorySnapshot.ok&&loyaltyOk&&journeyOk&&integrationResults.every(result=>result.ok)&&communication.ok');
    expect(cron).toContain('{status:ok?200:503}');
  });

  test('suppression and consent read failures are retryable worker failures, not permanent blocks',()=>{
    const worker=read('src/lib/communication/worker.ts');
    expect(worker).toContain('if(suppressionError)throw suppressionError');
    expect(worker).toContain('if(consentError)throw consentError');
    expect(worker).not.toContain('if(suppressionError||suppressed===true)');
    expect(worker).not.toContain('if(consentError||allowed!==true)');
  });

  test('communication failure transitions require positive database evidence',()=>{
    const worker=read('src/lib/communication/worker.ts');
    expect(worker).toContain('persistFailedClaim');
    expect(worker).toContain('data!==true');
    expect(worker).toContain('COMMUNICATION_FAIL_EVIDENCE_MISSING');
    expect(worker).toContain('COMMUNICATION_WORKER_RUN_EVIDENCE_MISSING');
  });
});
