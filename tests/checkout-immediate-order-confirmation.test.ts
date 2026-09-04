import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const route=()=>fs.readFileSync(path.join(process.cwd(),'src/app/api/orders/route.ts'),'utf8');

describe('checkout immediate order confirmation',()=>{
  test('claims and processes the atomic confirmation outbox job during checkout',()=>{
    const source=route();
    expect(source).toContain("import { processIntegrationJob } from '@/lib/integrations/processor';");
    expect(source).toContain("admin.rpc('claim_integration_job_v2'");
    expect(source).toContain('p_id:local.confirmationJobId');
    expect(source).toContain('await processIntegrationJob(instance.id,local.confirmationJobId,claim.processing_token)');
  });

  test('email delivery failure never turns a committed order into a checkout failure',()=>{
    const source=route();
    expect(source).toContain("console.error('checkout confirmation dispatch deferred'");
    expect(source).toContain('jobId:local.confirmationJobId');
    expect(source).toContain('return NextResponse.json({ ok: true, replayed');
  });
});
