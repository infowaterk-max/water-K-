// PR source authority for CI external Factory proof; does not grant Product Owner acceptance.
const sha=/^[0-9a-f]{40}$/i;
const valid=value=>sha.test(String(value??''))&&!/^0+$/.test(String(value??''));
export function eligibleOpenProofPrNumbers({pulls=[],owner='',repo='',head='',branch='',baseSha=''}={}){
  if(!valid(head)||!valid(baseSha)||!owner||!repo||!branch)return[];
  const full=owner+'/'+repo;
  return [...new Set(pulls.filter(pr=>pr?.state==='open'&&!pr.merged_at&&
    pr.head?.sha===head&&pr.head?.ref===branch&&pr.base?.sha===baseSha&&
    pr.head?.repo?.full_name===full&&pr.base?.repo?.full_name===full&&
    Number.isInteger(pr.number)&&pr.number>0).map(pr=>pr.number))].sort((a,b)=>a-b);
}
export function selectExactPrFactoryProofRuns({runs=[],head='',branch='',baseSha='',prNumbers=[]}={}){
  if(!valid(head)||!valid(baseSha)||!branch)return[];
  const allowed=new Set(prNumbers);if(!allowed.size)return[];
  return runs.filter(run=>run?.name==='Template Factory Quality Gate v2'&&
    run.event==='pull_request'&&run.head_sha===head&&run.head_branch===branch&&
    (run.pull_requests??[]).some(pr=>allowed.has(pr.number)&&pr.head?.sha===head&&
      pr.head?.ref===branch&&pr.base?.sha===baseSha)
  ).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
}
