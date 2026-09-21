import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.TEMPLATE_QUALITY_OUTPUT_DIR??'artifacts/template-factory-quality';
const baseSha=(process.env.QUALITY_BASE_SHA??'').trim();
const headSha=(process.env.GITHUB_SHA??'HEAD').trim()||'HEAD';
const viewportProfiles=Object.freeze({
  desktop:{width:1200,height:1000},
  tablet:{width:768,height:1024},
  mobile:{width:390,height:844},
});
const canaryPageTypes=new Set(['home','product','account','content','legal','not-found']);
const qualityInfrastructurePrefixes=[
  'src/lib/builder/storefront-template-quality-gate.ts',
  'src/app/api/visual-fidelity/templates/',
  'src/app/visual-fidelity-qa/',
  'scripts/template-factory-quality-gate.mjs',
  '.github/workflows/template-factory-quality-gate.yml',
];
const sharedRuntimePrefixes=[
  'src/components/builder/',
  'src/lib/builder/storefront-',
];

const safeName=value=>value.replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase();
const exists=async file=>{try{await access(file);return true;}catch{return false;}};

function changedFiles(){
  if(!baseSha||/^0+$/.test(baseSha))return[];
  try{
    const raw=execFileSync('git',['diff','--name-status',baseSha,headSha],{encoding:'utf8'});
    return raw.split(/\r?\n/).filter(Boolean).map(line=>{
      const parts=line.split('\t');
      const status=parts[0]??'M';
      const file=parts.at(-1)??'';
      return{status,file};
    });
  }catch(error){
    return[];
  }
}

function startsWithAny(file,prefixes){return prefixes.some(prefix=>file.startsWith(prefix));}

function selectScope(catalog,changes){
  const templates=catalog.templates??[];
  const selected=new Map();
  const reasons=[];
  const qualityInfra=changes.some(change=>startsWithAny(change.file,qualityInfrastructurePrefixes));
  const sharedRuntime=changes.some(change=>startsWithAny(change.file,sharedRuntimePrefixes)&&!startsWithAny(change.file,qualityInfrastructurePrefixes));

  for(const template of templates){
    const direct=changes.some(change=>startsWithAny(change.file,template.sourcePrefixes??[]));
    if(direct)selected.set(template.templateKey,{template,mode:'full',reason:'template-source-changed'});
  }

  const addedTemplateFiles=changes.filter(change=>change.status.startsWith('A')&&change.file.startsWith('src/lib/builder/templates/')&&/\.(ts|tsx)$/.test(change.file));
  for(const change of addedTemplateFiles){
    const owned=templates.some(template=>startsWithAny(change.file,template.sourcePrefixes??[]));
    if(!owned)throw new Error(`TEMPLATE_FACTORY_QUALITY_MANIFEST_REQUIRED:${change.file}`);
  }

  const modifiedTemplateFiles=changes.filter(change=>!change.status.startsWith('A')&&change.file.startsWith('src/lib/builder/templates/')&&/\.(ts|tsx)$/.test(change.file));
  for(const change of modifiedTemplateFiles){
    const owned=templates.some(template=>startsWithAny(change.file,template.sourcePrefixes??[]));
    if(!owned)throw new Error(`TEMPLATE_FACTORY_REACCEPTANCE_MANIFEST_REQUIRED:${change.file}`);
  }

  if(qualityInfra){
    for(const template of templates)selected.set(template.templateKey,{template,mode:'full',reason:'quality-infrastructure-changed'});
  }else if(sharedRuntime){
    for(const template of templates){
      if(!selected.has(template.templateKey))selected.set(template.templateKey,{template,mode:'canary',reason:'shared-runtime-changed'});
    }
  }

  if(!selected.size){
    for(const template of templates)selected.set(template.templateKey,{template,mode:'canary',reason:'default-canary'});
  }
  for(const value of selected.values())reasons.push({templateKey:value.template.templateKey,mode:value.mode,reason:value.reason});
  return{selected:[...selected.values()],reasons,qualityInfra,sharedRuntime};
}

async function loadCatalog(){
  const response=await fetch(`${baseUrl}/api/visual-fidelity/templates`);
  if(!response.ok)throw new Error(`TEMPLATE_FACTORY_QUALITY_CATALOG_FAILED:${response.status}`);
  const catalog=await response.json();
  if(catalog.contract!=='shoporation.template-factory-quality-catalog.v1')throw new Error('TEMPLATE_FACTORY_QUALITY_CATALOG_CONTRACT');
  return catalog;
}

