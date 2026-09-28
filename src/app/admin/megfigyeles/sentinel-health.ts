export type SentinelSurfaceStatus='HEALTHY'|'REVIEW'|'ACTION_REQUIRED'|'PENDING'|'UNAVAILABLE';

type SentinelIssueSnapshot={
  status:'REVIEW'|'ACTION_REQUIRED';
  generatedAt:string|null;
  sourceCommit:string|null;
  main24hFailures:number|null;
  main24hRuns:number|null;
  main7dFailures:number|null;
  main7dRuns:number|null;
  main30dFailures:number|null;
  main30dRuns:number|null;
  openFingerprints:number|null;
  deepAtlasAttention:number|null;
  recommendations:string[];
};

export type SentinelHealthSnapshot=SentinelIssueSnapshot&{
  status:SentinelSurfaceStatus;
  latestRunId:number|null;
  latestRunConclusion:string|null;
  latestRunUpdatedAt:string|null;
  message:string;
};

type GithubWorkflowRun={id:number;status:string;conclusion:string|null;updated_at:string;head_sha:string};
type GithubRunsResponse={workflow_runs?:GithubWorkflowRun[]};
type GithubIssue={body:string|null;title:string;state:string;updated_at:string;pull_request?:unknown};
type GithubIssuesResponse=GithubIssue[];

const repository=()=>{
  const explicit=process.env.SHOPERATION_SENTINEL_GITHUB_REPOSITORY?.trim();
  if(explicit)return explicit;
  const owner=process.env.VERCEL_GIT_REPO_OWNER?.trim(),slug=process.env.VERCEL_GIT_REPO_SLUG?.trim();
  if(owner&&slug)return `${owner}/${slug}`;
  throw new Error('SENTINEL_REPOSITORY_IDENTITY_UNAVAILABLE');
};

const empty=(status:SentinelSurfaceStatus,message:string,run?:GithubWorkflowRun|null):SentinelHealthSnapshot=>({
  status,
  generatedAt:null,
  sourceCommit:run?.head_sha??null,
  main24hFailures:null,
  main24hRuns:null,
  main7dFailures:null,
  main7dRuns:null,
  main30dFailures:null,
  main30dRuns:null,
  openFingerprints:null,
  deepAtlasAttention:null,
  recommendations:[],
  latestRunId:run?.id??null,
  latestRunConclusion:run?.conclusion??null,
  latestRunUpdatedAt:run?.updated_at??null,
  message,
});

const metric=(body:string,label:string)=>{
  const escaped=label.replace(/[.*+?^{}()|[\]\\]/g,'\\$&');
  const match=body.match(new RegExp(`${escaped}: \\\*\\\*(\\d+)\\/(\\d+)\\\*\\\*`));
  return match?{value:Number(match[1]),total:Number(match[2])}:null;
};
const single=(body:string,label:string)=>{
  const escaped=label.replace(/[.*+?^{}()|[\]\\]/g,'\\$&');
  const match=body.match(new RegExp(`${escaped}: \\\*\\\*(\\d+)\\\*\\\*`));
  return match?Number(match[1]):null;
};
const codeValue=(body:string,label:string)=>{
  const escaped=label.replace(/[.*+?^{}()|[\]\\]/g,'\\$&');
  return body.match(new RegExp(`${escaped}: \\\`([^\\\`]+)\\\``))?.[1]??null;
};
const recommendations=(body:string)=>{
  const tail=body.split('Recommendations:')[1]??'';
  const section=tail.split('Sentinel is observation-only.')[0]??'';
  return section.split(/\r?\n/).map(line=>line.trim()).filter(line=>line.startsWith('- ')).map(line=>line.slice(2).trim()).filter(Boolean).slice(0,3);
};

