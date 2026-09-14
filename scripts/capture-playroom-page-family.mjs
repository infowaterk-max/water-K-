import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.PLAYROOM_FAMILY_OUTPUT_DIR??'artifacts/playroom-page-family';
const pageTypes=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[];
try{
  for(const pageType of pageTypes){
    const url=`${baseUrl}/visual-fidelity-qa?template=gaming.playroom&version=19&page=${encodeURIComponent(pageType)}&viewport=desktop`;
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    await page.emulateMedia({reducedMotion:'reduce'});
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error(`PLAYROOM_FAMILY_ROUTE_FAILED:${pageType}:${response?.status()??'no-response'}`);
    await page.addStyleTag({content:'html,body,#main-content{margin:0!important;padding:0!important;background:#020b17!important}.cookieBanner,.skipLink{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
    await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async image=>{if(image.complete)return;await new Promise(resolve=>{const done=()=>resolve(undefined);image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});setTimeout(done,3000);});}));});
    const roots=page.locator('[data-visual-fidelity-root="runtime"]:visible');
    if(await roots.count()!==1)throw new Error(`PLAYROOM_FAMILY_RUNTIME_ROOT_COUNT:${pageType}:${await roots.count()}`);
    const root=roots.first();
    await root.waitFor({state:'visible',timeout:15000});
    await page.waitForTimeout(180);
    const box=await root.boundingBox();
    if(!box)throw new Error(`PLAYROOM_FAMILY_ROOT_BOX_MISSING:${pageType}`);
    const path=`${outputDir}/playroom-${pageType}-desktop-full.png`;
    await root.screenshot({path,animations:'disabled',timeout:20000});
    captures.push({pageType,url,path,width:box.width,height:box.height,title:await page.title()});
    await page.close();
  }
}finally{
  await browser.close();
}

const evidence={version:'shoporation.playroom-page-family.v1',template:'gaming.playroom',templateVersion:19,sourceCommit:process.env.GITHUB_SHA??null,viewport:{width:1440,height:1000},captures,capturedAt:new Date().toISOString()};
await writeFile(`${outputDir}/manifest.json`,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