async function waitForImages(page){
  await page.locator('img').evaluateAll(async images=>{
    await Promise.all(images.map(async image=>{
      if(image.complete)return;
      await new Promise(resolve=>{
        const done=()=>resolve(undefined);
        image.addEventListener('load',done,{once:true});
        image.addEventListener('error',done,{once:true});
        setTimeout(done,3500);
      });
    }));
  });
}

async function browserDiagnostics(page,manifest,viewport){
  return page.locator('[data-visual-fidelity-root="runtime"]:visible').first().evaluate((root,input)=>{
    const tolerance=input.maxHorizontalOverflowPx;
    const rootRect=root.getBoundingClientRect();
    const visible=element=>{
      const style=getComputedStyle(element);
      const rect=element.getBoundingClientRect();
      return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';
    };
    const hasOverflowBoundary=element=>{
      let current=element.parentElement;
      while(current&&current!==root){
        const style=getComputedStyle(current);
        if(['auto','scroll','hidden','clip'].includes(style.overflowX)||['auto','scroll','hidden','clip'].includes(style.overflow))return true;
        current=current.parentElement;
      }
      return false;
    };
    const protruding=[];
    for(const element of root.querySelectorAll('*')){
      if(!visible(element))continue;
      const rect=element.getBoundingClientRect();
      const outside=rect.left<rootRect.left-tolerance||rect.right>rootRect.right+tolerance;
      if(outside&&!hasOverflowBoundary(element)){
        protruding.push({
          tag:element.tagName,
          component:element.getAttribute('data-storefront-component'),
          text:(element.textContent??'').trim().slice(0,100),
          rect:{left:rect.left,right:rect.right,width:rect.width},
        });
        if(protruding.length>=20)break;
      }
    }

    const brokenImages=[...root.querySelectorAll('img')].filter(image=>visible(image)&&Boolean(image.currentSrc||image.src)&&image.naturalWidth===0).slice(0,20).map(image=>({
      src:image.currentSrc||image.src,
      alt:image.alt,
    }));

    const touchErrors=[];
    const touchWarnings=[];
    if(input.viewport==='mobile'){
      const controls=[...root.querySelectorAll('a,button,summary,input,select,textarea,[role="button"]')];
      for(const element of controls){
        if(!visible(element))continue;
        const style=getComputedStyle(element);
        if(element.tagName==='A'&&style.display==='inline')continue;
        const rect=element.getBoundingClientRect();
        const minDimension=Math.min(rect.width,rect.height);
        const entry={tag:element.tagName,text:(element.textContent??element.getAttribute('aria-label')??'').trim().slice(0,100),width:rect.width,height:rect.height};
        if(rect.height<input.minimumTouchTargetPx||(rect.width<input.minimumTouchTargetPx&&rect.height<input.minimumTouchTargetPx))touchErrors.push(entry);
        else if(minDimension<input.recommendedTouchTargetPx)touchWarnings.push(entry);
        if(touchErrors.length>=20&&touchWarnings.length>=20)break;
      }
    }

    const clippingWarnings=[];
    for(const element of root.querySelectorAll('*')){
      if(!visible(element)||(element.textContent??'').trim().length<2)continue;
      const style=getComputedStyle(element);
      const clips=['hidden','clip'].includes(style.overflow)||['hidden','clip'].includes(style.overflowX)||['hidden','clip'].includes(style.overflowY);
      if(!clips)continue;
      const intentional=style.textOverflow==='ellipsis'||style.getPropertyValue('-webkit-line-clamp')!=='none'&&style.getPropertyValue('-webkit-line-clamp')!=='';
      const clipped=element.scrollWidth>element.clientWidth+2||element.scrollHeight>element.clientHeight+2;
      if(clipped&&!intentional){
        clippingWarnings.push({tag:element.tagName,component:element.getAttribute('data-storefront-component'),text:(element.textContent??'').trim().slice(0,100)});
        if(clippingWarnings.length>=20)break;
      }
    }

    const headers=root.querySelectorAll('[data-storefront-component="system.commerce-header"],[data-storefront-component="system.header"]').length;
    const sections=[...root.querySelectorAll('[data-storefront-component="layout.section"]')].filter(visible);
    const mobileMenus=root.querySelectorAll('[data-storefront-mobile-menu="true"]').length;
    const mobileNavOutside=[...root.querySelectorAll('[data-storefront-component="system.navigation"]')].filter(element=>!element.closest('[data-storefront-mobile-menu="true"]')).length;

    return{
      rootClientWidth:root.clientWidth,
      rootScrollWidth:root.scrollWidth,
      documentScrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth,
      horizontalOverflowPx:Math.max(0,root.scrollWidth-root.clientWidth,document.documentElement.scrollWidth-innerWidth),
      protruding,
      brokenImages,
      touchErrors,
      touchWarnings,
      clippingWarnings,
      headers,
      visibleSectionCount:sections.length,
      mobileMenus,
      mobileNavOutside,
    };
  },{
    viewport,
    maxHorizontalOverflowPx:manifest.browser.maxHorizontalOverflowPx,
    minimumTouchTargetPx:manifest.browser.minimumTouchTargetPx,
    recommendedTouchTargetPx:manifest.browser.recommendedTouchTargetPx,
  });
}

