import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Daily Deep Atlas Scan',()=>{
  it('is a scheduled observation layer, not a duplicate CI gate',()=>{
    const workflow=read('.github/workflows/shoperation-deep-atlas-scan.yml');
    expect(workflow).toContain("cron: '37 3 * * *'");
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).toContain('continue-on-error: true');
    expect(workflow).toContain('Fail workflow on hard architecture drift');
    const ci=read('.github/workflows/ci.yml');
    expect(ci).not.toContain('Daily Deep Atlas Scan');
  });

  it('uses Atlas and Architecture Health as existing authorities',()=>{
    const script=read('scripts/shoperation-knowledge-deep-atlas-scan.mjs');
    expect(script).toContain('buildCodebaseAtlas');
    expect(script).toContain('validateCodebaseAtlas');
    expect(script).toContain("scripts/lib/shoperation-architecture-health.mjs");
    expect(script).toContain("contract:'shoporation.deep-atlas-scan.v1'");
  });

  it('blocks only on hard self-knowledge drift while keeping other findings informational',()=>{
    const policy=JSON.parse(read('quality/knowledge/deep-atlas-scan-policy.v1.json')) as {
      behavior:{ciGate:boolean;pullRequestGate:boolean;hardFailureSources:string[];warningSources:string[]}
    };
    expect(policy.behavior.ciGate).toBe(false);
    expect(policy.behavior.pullRequestGate).toBe(false);
    expect(policy.behavior.hardFailureSources).toEqual(['atlas-validation','architecture-hard-drift']);
    expect(policy.behavior.warningSources).toContain('low-capability-confidence');
  });

  it('registers the scan as a non-blocking signal with a unique responsibility',()=>{
    const registry=JSON.parse(read('quality/knowledge/guard-registry.v1.json')) as {guards:Array<{id:string;blocking:boolean;responsibilityKey:string}>};
    const scan=registry.guards.find(item=>item.id==='SIGNAL-DEEP-ATLAS-SCAN');
    expect(scan).toBeTruthy();
    expect(scan?.blocking).toBe(false);
    expect(registry.guards.filter(item=>item.blocking&&item.responsibilityKey===scan?.responsibilityKey)).toHaveLength(0);
  });

  it('does not run production release proof on feature-branch push noise',()=>{
    const ci=read('.github/workflows/ci.yml');
    expect(ci).toContain("if: github.event_name == 'pull_request' || github.ref_name == 'main'");
  });

  it('records Drift Confidence as proven while keeping Deep Atlas incomplete until its own merge proof exists',()=>{
    const roadmap=JSON.parse(read('quality/knowledge/living-roadmap.v1.json')) as {items:Array<{id:string;status:string;evidenceRefs:string[]}>};
    const drift=roadmap.items.find(item=>item.id==='DRIFT-CONFIDENCE');
    const deep=roadmap.items.find(item=>item.id==='DEEP-ATLAS-SCAN');
    expect(drift?.status).toBe('done');
    expect(drift?.evidenceRefs).toContain('EVID-DRIFT-CONFIDENCE');
    expect(deep?.status).toBe('in-progress');
    expect(deep?.evidenceRefs).toEqual([]);
  });
});
