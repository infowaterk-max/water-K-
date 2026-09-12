import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.VISUAL_FIDELITY_OUTPUT_DIR??'artifacts/visual-fidelity';
const template='beauty.beauty-lab';
const cases=[
  {name:'beauty-home-desktop',pageType:'home',viewport:'desktop',width:1200,referenceFrameHeight:1934},
  {name:'beauty-home-tablet',pageType:'home',viewport:'tablet',width:768,referenceFrameHeight:1238},
  {name:'beauty-home-mobile',pageType:'home',viewport:'mobile',width:390,referenceFrameHeight:630},
  {name:'beauty-product-desktop',pageType:'product',viewport:'desktop',width:1200,referenceFrameHeight:2428},
  {name:'beauty-product-tablet',pageType:'product',viewport:'tablet',width:768,referenceFrameHeight:1554},
  {name:'beauty-product-mobile',pageType:'product',viewport:'mobile',width:390,referenceFrameHeight:844},
];

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[];
try{
  for(const item of cases){
    const page=await browser.newPage({viewport:{width:item.width,height:item.referenceFrameHeight},deviceScaleFactor:1});
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
    const domRootCount=await roots.count();
    if(domRootCount<1)throw new Error(`VISUAL_FIDELITY_ROOT_MISSING:${item.name}`);
    const diagnostics=await roots.evaluateAll(nodes=>nodes.map((node,index)=>{
      const style=getComputedStyle(node);
      const rect=node.getBoundingClientRect();
      const hiddenAncestor=node.closest('[hidden]');
      const hiddenAncestorId=hiddenAncestor?.id??null;
      const active=rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&!hiddenAncestor;
      const frameworkStaging=!active&&rect.width===0&&rect.height===0&&Boolean(hiddenAncestorId&&/^S:\d+$/.test(hiddenAncestorId));
      return {
        index,
        active,
        frameworkStaging,
        tagName:node.tagName,
        display:style.display,
        visibility:style.visibility,
        opacity:style.opacity,
        hidden:node.hasAttribute('hidden'),
        ariaHidden:node.getAttribute('aria-hidden'),
        rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
        parentTag:node.parentElement?.tagName??null,
        parentId:node.parentElement?.id??null,
        parentClass:node.parentElement?.className??null,
        hiddenAncestorTag:hiddenAncestor?.tagName??null,
        hiddenAncestorId,
        html:node.outerHTML.slice(0,700),
      };
    }));
    const activeRoots=diagnostics.filter(item=>item.active);
    const unexpectedInactive=diagnostics.filter(item=>!item.active&&!item.frameworkStaging);
    if(activeRoots.length!==1||unexpectedInactive.length){
      console.error(JSON.stringify({event:'VISUAL_FIDELITY_RUNTIME_ROOT_INVARIANT_FAILED',case:item.name,domRootCount,activeRootCount:activeRoots.length,unexpectedInactiveCount:unexpectedInactive.length,diagnostics},null,2));
      throw new Error(`VISUAL_FIDELITY_ROOT_INVARIANT_FAILED:${item.name}:dom=${domRootCount}:active=${activeRoots.length}:unexpected=${unexpectedInactive.length}`);
    }
    const activeRootIndex=activeRoots[0].index;
    const frameworkStagingRootCount=diagnostics.filter(item=>item.frameworkStaging).length;
    const root=roots.nth(activeRootIndex);
    await root.waitFor({state:'visible',timeout:15000});
    await page.waitForTimeout(250);
    const box=await root.boundingBox();
    if(!box)throw new Error(`VISUAL_FIDELITY_ROOT_BOX_MISSING:${item.name}`);

    const fullPath=`${outputDir}/${item.name}-full.png`;
    await root.screenshot({path:fullPath,animations:'disabled',timeout:20000});

    const path=`${outputDir}/${item.name}.png`;
    await page.screenshot({path,animations:'disabled',timeout:15000,fullPage:false});
    captures.push({...item,url,path,fullPath,rootCount:activeRoots.length,domRootCount,frameworkStagingRootCount,renderedWidth:box.width,renderedHeight:box.height,capturedHeight:item.referenceFrameHeight,title:await page.title()});
    await page.close();
  }
}finally{
  await browser.close();
}

await writeFile(`${outputDir}/manifest.json`,JSON.stringify({
  version:'shoporation.visual-fidelity-capture.v5',
  template,
  sourceCommit:process.env.GITHUB_SHA??null,
  capturedAt:new Date().toISOString(),
  comparisonPolicy:'Primary PNGs use reference-proportional browser frames; *-full.png retains the complete Runtime root. Exactly one renderable Runtime root is required. Zero-size roots are tolerated only inside hidden React/Next S:* streaming staging containers; authored hidden duplicate roots fail the gate.',
  captures,
},null,2));
console.log(JSON.stringify({ok:true,count:captures.length,outputDir},null,2));