async function compareGolden({actualPath,baselinePath,diffPath,threshold}){
  if(!await exists(baselinePath))return{status:'missing',mismatchRatio:null};
  const[{PNG},{default:pixelmatch}]=await Promise.all([import('pngjs'),import('pixelmatch')]);
  const[actualBytes,baselineBytes]=await Promise.all([readFile(actualPath),readFile(baselinePath)]);
  const actual=PNG.sync.read(actualBytes),baseline=PNG.sync.read(baselineBytes);
  if(actual.width!==baseline.width||actual.height!==baseline.height){
    return{status:'dimension-mismatch',mismatchRatio:1,actual:{width:actual.width,height:actual.height},baseline:{width:baseline.width,height:baseline.height}};
  }
  const diff=new PNG({width:actual.width,height:actual.height});
  const mismatched=pixelmatch(actual.data,baseline.data,diff.data,actual.width,actual.height,{threshold:.1,includeAA:false});
  const ratio=mismatched/(actual.width*actual.height);
  if(ratio>0)await writeFile(diffPath,PNG.sync.write(diff));
  return{status:ratio<=threshold?'pass':'fail',mismatchRatio:ratio,mismatchedPixels:mismatched,totalPixels:actual.width*actual.height};
}

await mkdir(outputDir,{recursive:true});
const catalog=await loadCatalog();
for(const item of catalog.templates??[]){
  if(item.structural?.ok!==true)throw new Error(`TEMPLATE_FACTORY_STRUCTURAL_GATE_FAILED:${item.templateKey}:${item.structural?.issues?.[0]?.code??'UNKNOWN'}`);
}
const changes=changedFiles();
const scope=selectScope(catalog,changes);
const browser=await chromium.launch({headless:true});
const cases=[];
const errors=[];
const warnings=[];
try{
  for(const selected of scope.selected){
    const manifest=selected.template;
    const pages=selected.mode==='full'?manifest.pageTypes:manifest.pageTypes.filter(pageType=>canaryPageTypes.has(pageType));
    for(const pageType of pages){
      for(const viewport of manifest.viewports){
        const profile=viewportProfiles[viewport];
        const page=await browser.newPage({viewport:profile,deviceScaleFactor:1});
        const name=`${safeName(manifest.templateKey)}-v${manifest.templateVersion}-${pageType}-${viewport}`;
        const url=`${baseUrl}/visual-fidelity-qa?template=${encodeURIComponent(manifest.templateKey)}&version=${manifest.templateVersion}&page=${encodeURIComponent(pageType)}&viewport=${viewport}`;
        try{
          await page.emulateMedia({reducedMotion:'reduce'});
          const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
          if(!response?.ok())throw new Error(`ROUTE_FAILED:${response?.status()??'no-response'}`);
          await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.cookieBanner,.skipLink{display:none!important}'});
          await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
          await waitForImages(page);
          await page.waitForTimeout(120);

          const roots=page.locator('[data-visual-fidelity-root="runtime"]:visible');
          const rootCount=await roots.count();
          if(rootCount!==1)throw new Error(`RUNTIME_ROOT_COUNT:${rootCount}`);
          const diagnostics=await browserDiagnostics(page,manifest,viewport);
          const caseErrors=[];
          const caseWarnings=[];

          if(diagnostics.horizontalOverflowPx>manifest.browser.maxHorizontalOverflowPx)caseErrors.push(`HORIZONTAL_OVERFLOW:${diagnostics.horizontalOverflowPx}`);
          if(diagnostics.protruding.length)caseErrors.push(`UNBOUNDED_PROTRUSION:${diagnostics.protruding.length}`);
          if(diagnostics.brokenImages.length)caseErrors.push(`BROKEN_IMAGES:${diagnostics.brokenImages.length}`);
          if(diagnostics.headers!==1)caseErrors.push(`HEADER_CARDINALITY:${diagnostics.headers}`);
          if(manifest.browser.requireFooter&&diagnostics.visibleSectionCount<2)caseErrors.push(`SHELL_SECTION_COUNT:${diagnostics.visibleSectionCount}`);
          if(viewport==='mobile'&&manifest.browser.requireMobileMenu){
            if(diagnostics.mobileMenus!==1)caseErrors.push(`MOBILE_MENU_CARDINALITY:${diagnostics.mobileMenus}`);
            if(diagnostics.mobileNavOutside>0)caseErrors.push(`MOBILE_DESKTOP_NAV_LEAK:${diagnostics.mobileNavOutside}`);
          }
          if(diagnostics.touchErrors.length)caseErrors.push(`TOUCH_TARGET_MINIMUM:${diagnostics.touchErrors.length}`);
          if(diagnostics.touchWarnings.length)caseWarnings.push(`TOUCH_TARGET_RECOMMENDED:${diagnostics.touchWarnings.length}`);
          if(diagnostics.clippingWarnings.length)caseWarnings.push(`TEXT_CLIPPING_REVIEW:${diagnostics.clippingWarnings.length}`);

          const screenshotPath=path.join(outputDir,`${name}.png`);
          await roots.first().screenshot({path:screenshotPath,animations:'disabled',timeout:25000});
          const baselinePath=path.join(manifest.golden.baselineDirectory,`${pageType}-${viewport}.png`);
          const diffPath=path.join(outputDir,`${name}-diff.png`);
          const golden=await compareGolden({actualPath:screenshotPath,baselinePath,diffPath,threshold:manifest.golden.maxPixelMismatchRatio});
          if(manifest.golden.required&&golden.status==='missing')caseErrors.push('GOLDEN_BASELINE_MISSING');
          if(golden.status==='fail'||golden.status==='dimension-mismatch')caseErrors.push(`GOLDEN_DIFF:${golden.mismatchRatio}`);

          const record={templateKey:manifest.templateKey,templateVersion:manifest.templateVersion,pageType,viewport,mode:selected.mode,url,screenshotPath,diagnostics,golden,errors:caseErrors,warnings:caseWarnings};
          cases.push(record);
          for(const error of caseErrors)errors.push({case:name,error});
          for(const warning of caseWarnings)warnings.push({case:name,warning});
        }catch(error){
          const message=error instanceof Error?error.message:String(error);
          errors.push({case:name,error:message});
          cases.push({templateKey:manifest.templateKey,templateVersion:manifest.templateVersion,pageType,viewport,mode:selected.mode,url,errors:[message],warnings:[]});
        }finally{
          await page.close();
        }
      }
    }

    if(manifest.browser.requireMobileMenu){
      const demoUrl=`${baseUrl}/storefront-template-preview?template=${encodeURIComponent(manifest.templateKey)}&version=${manifest.templateVersion}&page=content&viewport=mobile&demoContent=szallitas`;
      const page=await browser.newPage({viewport:viewportProfiles.mobile,deviceScaleFactor:1});
      const name=`${safeName(manifest.templateKey)}-v${manifest.templateVersion}-demo-szallitas-mobile`;
      try{
        const response=await page.goto(demoUrl,{waitUntil:'domcontentloaded',timeout:30000});
        if(!response?.ok())throw new Error(`DEMO_ROUTE_FAILED:${response?.status()??'no-response'}`);
        await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
        const warningText=await page.locator('text=MINTA TARTALOM').count();
        const menuCount=await page.locator('[data-storefront-mobile-menu="true"]').count();
        if(warningText<1)errors.push({case:name,error:'DEMO_WARNING_MISSING'});
        if(menuCount!==1)errors.push({case:name,error:`DEMO_MOBILE_MENU_CARDINALITY:${menuCount}`});
        const pathOut=path.join(outputDir,`${name}.png`);
        await page.screenshot({path:pathOut,fullPage:true,animations:'disabled'});
        cases.push({templateKey:manifest.templateKey,templateVersion:manifest.templateVersion,pageType:'content-demo',viewport:'mobile',url:demoUrl,screenshotPath:pathOut,errors:[],warnings:[]});
      }catch(error){
        errors.push({case:name,error:error instanceof Error?error.message:String(error)});
      }finally{await page.close();}
    }
  }
}finally{
  await browser.close();
}

const evidence={
  contract:'shoporation.template-factory-quality-evidence.v2',
  sourceCommit:process.env.GITHUB_SHA??null,
  baseSha:baseSha||null,
  changes,
  selection:scope.reasons,
  cases,
  errors,
  warnings,
  capturedAt:new Date().toISOString(),
};
await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(evidence,null,2));
console.log(JSON.stringify({selection:scope.reasons,cases:cases.length,errorCount:errors.length,warningCount:warnings.length},null,2));
if(errors.length){
  console.error(JSON.stringify(errors,null,2));
  process.exitCode=1;
}
