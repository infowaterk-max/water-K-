import{readFileSync}from'node:fs';import{describe,expect,it}from'vitest';
const policy=JSON.parse(readFileSync('deploy/release-risk-policy.json','utf8')) as {subsystems:{name:string;patterns:string[]}[]};
describe('release risk admin navigation classification',()=>{
 it('classifies canonical admin navigation authorities as admin-operations',()=>{
  const admin=policy.subsystems.find(x=>x.name==='admin-operations');
  expect(admin?.patterns).toEqual(expect.arrayContaining(['src/lib/navigation/admin-ia.ts','src/lib/navigation/entitlement-navigation.ts']));
 });
 it('does not classify storefront navigation as admin operations',()=>{
  const admin=policy.subsystems.find(x=>x.name==='admin-operations');
  expect(admin?.patterns).not.toContain('src/lib/navigation/storefront-ia.ts');
 });
});
