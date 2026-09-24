import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const policy=JSON.parse(readFileSync('deploy/release-risk-policy.json','utf8')) as {neutralPatterns:string[];subsystems:{name:string;risk:string;patterns:string[]}[]};

describe('release risk incident transaction classification',()=>{
 it('keeps quality/development knowledge evidence out of substantive release scope',()=>{
  expect(policy.neutralPatterns).toContain('quality/development/**');
  expect(policy.neutralPatterns).toContain('quality/knowledge/**');
 });
 it('classifies the Incident Intelligence runtime as one medium-risk subsystem',()=>{
  const incident=policy.subsystems.find(item=>item.name==='incident-intelligence');
  expect(incident?.risk).toBe('medium');
  expect(incident?.patterns).toEqual(expect.arrayContaining(['src/lib/incidents/**','src/app/admin/platform/incidents/**','src/app/api/platform/incidents/**','src/components/admin/platform-incident-center.tsx']));
  expect(policy.subsystems.findIndex(item=>item.name==='incident-intelligence')).toBeLessThan(policy.subsystems.findIndex(item=>item.name==='admin-operations'));
 });
});
