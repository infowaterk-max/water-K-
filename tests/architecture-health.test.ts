import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('Architecture Drift + Confidence + Guard Rationalization',()=>{
  it('keeps blocking guard responsibilities unique',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8')) as {guards:Array<{id:string;blocking:boolean;responsibilityKey:string}>};
    const blocking=registry.guards.filter(item=>item.blocking);
    expect(new Set(blocking.map(item=>item.id)).size).toBe(blocking.length);
    expect(new Set(blocking.map(item=>item.responsibilityKey)).size).toBe(blocking.length);
  });

  it('produces a deterministic PASS architecture health report for the current canonical registries',()=>{
    execFileSync('node',['scripts/lib/shoperation-architecture-health.mjs','--check'],{encoding:'utf8'});
    const report=JSON.parse(readFileSync('artifacts/shoperation-architecture/architecture-health.json','utf8')) as {
      contract:string;decision:string;hardDrift:unknown[];warnings:unknown[];
      confidence:{average:number;capabilities:Array<{capabilityId:string;score:number;level:string}>};
      guards:{blocking:number;blockingResponsibilityCount:number};
    };
    expect(report.contract).toBe('shoporation.architecture-health.v1');
    expect(report.decision).toBe('PASS');
    expect(report.hardDrift).toEqual([]);
    expect(report.confidence.capabilities.length).toBeGreaterThanOrEqual(10);
    expect(report.confidence.average).toBeGreaterThan(0);
    expect(report.guards.blocking).toBe(report.guards.blockingResponsibilityCount);
  });

  it('keeps confidence informational and does not create another CI gate authority',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8')) as {guards:Array<{id:string;blocking:boolean}>};
    expect(registry.guards.find(item=>item.id==='SIGNAL-ARCHITECTURE-CONFIDENCE')?.blocking).toBe(false);
    const workflow=readFileSync('.github/workflows/ci.yml','utf8');
    expect(workflow).not.toContain('Architecture Confidence Gate');
  });
});
