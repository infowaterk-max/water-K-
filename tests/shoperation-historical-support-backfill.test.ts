import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {SHOPERATION_KNOWN_FAILURES} from '@/lib/quality-system/shoperation-knowledge';

const runBackfill=()=>{
  execFileSync(process.execPath,['scripts/shoperation-support-history-backfill.mjs','--check'],{stdio:'pipe'});
  return JSON.parse(readFileSync('artifacts/shoperation-quality/support-history-backfill.json','utf8')) as {
    decision:string;
    documents:{file:string}[];
    incidents:{recordKey:string;disposition:string;knownFailureId:string|null}[];
    identityCollisions:{sourceId:string;knownFailureId:string}[];
    promotions:{id:string}[];
    summary:{documentCount:number;explicitIncidentCount:number;unresolvedCount:number;promotedGlobalFailureCount:number};
  };
};

describe('Shoperation historical Support Knowledge backfill',()=>{
  it('registers every Support Knowledge document and leaves no explicit historical incident undisposed',()=>{
    const report=runBackfill();
    const sourceFiles=readdirSync('docs/support').filter(name=>name.endsWith('.md')).sort();
    expect(report.decision).toBe('PASS');
    expect(report.summary.unresolvedCount).toBe(0);
    expect(report.documents.map(item=>item.file).sort()).toEqual(sourceFiles);
    expect(report.summary.documentCount).toBe(sourceFiles.length);
    expect(report.summary.explicitIncidentCount).toBeGreaterThan(60);
    expect(report.incidents.every(item=>item.disposition!=='needs-review')).toBe(true);
  });

  it('promotes the newly generalized historical root causes into complete global Known Failures',()=>{
    const report=runBackfill();
    const promoted=(JSON.parse(readFileSync('quality/knowledge/support-history-policy.v1.json','utf8')) as {promotedFailureIds:string[]}).promotedFailureIds;
    expect(report.promotions.map(item=>item.id).sort()).toEqual([...promoted].sort());
    expect(report.summary.promotedGlobalFailureCount).toBe(promoted.length);
    for(const id of promoted){
      const failure=SHOPERATION_KNOWN_FAILURES.find(item=>item.id===id);
      expect(failure,id).toBeTruthy();
      expect(failure?.invariantIds.length,id).toBeGreaterThan(0);
      expect(failure?.regressionTests.length,id).toBeGreaterThan(0);
      expect(failure?.applicability.subsystems.length,id).toBeGreaterThan(0);
    }
  });

  it('preserves historical duplicate human IDs without losing either incident',()=>{
    const report=runBackfill();
    expect(report.identityCollisions.map(item=>item.sourceId)).toEqual(expect.arrayContaining(['SKB-P4-017','SKB-P4-030']));
    expect(report.identityCollisions.every(item=>item.knownFailureId==='SQ-KF-021')).toBe(true);
    expect(new Set(report.incidents.map(item=>item.recordKey)).size).toBe(report.incidents.length);
  });

  it('requires a new explicit disposition when a future SKB/INC record is added',()=>{
    const policy=JSON.parse(readFileSync('quality/knowledge/support-history-policy.v1.json','utf8')) as {incidentRules:{titlePattern:string}[]};
    expect(policy.incidentRules.length).toBeGreaterThan(15);
    expect(policy.incidentRules.every(rule=>rule.titlePattern!=='.*')).toBe(true);
  });
});
