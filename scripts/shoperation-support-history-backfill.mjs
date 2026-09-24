import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const policy=JSON.parse(readFileSync('quality/knowledge/support-history-policy.v1.json','utf8'));
const knowledge=JSON.parse(readFileSync('quality/knowledge/shoperation-quality-knowledge.v1.json','utf8'));
const tfSource=readFileSync('src/lib/builder/template-factory/knowledge-registry.ts','utf8');
const tfIds=new Set([...tfSource.matchAll(/id:'(TF-KF-\d+)'/g)].map(match=>match[1]));
const knownIds=new Set([...knowledge.knownFailures.map(item=>item.id),...tfIds]);
const supportDir=policy.sourceDirectory;
const files=readdirSync(supportDir).filter(name=>name.endsWith('.md')).sort();
const documentRuleByFile=new Map(policy.documentRules.map(rule=>[rule.file,rule]));
const unregisteredDocuments=files.filter(file=>!documentRuleByFile.has(file));
const staleDocumentRules=policy.documentRules.filter(rule=>!files.includes(rule.file)).map(rule=>rule.file);
const documents=files.map(file=>({file,...(documentRuleByFile.get(file)??{recordType:'unregistered',subsystems:[]})}));

const explicit=/^##\s+((?:SKB|INC)-[^\n—]+?)(?:\s+—\s+([^\n]+))?\s*$/gm;
const incidents=[];
const unresolved=[];
const danglingKnownFailureIds=[];
const identityGroups=new Map();

for(const file of files){
  const content=readFileSync(path.join(supportDir,file),'utf8');
  const occurrences=new Map();
  for(const match of content.matchAll(explicit)){
    const sourceId=match[1].trim();
    const title=(match[2]??sourceId).trim();
    const occurrence=(occurrences.get(sourceId)??0)+1;
    occurrences.set(sourceId,occurrence);
    const recordKey=`${file}::${sourceId}::${occurrence}`;
    const groupKey=`${file}::${sourceId}`;
    const group=identityGroups.get(groupKey)??[];
    group.push(recordKey);
    identityGroups.set(groupKey,group);

    const rule=policy.incidentRules.find(candidate=>{
      if(candidate.file&&candidate.file!==file)return false;
      if(candidate.sourceIdPattern&&!new RegExp(candidate.sourceIdPattern,'i').test(sourceId))return false;
      return new RegExp(candidate.titlePattern,'i').test(title);
    });
    if(!rule){
      const record={recordKey,file,sourceId,title,occurrence,disposition:'needs-review',knownFailureId:null,subsystems:documentRuleByFile.get(file)?.subsystems??[],reason:'No explicit historical disposition rule matched this incident.'};
      incidents.push(record);unresolved.push(record);continue;
    }
    if(rule.knownFailureId&&!knownIds.has(rule.knownFailureId))danglingKnownFailureIds.push({recordKey,knownFailureId:rule.knownFailureId});
    incidents.push({recordKey,file,sourceId,title,occurrence,disposition:rule.disposition,knownFailureId:rule.knownFailureId??null,subsystems:rule.subsystems??documentRuleByFile.get(file)?.subsystems??[],reason:rule.reason});
  }
}
const identityCollisions=[...identityGroups.entries()].filter(([,keys])=>keys.length>1).map(([groupKey,canonicalRecordKeys])=>({groupKey,sourceId:groupKey.split('::').at(-1),canonicalRecordKeys,disposition:'new-global-failure',knownFailureId:'SQ-KF-021'}));
if(identityCollisions.length&&!knownIds.has('SQ-KF-021'))danglingKnownFailureIds.push({recordKey:'identity-collisions',knownFailureId:'SQ-KF-021'});

const dispositionCounts=incidents.reduce((acc,item)=>(acc[item.disposition]=(acc[item.disposition]??0)+1,acc),{});
const report={
  contract:'shoporation.support-history-backfill.v1',
  sourceDirectory:supportDir,
  documents,
  incidents,
  identityCollisions,
  promotions:policy.promotedFailureIds.map(id=>knowledge.knownFailures.find(item=>item.id===id)).filter(Boolean).map(item=>({id:item.id,title:item.title})),
  summary:{
    documentCount:documents.length,
    explicitIncidentCount:incidents.length,
    dispositionCounts,
    identityCollisionCount:identityCollisions.length,
    promotedGlobalFailureCount:policy.promotedFailureIds.length,
    unresolvedCount:unresolved.length+unregisteredDocuments.length+staleDocumentRules.length+danglingKnownFailureIds.length,
  },
  unresolved:{incidentRecords:unresolved,unregisteredDocuments,staleDocumentRules,danglingKnownFailureIds},
  decision:unresolved.length||unregisteredDocuments.length||staleDocumentRules.length||danglingKnownFailureIds.length?'BLOCK':'PASS',
};
mkdirSync('artifacts/shoperation-quality',{recursive:true});
writeFileSync('artifacts/shoperation-quality/support-history-backfill.json',JSON.stringify(report,null,2)+'\n');
const md=[
  '# Shoperation historical Support Knowledge backfill','',
  `Decision: **${report.decision}**`,
  `Documents: ${report.summary.documentCount}`,
  `Explicit incidents: ${report.summary.explicitIncidentCount}`,
  `Promoted global failures: ${report.summary.promotedGlobalFailureCount}`,
  `Identity collisions preserved with canonical keys: ${report.summary.identityCollisionCount}`,
  `Unresolved: ${report.summary.unresolvedCount}`,'',
  ...incidents.map(item=>`- ${item.recordKey} — ${item.disposition}${item.knownFailureId?` → ${item.knownFailureId}`:''}`),
];
writeFileSync('artifacts/shoperation-quality/support-history-backfill.md',md.join('\n')+'\n');
console.log(`Historical Support Knowledge backfill: ${report.decision}; documents=${report.summary.documentCount}; incidents=${report.summary.explicitIncidentCount}; promoted=${report.summary.promotedGlobalFailureCount}; unresolved=${report.summary.unresolvedCount}.`);
if(report.decision!=='PASS'&&process.argv.includes('--check'))process.exit(1);
