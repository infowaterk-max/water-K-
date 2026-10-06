import{existsSync,mkdirSync,readFileSync,readdirSync,statSync,writeFileSync}from'node:fs';
import path from'node:path';
import{evaluateSentinelIntegrity,normalizeSentinelControlPlaneEvidence}from'./lib/shoperation-sentinel-integrity.mjs';
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const outputDir=process.env.SHOPERATION_SENTINEL_OUT_DIR||'artifacts/shoperation-sentinel';
const outputPath=process.env.SHOPERATION_SENTINEL_INTEGRITY_PROBE||`${outputDir}/integrity-probe.json`;
const evidencePath=process.env.SHOPERATION_SENTINEL_INTEGRITY_EVIDENCE||'';
const controlPlaneDir=process.env.SHOPERATION_SENTINEL_CONTROL_PLANE_EVIDENCE_DIR||'';
const filesUnder=root=>{
  if(!root||!existsSync(root))return[];
  const out=[],walk=dir=>{for(const name of readdirSync(dir)){const full=path.join(dir,name);let stat;try{stat=statSync(full);}catch{continue;}if(stat.isDirectory())walk(full);else out.push(full);}};
  walk(root);return out;
};
const loadNamed=(files,name)=>{const file=files.find(item=>path.basename(item)===name);if(!file)return null;try{return readJson(file);}catch{return null;}};
mkdirSync(outputDir,{recursive:true});
let report;
try{
  const guardRegistry=readJson('quality/knowledge/guard-registry.v1.json');
  const plan=readJson(String(process.env.SHOPERATION_ACTIVE_PLAN??'').trim()||'quality/development/active-plan.json');
  let evidenceRecords=evidencePath&&existsSync(evidencePath)?readJson(evidencePath):[];
  if(!Array.isArray(evidenceRecords))throw new Error('SENTINEL_INTEGRITY_EVIDENCE_NOT_ARRAY');
  const collected=filesUnder(controlPlaneDir);
  if(controlPlaneDir)evidenceRecords=[
    ...evidenceRecords,
    ...normalizeSentinelControlPlaneEvidence({
      plan,
      run:loadNamed(collected,'run.json'),
      planBeforeCode:loadNamed(collected,'plan-before-code.json'),
      editTime:loadNamed(collected,'edit-time-guard.json'),
      finalManifest:loadNamed(collected,'final-evidence-manifest.json'),
      collectionExpected:true,
    }),
  ];
  report=evaluateSentinelIntegrity({sourceCommit:process.env.SHOPERATION_SOURCE_COMMIT||process.env.GITHUB_SHA||null,guardRegistry,plan,evidenceRecords});
  report.controlPlaneEvidence={configured:Boolean(controlPlaneDir),fileCount:collected.length,source:controlPlaneDir||null};
}catch(error){
  const reason=error instanceof Error?error.message:String(error);
  report={contract:'shoporation.sentinel-integrity-report.v1',sourceCommit:process.env.SHOPERATION_SOURCE_COMMIT||process.env.GITHUB_SHA||null,generatedAt:new Date().toISOString(),decision:'UNKNOWN',authority:false,blocking:false,autoMutationAllowed:false,counts:{findings:1,action:0,review:1},categories:['probe'],findings:[{code:'SENTINEL_INTEGRITY_PROBE_UNKNOWN',category:'probe',severity:'review',reason,evidence:{}}],controlPlaneEvidence:{configured:Boolean(controlPlaneDir),fileCount:0,source:controlPlaneDir||null}};
}
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(`Sentinel integrity probe: ${report.decision}; findings=${report.counts.findings}; action=${report.counts.action}; review=${report.counts.review}; controlPlaneFiles=${report.controlPlaneEvidence?.fileCount??0}.`);
