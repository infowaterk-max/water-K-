import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.PLAYROOM_FIDELITY_OUTPUT_DIR??'artifacts/playroom-fidelity';
const url=`${baseUrl}/visual-fidelity-qa?template=gaming.playroom&version=2&page=home&viewport=desktop`;

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1648,height:928},deviceScaleFactor:1});
  await page.emulateMedia({reducedMotion:'reduce'});
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  if(!response?.ok())throw new Error(`PLAYROOM_FIDELITY_ROUTE_FAILED:${response?.status()??'no-response'}`);
  await page.addStyleTag({content:'html,body,#main-content{margin:0!important;padding:0!important;background:#020b17!important}.cookieBanner,.skipLink{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
  await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
  await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async image=>{if(image.complete)return;await new Promise(resolve=>{const done=()=>resolve(undefined);image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});setTimeout(done,3000);});}));});
  const roots=page.locator('[data-visual-fidelity-root="runtime"]:visible');
  if(await roots.count()!==1)throw new Error(`PLAYROOM_FIDELITY_RUNTIME_ROOT_COUNT:${await roots.count()}`);
  const root=roots.first();
  await root.waitFor({state:'visible',timeout:15000});
  await page.waitForTimeout(300);
  const box=await root.boundingBox();
  if(!box)throw new Error('PLAYROOM_FIDELITY_ROOT_BOX_MISSING');
  const viewportPath=`${outputDir}/playroom-home-desktop-1648x928.png`;
  const fullPath=`${outputDir}/playroom-home-desktop-full.png`;
  await page.screenshot({path:viewportPath,animations:'disabled',fullPage:false,timeout:20000});
  await root.screenshot({path:fullPath,animations:'disabled',timeout:20000});
  const evidence={version:'shoporation.playroom-fidelity.v1',template:'gaming.playroom',templateVersion:2,sourceCommit:process.env.GITHUB_SHA??null,url,viewport:{width:1648,height:928},runtimeRoot:{width:box.width,height:box.height},viewportPath,fullPath,title:await page.title(),capturedAt:new Date().toISOString()};
  await writeFile(`${outputDir}/manifest.json`,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence,null,2));
  await page.close();
}finally{
  await browser.close();
}
