import {copyFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';

const evidenceDir=process.argv[2];
const templateKey=process.argv[3];
const templateVersion=Number(process.argv[4]);
const baselineDirectory=process.argv[5];

if(!evidenceDir||!templateKey||!Number.isFinite(templateVersion)||!baselineDirectory){
  throw new Error('USAGE: node scripts/promote-template-golden-baseline.mjs <evidence-dir> <template-key> <version> <baseline-dir>');
}

const evidence=JSON.parse(await readFile(path.join(evidenceDir,'manifest.json'),'utf8'));
if(evidence.contract!=='shoporation.template-factory-quality-evidence.v2')throw new Error('GOLDEN_PROMOTION_EVIDENCE_CONTRACT');
if((evidence.errors??[]).length)throw new Error('GOLDEN_PROMOTION_REQUIRES_CLEAN_EVIDENCE');

const pageTypes=['home','catalog','product','cart','checkout','account','blog','blog-article','faq','content','legal','search','not-found','order-confirmation'];
const viewports=['desktop','tablet','mobile'];
const expected=new Set(pageTypes.flatMap(pageType=>viewports.map(viewport=>`${pageType}:${viewport}`)));
const selected=(evidence.cases??[]).filter(item=>item.templateKey===templateKey&&item.templateVersion===templateVersion&&expected.has(`${item.pageType}:${item.viewport}`));

if(selected.length!==expected.size)throw new Error(`GOLDEN_PROMOTION_MATRIX_INCOMPLETE:${selected.length}/${expected.size}`);
for(const item of selected){
  if((item.errors??[]).length)throw new Error(`GOLDEN_PROMOTION_CASE_FAILED:${item.pageType}:${item.viewport}`);
  expected.delete(`${item.pageType}:${item.viewport}`);
}
if(expected.size)throw new Error(`GOLDEN_PROMOTION_MATRIX_MISSING:${[...expected].join(',')}`);

await mkdir(baselineDirectory,{recursive:true});
for(const item of selected){
  const source=path.join(evidenceDir,path.basename(item.screenshotPath));
  const target=path.join(baselineDirectory,`${item.pageType}-${item.viewport}.png`);
  await copyFile(source,target);
}
console.log(JSON.stringify({templateKey,templateVersion,baselineDirectory,promoted:selected.length,sourceCommit:evidence.sourceCommit},null,2));
