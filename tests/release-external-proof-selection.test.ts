// @ts-nocheck
import {describe,it,expect} from 'vitest';
import {eligibleOpenProofPrNumbers,selectExactPrFactoryProofRuns} from '../scripts/release-external-proof-selection.mjs';
const HEAD='a'.repeat(40),BASE='b'.repeat(40),OTHER='c'.repeat(40),ref='feature/f32';
const pr=(delta={})=>({number:1236,state:'open',merged_at:null,head:{sha:HEAD,ref,repo:{full_name:'infowaterk-max/water-K-'}},base:{sha:BASE,repo:{full_name:'infowaterk-max/water-K-'}},...delta});
const run=(delta={})=>({id:33,name:'Template Factory Quality Gate v2',event:'pull_request',head_sha:HEAD,head_branch:ref,created_at:'2026-10-11T20:00:00Z',status:'completed',conclusion:'success',pull_requests:[{number:1236,head:{sha:HEAD,ref},base:{sha:BASE}}],...delta});
const context={owner:'infowaterk-max',repo:'water-K-',head:HEAD,branch:ref,baseSha:BASE};
describe('CI exact PR external proof custody',()=>{
  it('accepts only current open same-repository exact head/base PR',()=>{
    expect(eligibleOpenProofPrNumbers({...context,pulls:[pr()]})).toEqual([1236]);
  });
  it.each([
    ['closed',pr({state:'closed'})],['merged',pr({merged_at:'2026-10-11T20:00:00Z'})],
    ['head',pr({head:{...pr().head,sha:OTHER}})],['branch',pr({head:{...pr().head,ref:'other'}})],
    ['base',pr({base:{...pr().base,sha:OTHER}})],['fork head',pr({head:{...pr().head,repo:{full_name:'foreign/repo'}}})],
    ['fork base',pr({base:{...pr().base,repo:{full_name:'foreign/repo'}}})],
  ])('rejects %s PR identity',(_s,item)=>expect(eligibleOpenProofPrNumbers({...context,pulls:[item]})).toEqual([]));
  it('selects successful exact PR producer over successful push canary',()=>{
    expect(selectExactPrFactoryProofRuns({runs:[run({id:1,event:'push'}),run({id:2}),run({id:3,pull_requests:[{number:1236,head:{sha:HEAD,ref},base:{sha:OTHER}}]})],head:HEAD,branch:ref,baseSha:BASE,prNumbers:[1236]}).map(r=>r.id)).toEqual([2]);
  });
  it.each([
    ['push',run({event:'push'})],['head',run({head_sha:OTHER})],['branch',run({head_branch:'other'})],
    ['base',run({pull_requests:[{number:1236,head:{sha:HEAD,ref},base:{sha:OTHER}}]})],
    ['PR',run({pull_requests:[{number:1,head:{sha:HEAD,ref},base:{sha:BASE}}]})],
    ['missing PR',run({pull_requests:[]})]
  ])('rejects %s workflow provenance',(_s,item)=>expect(selectExactPrFactoryProofRuns({runs:[item],head:HEAD,branch:ref,baseSha:BASE,prNumbers:[1236]})).toEqual([]));
  it('fails closed on missing context and invalid SHA',()=>{
    expect(eligibleOpenProofPrNumbers({...context,pulls:[pr()],head:'0'.repeat(40)})).toEqual([]);
    expect(selectExactPrFactoryProofRuns({runs:[run()],head:HEAD,branch:ref,baseSha:BASE,prNumbers:[]})).toEqual([]);
  });
});
