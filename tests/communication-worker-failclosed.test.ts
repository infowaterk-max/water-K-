import fs from 'node:fs';
import path from 'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('communication worker fail-closed status',()=>{
  test('partial tenant failures are visible to internal and cron callers',()=>{
    const internal=read('src/app/api/internal/communication-worker/route.ts');
    const cron=read('src/app/api/cron/integrations/route.ts');
    expect(internal).toContain('summary.tenantFailures===0');
    expect(internal).toContain('{status:ok?200:503}');
    expect(cron).toContain('const ok=inventorySnapshot.ok&&journeyOk&&integrationResults.every(result=>result.ok)&&communication.ok');
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
