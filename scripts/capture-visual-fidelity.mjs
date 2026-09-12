import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.VISUAL_FIDELITY_OUTPUT_DIR??'artifacts/visual-fidelity';
const template='beauty.beauty-lab';
const performanceSampleCount=3;
const performanceProfiles=Object.freeze({
  desktop:Object.freeze({width:1200,height:900}),
  tablet:Object.freeze({width:768,height:1024}),
  mobile:Object.freeze({width:390,height:844}),
});
const cases=[
  {name:'beauty-home-desktop',pageType:'home',viewport:'desktop',width:1200,referenceFrameHeight:1934},
  {name:'beauty-home-tablet',pageType:'home',viewport:'tablet',width:768,referenceFrameHeight:1238},
  {name:'beauty-home-mobile',pageType:'home',viewport:'mobile',width:390,referenceFrameHeight:630},
  {name:'beauty-product-desktop',pageType:'product',viewport:'desktop',width:1200,referenceFrameHeight:2428},
  {name:'beauty-product-tablet',pageType:'product',viewport:'tablet',width:768,referenceFrameHeight:1554},
  {name:'beauty-product-mobile',pageType:'product',viewport:'mobile',width:390,referenceFrameHeight:844},
];

const median=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
};

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

const measurePerformanceSample=async({browser,item,url,performanceViewport,sampleIndex})=>{
  const page=await browser.newPage({viewport:performanceViewport,deviceScaleFactor:1});
  try{
    await installPerformanceObservers(page);
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error(`VISUAL_FIDELITY_ROUTE_FAILED:${item.name}:sample-${sampleIndex+1}:${response?.status()??'no-response'}`);
    await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
    await page.waitForTimeout(750);
    const evidence=await readPerformanceEvidence(page);
    const root=page.locator('[data-visual-fidelity-root="runtime"]:visible').first();
    const rawBudget=await root.getAttribute('data-runtime-performance-budget');
    const contract=await root.getAttribute('data-performance-contract');
    if(!rawBudget)throw new Error(`VISUAL_FIDELITY_PERFORMANCE_BUDGET_MISSING:${item.name}:sample-${sampleIndex+1}`);
    return{sample:sampleIndex+1,evidence,budget:JSON.parse(rawBudget),contract};
  }finally{
    await page.close();
  }
};

const summarizeMetric=({samples,metric,limit,supportKey})=>{
  const supported=samples.every(sample=>sample.evidence.support[supportKey]===true);
  const values=samples.map(sample=>sample.evidence[metric]);
  const missing=values.some(value=>typeof value!=='number'||!Number.isFinite(value));
  const actual=supported&&!missing?median(values):null;
  return{
    metric,
    actual,
    limit,
    supported,
    sampleValues:values,
    status:!supported?'unsupported':missing?'missing':actual<=limit?'pass':'fail',
  };
};

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[];
const performanceBlockers=[];
const performanceExcursions=[];
try{
  for(const item of cases){
    const url=`${baseUrl}/visual-fidelity-qa?template=${encodeURIComponent(template)}&page=${item.pageType}&viewport=${item.viewport}`;
    const performanceViewport=performanceProfiles[item.viewport];

    // Performance uses independent clean navigations at stable device-class viewports.
    // Median-of-three gates persistent regressions while preserving every raw sample
    // so a single CI scheduler excursion cannot silently disappear from evidence.
    const performanceSamples=[];
    for(let sampleIndex=0;sampleIndex<performanceSampleCount;sampleIndex++){
      performanceSamples.push(await measurePerformanceSample({browser,item,url,performanceViewport,sampleIndex}));
    }
    const runtimeBudget=performanceSamples[0].budget;
    const performanceContract=performanceSamples[0].contract;
    for(const sample of performanceSamples){
      if(JSON.stringify(sample.budget)!==JSON.stringify(runtimeBudget))throw new Error(`VISUAL_FIDELITY_PERFORMANCE_BUDGET_DRIFT:${item.name}`);
      if(sample.contract!==performanceContract)throw new Error(`VISUAL_FIDELITY_PERFORMANCE_CONTRACT_DRIFT:${item.name}`);
    }

    const checks=[
      summarizeMetric({samples:performanceSamples,metric:'lcpMs',limit:runtimeBudget.lcpMs,supportKey:'lcp'}),
      summarizeMetric({samples:performanceSamples,metric:'cls',limit:runtimeBudget.cls,supportKey:'cls'}),
      summarizeMetric({samples:performanceSamples,metric:'longTaskMaxMs',limit:runtimeBudget.longTaskMs,supportKey:'longTask'}),
    ];
    for(const check of checks){
      if(check.status==='fail'||check.status==='missing')performanceBlockers.push({case:item.name,...check});
      if(check.supported){
        check.sampleValues.forEach((actual,index)=>{
          if(typeof actual==='number'&&Number.isFinite(actual)&&actual>check.limit){
            performanceExcursions.push({case:item.name,metric:check.metric,sample:index+1,actual,limit:check.limit,aggregateStatus:check.status});
          }
        });
      }
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
        viewport:performanceViewport,
        measurementIsolation:'three-independent-clean-navigation-pages-before-capture-instrumentation',
        sampleCount:performanceSampleCount,
        samples:performanceSamples.map(sample=>({sample:sample.sample,evidence:sample.evidence})),
        checks,
        sampleExcursions:performanceExcursions.filter(excursion=>excursion.case===item.name),
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
  version:'shoporation.visual-fidelity-capture.v9',
  template,
  sourceCommit:process.env.GITHUB_SHA??null,
  capturedAt:new Date().toISOString(),
  comparisonPolicy:'Primary PNGs use reference-proportional browser frames; *-full.png retains the complete Runtime root. Exactly one renderable Runtime root is required. Zero-size roots are tolerated only inside hidden React/Next S:* streaming staging containers; authored hidden duplicate roots fail the gate.',
  performancePolicy:'Desktop/Tablet/Mobile lab evidence uses three independent clean navigations at stable device-class performance viewports (1200x900, 768x1024, 390x844) before screenshot-specific DOM traversal, geometry reads, image waits or animation overrides. The canonical runtime thresholds are unchanged. Blocking decisions use the median of three supported samples; every raw sample above a threshold is retained as a performance excursion for diagnosis. This rejects persistent regressions without allowing one CI scheduler spike to silently disappear. INP is explicitly not claimed until a standardized non-mutating storefront interaction is available.',
  performanceSampleCount,
  performanceBlockers,
  performanceExcursions,
  captures,
},null,2));
console.log(JSON.stringify({ok:performanceBlockers.length===0,count:captures.length,performanceBlockerCount:performanceBlockers.length,performanceExcursionCount:performanceExcursions.length,outputDir},null,2));
if(performanceBlockers.length)throw new Error(`VISUAL_FIDELITY_RUNTIME_PERFORMANCE_FAILED:${performanceBlockers.map(issue=>`${issue.case}:${issue.metric}`).join(',')}`);
