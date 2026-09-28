import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';
import{parseSentinelIssueBody,sentinelStatusLabel,sentinelStatusTone}from'../src/app/admin/megfigyeles/sentinel-health';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Sentinel System Health surface',()=>{
  it('parses the persisted Sentinel attention contract without needing GitHub as the operator UI',()=>{
    const body=`<!-- shoperation-sentinel -->
<!-- shoperation-sentinel-state:REVIEW -->

Source commit: \`abc123\`

Status: **REVIEW**

Generated: \`2026-09-28T18:00:00.000Z\`

Main/scheduled 24h failures: **1/12**

Main/scheduled 7d failures: **2/70**

Main/scheduled 30d failures: **4/300**

Open Failure Intake fingerprints: **2**

Deep Atlas attention issues: **0**

Recommendations:
- Strengthen the earliest existing gate.
- Disposition the open fingerprint.

Sentinel is observation-only. It cannot modify code or override an existing authority.`;
    const parsed=parseSentinelIssueBody(body);
    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe('REVIEW');
    expect(parsed?.main7dFailures).toBe(2);
    expect(parsed?.main7dRuns).toBe(70);
    expect(parsed?.openFingerprints).toBe(2);
    expect(parsed?.recommendations).toEqual(['Strengthen the earliest existing gate.','Disposition the open fingerprint.']);
  });

  it('maps operator states to unambiguous Hungarian labels and tones',()=>{
    expect(sentinelStatusLabel('HEALTHY')).toBe('Egészséges');
    expect(sentinelStatusTone('HEALTHY')).toBe('ok');
    expect(sentinelStatusTone('ACTION_REQUIRED')).toBe('danger');
    expect(sentinelStatusTone('UNAVAILABLE')).toBe('warning');
  });

  it('integrates Sentinel into the platform-only monitoring center and fails visibly when evidence is unavailable',()=>{
    const page=read('src/app/admin/megfigyeles/page.tsx');
    const health=read('src/app/admin/megfigyeles/sentinel-health.ts');
    expect(page).toContain('requirePlatformOperator');
    expect(page).toContain('Shoperation Sentinel');
    expect(page).toContain('loadSentinelHealth');
    expect(page).toContain('A Sentinel állapot nem bizonyítható.');
    expect(health).toContain('/actions/workflows/shoperation-sentinel.yml/runs?branch=main&per_page=1');
    expect(health).toContain("next:{revalidate:300}");
    expect(health).toContain("return empty('UNAVAILABLE'");
    expect(health).not.toContain('GITHUB_TOKEN');
  });
});
