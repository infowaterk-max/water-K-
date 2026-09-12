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

const installPerformanceObservers=async page=>{
  await page.addInitScript(()=>{
    const supported=globalThis.PerformanceObserver?.supportedEntryTypes??[];
    const state={
      lcpSupported:supported.includes('largest-contentful-paint'),
      clsSupported:supported.includes('layout-shift'),
      longTaskSupported:supported.includes('longtask'),
      lcpMs:null,
      cls:0,
      longTasks:[],
    };
    Object.defineProperty(globalThis,'__shoporationPerformanceEvidence',{value:state,configurable:false,writable:false});
    if(state.lcpSupported){
      new PerformanceObserver(list=>{
        for(const entry of list.getEntries())state.lcpMs=entry.startTime;
      }).observe({type:'largest-contentful-paint',buffered:true});
    }
    if(state.clsSupported){
      new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          if(!entry.hadRecentInput)state.cls+=entry.value;
        }
      }).observe({type:'layout-shift',buffered:true});
    }
    if(state.longTaskSupported){
      new PerformanceObserver(list=>{
        for(const entry of list.getEntries())state.longTasks.push({startTime:entry.startTime,duration:entry.duration});
      }).observe({type:'longtask',buffered:true});
    }
  });
};

const readPerformanceEvidence=async page=>page.evaluate(()=>{
  const state=globalThis.__shoporationPerformanceEvidence??{};
  const navigation=performance.getEntriesByType('navigation')[0];
  const resources=performance.getEntriesByType('resource');
  const longTasks=Array.isArray(state.longTasks)?state.longTasks.map(entry=>({startTime:Number(entry.startTime)||0,duration:Number(entry.duration)||0})):[];
  const sum=key=>resources.reduce((total,entry)=>total+(Number(entry[key])||0),0);
  return {
    measurementCutoffMs:performance.now(),
    lcpMs:typeof state.lcpMs==='number'?state.lcpMs:null,
    cls:typeof state.cls==='number'?state.cls:null,
    longTaskMaxMs:state.longTaskSupported?(longTasks.length?Math.max(...longTasks.map(entry=>entry.duration)):0):null,
    longTaskCount:state.longTaskSupported?longTasks.length:null,
    longTasks:state.longTaskSupported?longTasks:[],
    navigation:navigation?{
      ttfbMs:navigation.responseStart,
      domContentLoadedMs:navigation.domContentLoadedEventEnd,
      loadMs:navigation.loadEventEnd,
      responseEndMs:navigation.responseEnd,
    }:null,
    resources:{
      count:resources.length,
      transferSizeBytes:sum('transferSize'),
      encodedBodySizeBytes:sum('encodedBodySize'),
      decodedBodySizeBytes:sum('decodedBodySize'),
    },
    support:{
      lcp:Boolean(state.lcpSupported),
      cls:Boolean(state.clsSupported),
      longTask:Boolean(state.longTaskSupported),
      inp:false,
    },
    inpMs:null,
    inpStatus:'not-measured-no-standardized-non-mutating-storefront-interaction',
  };
});

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[];
const performanceBlockers=[];
try{
  for(const item of cases){
    const url=`${baseUrl}/visual-fidelity-qa?template=${encodeURIComponent(template)}&page=${item.pageType}&viewport=${item.viewport}`;

    // Performance is measured on a clean page before any screenshot-specific DOM walk,
    // forced geometry read, animation override or image wait can contaminate the main-thread evidence.
    const performancePage=await browser.newPage({viewport:{width:item.width,height:item.referenceFrameHeight},deviceScaleFactor:1});
    await installPerformanceObservers(performancePage);
    const performanceResponse=await performancePage.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!performanceResponse?.ok())throw new Error(`VISUAL_FIDELITY_ROUTE_FAILED:${item.name}:${performanceResponse?.status()??'no-response'}`);
    await performancePage.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
    await performancePage.waitForTimeout(750);
    const performanceEvidence=await readPerformanceEvidence(performancePage);
    const performanceRoot=performancePage.locator('[data-visual-fidelity-root="runtime"]:visible').first();
    const rawBudget=await performanceRoot.getAttribute('data-runtime-performance-budget');
    const performanceContract=await performanceRoot.getAttribute('data-performance-contract');
    if(!rawBudget)throw new Error(`VISUAL_FIDELITY_PERFORMANCE_BUDGET_MISSING:${item.name}`);
    const runtimeBudget=JSON.parse(rawBudget);
    await performancePage.close();

    const checks=[
      {metric:'lcpMs',actual:performanceEvidence.lcpMs,limit:runtimeBudget.lcpMs,supported:performanceEvidence.support.lcp},
      {metric:'cls',actual:performanceEvidence.cls,limit:runtimeBudget.cls,supported:performanceEvidence.support.cls},
      {metric:'longTaskMaxMs',actual:performanceEvidence.longTaskMaxMs,limit:runtimeBudget.longTaskMs,supported:performanceEvidence.support.longTask},
    ].map(check=>({
      ...check,
      status:!check.supported?'unsupported':check.actual===null?'missing':check.actual<=check.limit?'pass':'fail',
    }));
    for(const check of checks){
      if(check.status==='fail'||check.status==='missing')performanceBlockers.push({case:item.name,...check});
    }

    const page=await browser.newPage({viewport:{width:item.width,height:item.referenceFrameHeight},deviceScaleFactor:1});
    await page.emulateMedia({reducedMotion:'reduce'});
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error(`VISUAL_FIDELITY_ROUTE_FAILED:${item.name}:${response?.status()??'no-response'}`);
    await page.addStyleTag({content:'html,body,#main-content{margin:0!important;padding:0!important;background:#fff!important}.cookieBanner,.skipLink{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
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
    const activeRoots=diagnostics.filter(entry=>entry.active);
    const unexpectedInactive=diagnostics.filter(entry=>!entry.active&&!entry.frameworkStaging);
    if(activeRoots.length!==1||unexpectedInactive.length){
      console.error(JSON.stringify({event:'VISUAL_FIDELITY_RUNTIME_ROOT_INVARIANT_FAILED',case:item.name,domRootCount,activeRootCount:activeRoots.length,unexpectedInactiveCount:unexpectedInactive.length,diagnostics},null,2));
      throw new Error(`VISUAL_FIDELITY_ROOT_INVARIANT_FAILED:${item.name}:dom=${domRootCount}:active=${activeRoots.length}:unexpected=${unexpectedInactive.length}`);
    }
    const activeRootIndex=activeRoots[0].index;
    const frameworkStagingRootCount=diagnostics.filter(entry=>entry.frameworkStaging).length;
    const root=roots.nth(activeRootIndex);
    await root.waitFor({state:'visible',timeout:15000});
    await page.waitForTimeout(250);
    const box=await root.boundingBox();
    if(!box)throw new Error(`VISUAL_FIDELITY_ROOT_BOX_MISSING:${item.name}`);

    const fullPath=`${outputDir}/${item.name}-full.png`;
    await root.screenshot({path:fullPath,animations:'disabled',timeout:20000});
    const path=`${outputDir}/${item.name}.png`;
    await page.screenshot({path,animations:'disabled',timeout:15000,fullPage:false});
    captures.push({
      ...item,
      url,
      path,
      fullPath,
      rootCount:activeRoots.length,
      domRootCount,
      frameworkStagingRootCount,
      renderedWidth:box.width,
      renderedHeight:box.height,
      capturedHeight:item.referenceFrameHeight,
      title:await page.title(),
      performance:{
        contract:performanceContract,
        budget:runtimeBudget,
        measurementIsolation:'clean-navigation-page-before-capture-instrumentation',
        evidence:performanceEvidence,
        checks,
        measuredGateStatus:checks.some(check=>check.status==='fail'||check.status==='missing')?'fail':'pass',
        overallStatus:'partial-inp-not-measured',
      },
    });
    await page.close();
  }
}finally{
  await browser.close();
}

await writeFile(`${outputDir}/manifest.json`,JSON.stringify({
  version:'shoporation.visual-fidelity-capture.v7',
  template,
  sourceCommit:process.env.GITHUB_SHA??null,
  capturedAt:new Date().toISOString(),
  comparisonPolicy:'Primary PNGs use reference-proportional browser frames; *-full.png retains the complete Runtime root. Exactly one renderable Runtime root is required. Zero-size roots are tolerated only inside hidden React/Next S:* streaming staging containers; authored hidden duplicate roots fail the gate.',
  performancePolicy:'Desktop/Tablet/Mobile lab evidence is measured on a clean navigation page before screenshot-specific DOM traversal, geometry reads, image waits or animation overrides. The canonical runtime budget is exposed by the QA route. LCP, CLS and maximum long-task duration are blocking measured checks. INP is explicitly not claimed until a standardized non-mutating storefront interaction is available.',
  performanceBlockers,
  captures,
},null,2));
console.log(JSON.stringify({ok:performanceBlockers.length===0,count:captures.length,performanceBlockerCount:performanceBlockers.length,outputDir},null,2));
if(performanceBlockers.length)throw new Error(`VISUAL_FIDELITY_RUNTIME_PERFORMANCE_FAILED:${performanceBlockers.map(issue=>`${issue.case}:${issue.metric}`).join(',')}`);
