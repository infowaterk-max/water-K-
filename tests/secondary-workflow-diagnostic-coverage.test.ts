import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';

const read=(p:string)=>readFileSync(p,'utf8');

describe('secondary workflow diagnostic coverage',()=>{
  it('Deep Atlas persists structured diagnostics before blocking',()=>{
    const workflow=read('.github/workflows/shoperation-deep-atlas-scan.yml');
    const scan=read('scripts/shoperation-knowledge-deep-atlas-scan.mjs');
    expect(scan).toContain('const diagnostics=hardFindings.map');
    expect(scan).toContain('architectureExecutionError');
    expect(workflow).toContain('Create Deep Atlas failure intake');
    expect(workflow).toContain('scan-command.json');
  });

  it('Sentinel persists source collection and scan execution failures',()=>{
    const workflow=read('.github/workflows/shoperation-sentinel.yml');
    for(const marker of[
      'id: snapshot',
      'SENTINEL_SOURCE_COLLECTION_FAILED',
      'scan-diagnostic.json',
      'Create Sentinel execution failure intake',
    ])expect(workflow).toContain(marker);
  });

  it.each([
    ['.github/workflows/playroom-page-family-visual-qa.yml','playroom-page-family'],
    ['.github/workflows/playroom-v20-capability-visual-qa.yml','playroom-v20'],
    ['.github/workflows/playroom-visual-fidelity.yml','playroom-fidelity'],
    ['.github/workflows/visual-fidelity.yml','visual-fidelity'],
  ])('%s records build, runtime-readiness and capture failures',(file,slug)=>{
    const workflow=read(file);
    for(const marker of[
      'id: build',
      'id: runtime',
      'id: capture',
      'VISUAL_RUNTIME_START_FAILED',
      'VISUAL_CAPTURE_FAILED',
      'Create visual QA failure intake',
    ])expect(workflow).toContain(marker);
    expect(workflow).toContain(`${slug}-failure-intake-`);
  });

  it('baseline snapshot emits structured secret, preflight and generation evidence',()=>{
    const workflow=read('.github/workflows/customer-baseline-snapshot.yml');
    for(const marker of[
      'id: baseline-secret',
      'CUSTOMER_BASELINE_SECRET_REQUIRED',
      'id: baseline-preflight',
      'CUSTOMER_BASELINE_SOURCE_PREFLIGHT_FAILED',
      'id: baseline-generate',
      'CUSTOMER_BASELINE_SNAPSHOT_GENERATION_FAILED',
      'Create baseline snapshot failure intake',
    ])expect(workflow).toContain(marker);
  });

  it('golden promotion emits provenance and promotion diagnostics',()=>{
    const workflow=read('.github/workflows/template-golden-baseline-promotion.yml');
    for(const marker of[
      'id: evidence-provenance',
      'GOLDEN_PROMOTION_SOURCE_COMMIT_MISMATCH',
      'id: promote',
      'GOLDEN_PROMOTION_FAILED',
      'Create golden promotion failure intake',
    ])expect(workflow).toContain(marker);
  });

  it('does not relabel external bootstrap as Shoperation domain failures',()=>{
    for(const file of[
      '.github/workflows/playroom-page-family-visual-qa.yml',
      '.github/workflows/playroom-v20-capability-visual-qa.yml',
      '.github/workflows/playroom-visual-fidelity.yml',
      '.github/workflows/visual-fidelity.yml',
    ]){
      const workflow=read(file);
      expect(workflow).toContain('actions/checkout@v4');
      expect(workflow).toContain('actions/setup-node@v4');
      expect(workflow).toContain('npx playwright install --with-deps chromium');
    }
  });
});
