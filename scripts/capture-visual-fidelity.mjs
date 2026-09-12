import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.VISUAL_FIDELITY_OUTPUT_DIR??'artifacts/visual-fidelity';
const template='beauty.beauty-lab';
const cases=[
  {name:'beauty-home-desktop',pageType:'home',viewport:'desktop',width:1200,height:900,referenceFrameHeight:1934},
  {name:'beauty-home-tablet',pageType:'home',viewport:'tablet',width:768,height:900,referenceFrameHeight:1238},
  {name:'beauty-home-mobile',pageType:'home',viewport:'mobile',width:390,height:844,referenceFrameHeight:630},
  {name:'beauty-product-desktop',pageType:'product',viewport:'desktop',width:1200,height:900,referenceFrameHeight:2428},
  {name:'beauty-product-tablet',pageType:'product',viewport:'tablet',width:768,height:900,referenceFrameHeight:1554},
  {name:'beauty-product-mobile',pageType:'product',viewport:'mobile',width:390,height:844,referenceFrameHeight:844},
];

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[];
try{
  for(const item of cases){
    const page=await browser.newPage({viewport:{width:item.width,height:item.height},deviceScaleFactor:1});
    await page.emulateMedia({reducedMotion:'reduce'});
    const url=`${baseUrl}/visual-fidelity-qa?template=${encodeURIComponent(template)}&page=${item.pageType}&viewport=${item.viewport}`;
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error(`VISUAL_FIDELITY_ROUTE_FAILED:${item.name}:${response?.status()??'no-response'}`);
    await page.addStyleTag({content:'html,body,#main-content{margin:0!important;padding:0!important;background:#fff!important}.cookieBanner,.skipLink{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
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
    const roots=page.locator('[data-visual-fidelity-root="runtime"]');
    const rootCount=await roots.count();
    if(rootCount<1)throw new Error(`VISUAL_FIDELITY_ROOT_MISSING:${item.name}`);
    const root=roots.first();
    await root.waitFor({state:'visible',timeout:15000});
    await page.waitForTimeout(250);
    const box=await root.boundingBox();
    if(!box)throw new Error(`VISUAL_FIDELITY_ROOT_BOX_MISSING:${item.name}`);

    const fullPath=`${outputDir}/${item.name}-full.png`;
    await root.screenshot({path:fullPath,animations:'disabled',timeout:15000});

    const path=`${outputDir}/${item.name}.png`;
    const frameHeight=Math.min(box.height,item.referenceFrameHeight);
    await page.screenshot({
      path,
      animations:'disabled',
      timeout:15000,
      clip:{x:Math.max(0,box.x),y:Math.max(0,box.y),width:box.width,height:frameHeight},
    });
    captures.push({...item,url,path,fullPath,rootCount,renderedWidth:box.width,renderedHeight:box.height,capturedHeight:frameHeight,title:await page.title()});
    await page.close();
  }
}finally{
  await browser.close();
}

await writeFile(`${outputDir}/manifest.json`,JSON.stringify({
  version:'shoporation.visual-fidelity-capture.v2',
  template,
  sourceCommit:process.env.GITHUB_SHA??null,
  capturedAt:new Date().toISOString(),
  comparisonPolicy:'Primary PNGs use reference-proportional top frames; *-full.png retains the complete Runtime root for regression evidence.',
  captures,
},null,2));
console.log(JSON.stringify({ok:true,count:captures.length,outputDir},null,2));