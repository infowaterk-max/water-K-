import {copyFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';

const evidenceDir=process.argv[2];
const templateKey=process.argv[3];
const templateVersion=Number(process.argv[4]);
const baselineDirectory=process.argv[5];
const allowGoldenDrift=process.argv[6]==='--allow-golden-drift';

if(!evidenceDir||!templateKey||!Number.isFinite(templateVersion)||!baselineDirectory){
  throw new Error('USAGE: node scripts/promote-template-golden-baseline.mjs <evidence-dir> <template-key> <version> <baseline-dir> [--allow-golden-drift]');
}

const evidence=JSON.parse(await readFile(path.join(evidenceDir,'manifest.json'),'utf8'));
if(evidence.contract!=='shoporation.template-factory-quality-evidence.v2')throw new Error('GOLDEN_PROMOTION_EVIDENCE_CONTRACT');

const pageTypes=['home','catalog','product','cart','checkout','account','search','content','blog-index','blog-article','faq','contact','legal','not-found'];
const viewports=['desktop','tablet','mobile'];
const expected=new Set(pageTypes.flatMap(pageType=>viewports.map(viewport=>`${pageType}:${viewport}`)));
const selected=(evidence.cases??[]).filter(item=>item.templateKey===templateKey&&item.templateVersion===templateVersion&&expected.has(`${item.pageType}:${item.viewport}`));
const selectedCaseNames=new Set(selected.map(item=>`${templateKey}-v${templateVersion}-${item.pageType}-${item.viewport}`));
const goldenError=(value)=>typeof value==='string'&&(value==='GOLDEN_BASELINE_MISSING'||value.startsWith('GOLDEN_DIFF:'));

if(selected.length!==expected.size)throw new Error(`GOLDEN_PROMOTION_MATRIX_INCOMPLETE:${selected.length}/${expected.size}`);

for(const item of selected){
  const errors=item.errors??[];
  if(errors.length&&!allowGoldenDrift)throw new Error(`GOLDEN_PROMOTION_CASE_FAILED:${item.pageType}:${item.viewport}`);
  if(errors.some(error=>!goldenError(error)))throw new Error(`GOLDEN_PROMOTION_NON_GOLDEN_CASE_ERROR:${item.pageType}:${item.viewport}`);
  expected.delete(`${item.pageType}:${item.viewport}`);
}
if(expected.size)throw new Error(`GOLDEN_PROMOTION_MATRIX_MISSING:${[...expected].join(',')}`);

const evidenceErrors=evidence.errors??[];
if(evidenceErrors.length&&!allowGoldenDrift)throw new Error('GOLDEN_PROMOTION_REQUIRES_CLEAN_EVIDENCE');
for(const entry of evidenceErrors){
  const caseName=typeof entry?.case==='string'?entry.case:'';
  const error=entry?.error;
  if(!selectedCaseNames.has(caseName)||!goldenError(error)){
    throw new Error(`GOLDEN_PROMOTION_NON_GOLDEN_EVIDENCE_ERROR:${caseName||'unknown'}:${String(error??'unknown')}`);
  }
}
if(allowGoldenDrift&&!evidenceErrors.length){
  console.warn('GOLDEN_PROMOTION_DRIFT_FLAG_UNUSED');
}

await mkdir(baselineDirectory,{recursive:true});
for(const item of selected){
  const source=path.join(evidenceDir,path.basename(item.screenshotPath));
  const target=path.join(baselineDirectory,`${item.pageType}-${item.viewport}.png`);
  await copyFile(source,target);
}
console.log(JSON.stringify({
  templateKey,
  templateVersion,
  baselineDirectory,
  promoted:selected.length,
  sourceCommit:evidence.sourceCommit,
  acceptedGoldenDrift:allowGoldenDrift&&evidenceErrors.length>0,
  goldenDriftCount:evidenceErrors.length,
},null,2));