export function parseSentinelIssueBody(body:string):SentinelIssueSnapshot|null{
  const state=body.match(/<!-- shoperation-sentinel-state:(REVIEW|ACTION_REQUIRED) -->/)?.[1] as SentinelIssueSnapshot['status']|undefined;
  if(!state)return null;
  const d24=metric(body,'Main/scheduled 24h failures');
  const d7=metric(body,'Main/scheduled 7d failures');
  const d30=metric(body,'Main/scheduled 30d failures');
  return{
    status:state,
    generatedAt:codeValue(body,'Generated'),
    sourceCommit:codeValue(body,'Source commit'),
    main24hFailures:d24?.value??null,
    main24hRuns:d24?.total??null,
    main7dFailures:d7?.value??null,
    main7dRuns:d7?.total??null,
    main30dFailures:d30?.value??null,
    main30dRuns:d30?.total??null,
    openFingerprints:single(body,'Open Failure Intake fingerprints'),
    deepAtlasAttention:single(body,'Deep Atlas attention issues'),
    recommendations:recommendations(body),
  };
}

async function githubJson<T>(path:string):Promise<T>{
  const response=await fetch(`https://api.github.com/repos/${repository()}${path}`,{
    headers:{accept:'application/vnd.github+json','user-agent':'shoperation-sentinel-health'},
    next:{revalidate:300},
  });
  if(!response.ok)throw new Error(`GitHub Sentinel health request failed (${response.status})`);
  return await response.json() as T;
}

export async function loadSentinelHealth():Promise<SentinelHealthSnapshot>{
  try{
    const[runs,issues]=await Promise.all([
      githubJson<GithubRunsResponse>('/actions/workflows/shoperation-sentinel.yml/runs?branch=main&per_page=1'),
      githubJson<GithubIssuesResponse>('/issues?state=open&sort=updated&direction=desc&per_page=100'),
    ]);
    const latest=runs.workflow_runs?.[0]??null;
    if(!latest)return empty('PENDING','Az első automatikus Sentinel Deep Scan még nem futott.');
    if(latest.status!=='completed')return empty('PENDING','A Sentinel Deep Scan jelenleg fut.',latest);
    if(latest.conclusion!=='success')return empty('UNAVAILABLE','A legutóbbi Sentinel Deep Scan nem adott megbízható eredményt. A hiányzó állapot nem tekinthető hibamentesnek.',latest);
    const issue=issues.find(row=>!row.pull_request&&(row.body??'').includes('<!-- shoperation-sentinel -->'));
    if(issue?.body){
      const parsed=parseSentinelIssueBody(issue.body);
      if(parsed)return{
        ...parsed,
        latestRunId:latest.id,
        latestRunConclusion:latest.conclusion,
        latestRunUpdatedAt:latest.updated_at,
        message:parsed.status==='ACTION_REQUIRED'?'A Sentinel bizonyított, beavatkozást igénylő rendszerszintű mintát talált.':'A Sentinel olyan mintát talált, amelyet érdemes felülvizsgálni, de még nem bizonyított rendszerszintű kontrollhiba.',
      };
    }
    return empty('HEALTHY','A legutóbbi Sentinel Deep Scan nem talált beavatkozást igénylő rendszerszintű mintát.',latest);
  }catch{
    return empty('UNAVAILABLE','A Sentinel állapota most nem tölthető be. A hiányzó állapot nem tekinthető hibamentesnek.');
  }
}

export const sentinelStatusLabel=(status:SentinelSurfaceStatus)=>({
  HEALTHY:'Egészséges',
  REVIEW:'Felülvizsgálat',
  ACTION_REQUIRED:'Beavatkozás szükséges',
  PENDING:'Futásra vár',
  UNAVAILABLE:'Nem elérhető',
})[status];

export const sentinelStatusTone=(status:SentinelSurfaceStatus)=>status==='HEALTHY'?'ok':status==='ACTION_REQUIRED'?'danger':status==='REVIEW'||status==='PENDING'||status==='UNAVAILABLE'?'warning':'neutral';
