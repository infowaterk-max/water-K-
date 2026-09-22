import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform release evidence UX',()=>{
  test('release, recovery, rollout and post-release pages fail visibly on evidence read errors',()=>{
    const release=read('src/app/admin/kiadasok/page.tsx');
    const recovery=read('src/app/admin/helyreallitas/page.tsx');
    const rollout=read('src/app/admin/rollout/page.tsx');
    const post=read('src/app/admin/utoellenorzes/page.tsx');
    expect(release).toContain('queueError||kpiError');
    expect(release).toContain('ne hozz GO / NO-GO döntést');
    expect(recovery).toContain('serviceError||findingError||drillError||kpiError');
    expect(recovery).toContain('ne tekintsd sikeres mentésnek');
    expect(rollout).toContain('readinessError||decisionError');
    expect(rollout).toContain('Hiányos bizonyíték mellett ne engedélyezz bevezetést');
    expect(post).toContain('queueError||kpiError||candidateError');
    expect(post).toContain('Hiányos bizonyíték mellett');
  });

  test('campaign profitability fails closed when the order read itself failed',()=>{
    const campaign=read('src/app/admin/kampanyok/[id]/page.tsx');
    expect(campaign).toContain('!orderError&&!itemError');
    expect(campaign).toContain('items.length<50000');
  });

  test('suppression metrics do not display false zero values after load failure',()=>{
    const page=read('src/app/admin/kommunikacio/tiltolista/page.tsx');
    expect(page).toContain("error?'—':active.length");
    expect(page).toContain("!error&&rows.length===0");
    expect(page).toContain("!eventError&&events.length===0");
  });
});
