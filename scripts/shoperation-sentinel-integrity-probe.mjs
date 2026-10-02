import{existsSync,mkdirSync,readFileSync,writeFileSync}from'node:fs';
import{evaluateSentinelIntegrity}from'./lib/shoperation-sentinel-integrity.mjs';
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const outputDir=process.env.SHOPERATION_SENTINEL_OUT_DIR||'artifacts/shoperation-sentinel';
const outputPath=process.env.SHOPERATION_SENTINEL_INTEGRITY_PROBE||`${outputDir}/integrity-probe.json`;
const evidencePath=process.env.SHOPERATION_SENTINEL_INTEGRITY_EVIDENCE||'';
mkdirSync(outputDir,{recursive:true});
let report;
try{
  const guardRegistry=readJson('quality/knowledge/guard-registry.v1.json');
  const plan=readJson('quality/development/active-plan.json');
  const evidenceRecords=evidencePath&&existsSync(evidencePath)?readJson(evidencePath):[];
  if(!Array.isArray(evidenceRecords))throw new Error('SENTINEL_INTEGRITY_EVIDENCE_NOT_ARRAY');
  report=evaluateSentinelIntegrity({sourceCommit:process.env.SHOPERATION_SOURCE_COMMIT||process.env.GITHUB_SHA||null,guardRegistry,plan,evidenceRecords});
}catch(error){
  const reason=error instanceof Error?error.message:String(error);
  report={contract:'shoporation.sentinel-integrity-report.v1',sourceCommit:process.env.SHOPERATION_SOURCE_COMMIT||process.env.GITHUB_SHA||null,generatedAt:new Date().toISOString(),decision:'UNKNOWN',authority:false,blocking:false,autoMutationAllowed:false,counts:{findings:1,action:0,review:1},categories:['probe'],findings:[{code:'SENTINEL_INTEGRITY_PROBE_UNKNOWN',category:'probe',severity:'review',reason,evidence:{}}]};
}
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(`Sentinel integrity probe: ${report.decision}; findings=${report.counts.findings}; action=${report.counts.action}; review=${report.counts.review}.`);
