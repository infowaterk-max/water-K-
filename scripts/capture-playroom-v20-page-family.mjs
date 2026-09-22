import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.PLAYROOM_FAMILY_OUTPUT_DIR??'artifacts/playroom-v20-page-family';
const templateVersion=20;
const pageTypes=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const homeProfiles=[
  {name:'desktop-1440x1000',runtimeViewport:'desktop',width:1440,height:1000},
  {name:'desktop-1280x800',runtimeViewport:'desktop',width:1280,height:800},
  {name:'tablet-768x1024',runtimeViewport:'tablet',width:768,height:1024},
  {name:'mobile-390x844',runtimeViewport:'mobile',width:390,height:844},
];

await mkdir(outputDir,{recursive:true});

async function settle(page){
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addStyleTag({content:'html,body,#main-content{margin:0!important;padding:0!important;background:#020b17!important}.cookieBanner,.skipLink{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
  await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
  await page.locator('img').evaluateAll(async images=>{
    await Promise.all(images.map(async image=>{
      if(image.complete)return;
      await new Promise(resolve=>{
        const done=()=>resolve(undefined);
        image.addEventListener('load',done,{once:true});
        image.addEventListener('error',done,{once:true});
        setTimeout(done,3000);
      });
    }));
  });
}

async function runtimeRoot(page,label){
  const roots=page.locator('[data-visual-fidelity-root="runtime"]:visible');
  if(await roots.count()!==1)throw new Error(`PLAYROOM_V20_RUNTIME_ROOT_COUNT:${label}:${await roots.count()}`);
  const root=roots.first();
  await root.waitFor({state:'visible',timeout:15000});
  await page.waitForTimeout(180);
  const box=await root.boundingBox();
  if(!box)throw new Error(`PLAYROOM_V20_ROOT_BOX_MISSING:${label}`);
  return{root,box};
}

const browser=await chromium.launch({headless:true});
const captures=[];
const homeProofs=[];
try{
  for(const pageType of pageTypes){
    const url=`${baseUrl}/visual-fidelity-qa?template=gaming.playroom&version=${templateVersion}&page=${encodeURIComponent(pageType)}&viewport=desktop`;
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error(`PLAYROOM_V20_ROUTE_FAILED:${pageType}:${response?.status()??'no-response'}`);
    await settle(page);
    const {root,box}=await runtimeRoot(page,pageType);
    const screenshotPath=`${outputDir}/playroom-${pageType}-desktop-full.png`;
    await root.screenshot({path:screenshotPath,animations:'disabled',timeout:20000});
    captures.push({pageType,url,path:screenshotPath,width:box.width,height:box.height,title:await page.title()});
    await page.close();
  }

  for(const profile of homeProfiles){
    const url=`${baseUrl}/visual-fidelity-qa?template=gaming.playroom&version=${templateVersion}&page=home&viewport=${profile.runtimeViewport}`;
    const page=await browser.newPage({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1});
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error(`PLAYROOM_V20_HOME_PROOF_ROUTE_FAILED:${profile.name}:${response?.status()??'no-response'}`);
    await settle(page);
    const {root,box}=await runtimeRoot(page,profile.name);
    const viewportPath=`${outputDir}/playroom-home-${profile.name}-viewport.png`;
    const fullPath=`${outputDir}/playroom-home-${profile.name}-full.png`;
    await page.screenshot({path:viewportPath,animations:'disabled',fullPage:false,timeout:20000});
    await root.screenshot({path:fullPath,animations:'disabled',timeout:20000});
    homeProofs.push({
      name:profile.name,
      runtimeViewport:profile.runtimeViewport,
      viewport:{width:profile.width,height:profile.height},
      runtimeRoot:{width:box.width,height:box.height},
      url,
      viewportPath,
      fullPath,
      title:await page.title(),
    });
    await page.close();
  }
}finally{
  await browser.close();
}

const evidence={
  version:'shoporation.playroom-page-family.v20.true-desktop-proof.v1',
  template:'gaming.playroom',
  templateVersion,
  sourceCommit:process.env.GITHUB_SHA??null,
  pageFamilyViewport:{width:1440,height:1000},
  captures,
  homeProofs,
  capturedAt:new Date().toISOString(),
};
await writeFile(`${outputDir}/manifest.json`,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
