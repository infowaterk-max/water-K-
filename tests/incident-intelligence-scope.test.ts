import{readFileSync}from'node:fs';import{describe,expect,it}from'vitest';
const release=JSON.parse(readFileSync('deploy/release-risk-policy.json','utf8')) as {subsystems:{name:string;risk:string;patterns:string[]}[]};
const guard=JSON.parse(readFileSync('quality/knowledge/development-guard-policy.v1.json','utf8')) as {intentMatchers:{pattern:string;subsystems:string[]}[];negativeKnowledgeApplicability:Record<string,string[]>};
const knowledge=JSON.parse(readFileSync('quality/knowledge/shoperation-quality-knowledge.v1.json','utf8')) as {authorityRules:{id:string;rule:string}[];negativeKnowledge:{id:string;rule:string}[];knownFailures:{id:string;applicability:{mode:string;subsystems:string[]}}[]};
describe('Incident Intelligence scope authority',()=>{
  it('classifies incident runtime and APIs as one bounded subsystem',()=>{
    const subsystem=release.subsystems.find(x=>x.name==='incident-intelligence');
    expect(subsystem).toMatchObject({risk:'medium'});
    expect(subsystem?.patterns).toEqual(expect.arrayContaining(['src/lib/incidents/**','src/app/api/incidents/**','src/app/api/platform/incidents/**','src/app/api/internal/incidents/**']));
  });
  it('loads incident-specific Development Guard intent',()=>{
    const matcher=guard.intentMatchers.find(x=>x.subsystems.includes('incident-intelligence'));
    expect(matcher?.pattern).toMatch(/incident/);
    expect(matcher?.pattern).toMatch(/self-healing/);
  });
  it('makes parallel authority, shared-capability duplication and tenant ambiguity applicable',()=>{
    for(const id of['SQ-KF-001','SQ-KF-011','SQ-KF-017']){
      const failure=knowledge.knownFailures.find(x=>x.id===id);
      expect(failure?.applicability.subsystems,id).toContain('incident-intelligence');
    }
  });
  it('records the autonomous repair boundary as global authority and negative knowledge',()=>{
    expect(knowledge.authorityRules.find(x=>x.id==='SQ-AUTH-018')?.rule).toContain('allowlisted');
    expect(knowledge.authorityRules.find(x=>x.id==='SQ-AUTH-018')?.rule).toContain('branch/PR');
    expect(knowledge.negativeKnowledge.find(x=>x.id==='SQ-NK-013')?.rule).toContain('directly to production');
    expect(guard.negativeKnowledgeApplicability['SQ-NK-013']).toContain('incident-intelligence');
  });
});
