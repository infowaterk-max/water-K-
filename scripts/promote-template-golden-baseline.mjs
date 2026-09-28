import {copyFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';

const evidenceDir=process.argv[2];
const templateKey=process.argv[3];
const templateVersion=Number(process.argv[4]);
const baselineDirectory=process.argv[5];
const flags=process.argv.slice(6);
const allowGoldenDrift=flags.includes('--allow-golden-drift');
const flagValue=name=>{
  const prefix=`--${name}=`;
  return flags.find(value=>value.startsWith(prefix))?.slice(prefix.length);
};

if(!evidenceDir||!templateKey||!Number.isFinite(templateVersion)||!baselineDirectory){
  throw new Error('USAGE: node scripts/promote-template-golden-baseline.mjs <evidence-dir> <template-key> <version> <baseline-dir> [--allow-golden-drift] [--page-types=all|csv] [--viewports=all|csv]');
}

const evidence=JSON.parse(await readFile(path.join(evidenceDir,'manifest.json'),'utf8'));
if(evidence.contract!=='shoporation.template-factory-quality-evidence.v2')throw new Error('GOLDEN_PROMOTION_EVIDENCE_CONTRACT');

const canonicalPageTypes=['home','catalog','product','cart','checkout','account','search','content','blog-index','blog-article','faq','contact','legal','not-found'];
const canonicalViewports=['desktop','tablet','mobile'];
const parseScope=(raw,allowed,label)=>{
  if(!raw||raw==='all')return[...allowed];
  const values=[...new Set(raw.split(',').map(value=>value.trim()).filter(Boolean))];
  if(!values.length)throw new Error(`GOLDEN_PROMOTION_${label}_SCOPE_EMPTY`);
  const invalid=values.filter(value=>!allowed.includes(value));
  if(invalid.length)throw new Error(`GOLDEN_PROMOTION_${label}_SCOPE_INVALID:${invalid.join(',')}`);
  return values;
};
const pageTypes=parseScope(flagValue('page-types'),canonicalPageTypes,'PAGE_TYPES');
const viewports=parseScope(flagValue('viewports'),canonicalViewports,'VIEWPORTS');
const expected=new Set(pageTypes.flatMap(pageType=>viewports.map(viewport=>`${pageType}:${viewport}`)));
const selected=(evidence.cases??[]).filter(item=>item.templateKey===templateKey&&item.templateVersion===templateVersion&&expected.has(`${item.pageType}:${item.viewport}`));
const selectedCaseNames=new Set(selected.map(item=>`${templateKey}-v${templateVersion}-${item.pageType}-${item.viewport}`));
const goldenError=value=>typeof value==='string'&&(value==='GOLDEN_BASELINE_MISSING'||value.startsWith('GOLDEN_DIFF:'));

if(selected.length!==expected.size)throw new Error(`GOLDEN_PROMOTION_MATRIX_INCOMPLETE:${selected.length}/${expected.size}`);

for(const item of selected){
  const errors=item.errors??[];
  if(errors.length&&!allowGoldenDrift)throw new Error(`GOLDEN_PROMOTION_CASE_FAILED:${item.pageType}:${item.viewport}`);
  if(errors.some(error=>!goldenError(error)))throw new Error(`GOLDEN_PROMOTION_NON_GOLDEN_CASE_ERROR:${item.pageType}:${item.viewport}`);
  expected.delete(`${item.pageType}:${item.viewport}`);
}
if(expected.size)throw new Error(`GOLDEN_PROMOTION_MATRIX_MISSING:${[...expected].join(',')}`);

const evidenceErrors=evidence.errors??[];
for(const entry of evidenceErrors){
  if(!goldenError(entry?.error)){
    throw new Error(`GOLDEN_PROMOTION_NON_GOLDEN_EVIDENCE_ERROR:${String(entry?.case??'unknown')}:${String(entry?.error??'unknown')}`);
  }
}
const selectedEvidenceErrors=evidenceErrors.filter(entry=>selectedCaseNames.has(String(entry?.case??'')));
if(selectedEvidenceErrors.length&&!allowGoldenDrift)throw new Error('GOLDEN_PROMOTION_REQUIRES_CLEAN_EVIDENCE');
if(allowGoldenDrift&&!selectedEvidenceErrors.length)throw new Error('GOLDEN_PROMOTION_DRIFT_FLAG_REQUIRES_GOLDEN_ERRORS');

const promotionItems=allowGoldenDrift?selected.filter(item=>(item.errors??[]).some(goldenError)):selected;
if(allowGoldenDrift&&promotionItems.length!==selectedEvidenceErrors.length){
  throw new Error(`GOLDEN_PROMOTION_DRIFT_CASE_COUNT_MISMATCH:${promotionItems.length}/${selectedEvidenceErrors.length}`);
}

await mkdir(baselineDirectory,{recursive:true});
for(const item of promotionItems){
  const source=path.join(evidenceDir,path.basename(item.screenshotPath));
  const target=path.join(baselineDirectory,`${item.pageType}-${item.viewport}.png`);
  await copyFile(source,target);
}
console.log(JSON.stringify({
  templateKey,
  templateVersion,
  baselineDirectory,
  scope:{pageTypes,viewports},
  promoted:promotionItems.length,
  sourceCommit:evidence.sourceCommit,
  acceptedGoldenDrift:allowGoldenDrift&&selectedEvidenceErrors.length>0,
  acceptedGoldenDriftCount:selectedEvidenceErrors.length,
  ignoredGoldenDriftCount:evidenceErrors.length-selectedEvidenceErrors.length,
},null,2));
