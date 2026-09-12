import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.VISUAL_FIDELITY_OUTPUT_DIR??'artifacts/visual-fidelity';
const template='beauty.beauty-lab';
const cases=[
  {name:'beauty-home-desktop',pageType:'home',viewport:'desktop',width:1200,height:900},
  {name:'beauty-home-tablet',pageType:'home',viewport:'tablet',width:768,height:900},
  {name:'beauty-home-mobile',pageType:'home',viewport:'mobile',width:390,height:844},
  {name:'beauty-product-desktop',pageType:'product',viewport:'desktop',width:1200,height:900},
  {name:'beauty-product-tablet',pageType:'product',viewport:'tablet',width:768,height:900},
  {name:'beauty-product-mobile',pageType:'product',viewport:'mobile',width:390,height:844},
];

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[];
try{
  for(const item of cases){
    const page=await browser.newPage({viewport:{width:item.width,height:item.height},deviceScaleFactor:1});
    page.setDefaultTimeout(15000);
    await page.emulateMedia({reducedMotion:'reduce'});
    const url=`${baseUrl}/visual-fidelity-qa?template=${encodeURIComponent(template)}&page=${item.pageType}&viewport=${item.viewport}`;
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error(`VISUAL_FIDELITY_ROUTE_FAILED:${item.name}:${response?.status()??'no-response'}`);
    await page.addStyleTag({content:'html,body,#main-content{margin:0!important;padding:0!important;background:#fff!important}.cookieBanner,.skipLink{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    await page.locator('img').evaluateAll(async images=>{
      await Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise(resolve=>{
        const done=()=>resolve(undefined);
        image.addEventListener('load',done,{once:true});
        image.addEventListener('error',done,{once:true});
        setTimeout(done,3000);
      })));
    });
    const root=page.locator('[data-visual-fidelity-root="runtime"]');
    await root.waitFor({state:'visible',timeout:15000});
    await page.waitForTimeout(250);
    const path=`${outputDir}/${item.name}.png`;
    await root.screenshot({path,animations:'disabled',timeout:20000});
    const box=await root.boundingBox();
    captures.push({...item,url,path,renderedWidth:box?.width??null,renderedHeight:box?.height??null,title:await page.title()});
    await page.close();
  }
}finally{
  await browser.close();
}

await writeFile(`${outputDir}/manifest.json`,JSON.stringify({
  version:'shoporation.visual-fidelity-capture.v1',
  template,
  sourceCommit:process.env.GITHUB_SHA??null,
  capturedAt:new Date().toISOString(),
  captures,
},null,2));
console.log(JSON.stringify({ok:true,count:captures.length,outputDir},null,2));
