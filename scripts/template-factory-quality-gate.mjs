import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';

const baseUrl=(process.env.VISUAL_FIDELITY_BASE_URL??'http://127.0.0.1:3000').replace(/\/$/,'');
const outputDir=process.env.TEMPLATE_QUALITY_OUTPUT_DIR??'artifacts/template-factory-quality';
const baseSha=(process.env.QUALITY_BASE_SHA??'').trim();
const headSha=(process.env.QUALITY_HEAD_SHA??process.env.GITHUB_SHA??'HEAD').trim()||'HEAD';
const viewportProfiles=Object.freeze({
  desktop:{width:1200,height:1000},
  tablet:{width:768,height:1024},
  mobile:{width:390,height:844},
});
const canaryPageTypes=new Set(['home','product','account','content','legal','not-found']);
const qualityInfrastructurePrefixes=[
  'src/lib/builder/storefront-template-quality-gate.ts',
  'src/lib/builder/template-factory/scaffold.ts',
  'src/lib/builder/template-factory/category-foundations.ts',
  'src/lib/builder/template-factory/recipe-registry.ts',
  'src/lib/builder/template-factory/knowledge-registry.ts',
  'src/lib/builder/template-factory/procedural-memory.ts',
  'src/app/api/visual-fidelity/templates/',
  'src/app/visual-fidelity-qa/',
  'scripts/template-factory-quality-gate.mjs',
  'scripts/template-factory-product-owner-handoff.mjs',
  'scripts/promote-template-golden-baseline.mjs',
  '.github/workflows/template-factory-quality-gate.yml',
  '.github/workflows/template-golden-baseline-promotion.yml',
  'tests/storefront-template-quality-gate-v2.test.ts',
  'tests/playroom-v20-canonical-shell-content.test.ts',
];
const sharedRuntimePrefixes=[
  'src/components/builder/',
  'src/components/admin/storefront-visual-builder-v3.tsx',
  'src/app/storefront-template-preview/',
  'src/lib/builder/storefront-',
  'src/components/cart/',
  'src/app/kosar/',
  'src/components/checkout/',
  'src/app/penztar/',
  'src/components/account/',
  'src/app/fiokom/',
  'src/lib/account/',
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
  const legacyTemplateChanges=[];
  for(const change of modifiedTemplateFiles){
    const owned=templates.some(template=>startsWithAny(change.file,template.sourcePrefixes??[]));
    if(!owned)throw new Error(`TEMPLATE_FACTORY_QUALITY_MANIFEST_REQUIRED:${change.file}`);
  }

  if(qualityInfra){
    for(const template of templates)selected.set(template.templateKey,{template,mode:'full',reason:'quality-infrastructure-changed'});
  }else if(sharedRuntime){
    for(const template of templates){
      if(!selected.has(template.templateKey))selected.set(template.templateKey,{template,mode:'full',reason:'shared-runtime-changed'});
    }
  }

  if(!selected.size){
    for(const template of templates){
      const mode=template.factoryCandidate?'full':'canary';
      const reason=template.factoryCandidate?'factory-exact-head-full':'default-canary';
      selected.set(template.templateKey,{template,mode,reason});
    }
  }
  for(const value of selected.values())reasons.push({templateKey:value.template.templateKey,mode:value.mode,reason:value.reason});
  return{selected:[...selected.values()],reasons,qualityInfra,sharedRuntime,legacyTemplateChanges};
}

async function loadCatalog(){
  const response=await fetch(`${baseUrl}/api/visual-fidelity/templates`);
  if(!response.ok)throw new Error(`TEMPLATE_FACTORY_QUALITY_CATALOG_FAILED:${response.status}`);
  const catalog=await response.json();
  if(catalog.contract!=='shoporation.template-factory-quality-catalog.v1')throw new Error('TEMPLATE_FACTORY_QUALITY_CATALOG_CONTRACT');
  return catalog;
}

async function waitForImages(page){
  const previousScroll=await page.evaluate(()=>({x:scrollX,y:scrollY}));
  const images=page.locator('[data-visual-fidelity-root="runtime"]:visible img');
  const count=await images.count();
  for(let index=0;index<count;index+=1){
    const image=images.nth(index);
    await image.scrollIntoViewIfNeeded().catch(()=>undefined);
    await image.evaluate(async element=>{
      if(element.complete)return;
      await new Promise(resolve=>{
        const done=()=>resolve(undefined);
        element.addEventListener('load',done,{once:true});
        element.addEventListener('error',done,{once:true});
        setTimeout(done,3500);
      });
    }).catch(()=>undefined);
  }
  await page.evaluate(position=>scrollTo(position.x,position.y),previousScroll);
  await page.waitForTimeout(100);
}

async function browserDiagnostics(page,manifest,viewport){
  return page.locator('[data-visual-fidelity-root="runtime"]:visible').first().evaluate((root,input)=>{
    const tolerance=input.maxHorizontalOverflowPx;
    const rootRect=root.getBoundingClientRect();
    const visible=element=>{
      const style=getComputedStyle(element);
      const rect=element.getBoundingClientRect();
      if(element.getAttribute('aria-hidden')==='true')return false;
      if(element instanceof HTMLInputElement&&element.type==='hidden')return false;
      if(rect.right<rootRect.left-100||rect.left>rootRect.right+100||rect.bottom<rootRect.top-100)return false;
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
      const hardControls=[...root.querySelectorAll('button,summary,input,select,textarea,[role="button"],a[data-storefront-component="content.button"]')];
      const header=root.querySelector('[data-storefront-component="system.commerce-header"],[data-storefront-component="system.header"]');
      if(header)hardControls.push(...header.querySelectorAll('a'));
      const seenControls=new Set();
      for(const element of hardControls){
        if(seenControls.has(element)||!visible(element))continue;
        seenControls.add(element);
        if(element instanceof HTMLInputElement&&(element.type==='checkbox'||element.type==='radio')){
          const label=element.closest('label')||(element.id?root.querySelector(`label[for="${CSS.escape(element.id)}"]`):null);
          if(label&&visible(label)){
            const labelRect=label.getBoundingClientRect();
            if(labelRect.height+1<input.minimumTouchTargetPx)touchWarnings.push({tag:'LABEL',text:(label.textContent??'').trim().slice(0,100),width:labelRect.width,height:labelRect.height,reason:'checkbox-label'});
          }
          continue;
        }
        if(element instanceof HTMLAnchorElement&&element.getAttribute('data-storefront-component')==='content.button'){
          const style=getComputedStyle(element);
          const verticalPadding=(Number.parseFloat(style.paddingTop)||0)+(Number.parseFloat(style.paddingBottom)||0);
          const border=(Number.parseFloat(style.borderTopWidth)||0)+(Number.parseFloat(style.borderBottomWidth)||0);
          const background=style.backgroundColor;
          const visuallyButtonLike=verticalPadding>=12||border>=1||!['rgba(0, 0, 0, 0)','transparent'].includes(background);
          if(!visuallyButtonLike)continue;
        }
        const rect=element.getBoundingClientRect();
        const minDimension=Math.min(rect.width,rect.height);
        const entry={tag:element.tagName,component:element.getAttribute('data-storefront-component'),text:(element.textContent??element.getAttribute('aria-label')??'').trim().slice(0,100),width:rect.width,height:rect.height};
        if(rect.height+1<input.minimumTouchTargetPx||(rect.width+1<input.minimumTouchTargetPx&&rect.height+1<input.minimumTouchTargetPx))touchErrors.push(entry);
        else if(minDimension<input.recommendedTouchTargetPx)touchWarnings.push(entry);
        if(touchErrors.length>=20&&touchWarnings.length>=20)break;
      }
      for(const element of root.querySelectorAll('a')){
        if(!visible(element)||seenControls.has(element))continue;
        const rect=element.getBoundingClientRect();
        if(rect.height<input.recommendedTouchTargetPx)touchWarnings.push({tag:'A',component:element.getAttribute('data-storefront-component'),text:(element.textContent??'').trim().slice(0,100),width:rect.width,height:rect.height,reason:'text-link-recommended'});
        if(touchWarnings.length>=40)break;
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

    const socialErrors=[];
    for(const surface of [...root.querySelectorAll('[data-storefront-component="system.social-links"]')].filter(visible)){
      const anchors=[...surface.querySelectorAll('a')].filter(visible);
      if(!anchors.length)socialErrors.push({reason:'visible-social-surface-without-links'});
      for(const anchor of anchors){
        const href=(anchor.getAttribute('href')??'').trim();
        const label=(anchor.getAttribute('aria-label')??'').trim();
        if(!/^https?:\/\//i.test(href))socialErrors.push({reason:'invalid-social-href',href});
        if(!label)socialErrors.push({reason:'missing-social-aria-label',href});
      }
    }
    for(const element of [...root.querySelectorAll('span,p,strong')].filter(visible)){
      const value=(element.textContent??'').replace(/\s+/g,' ').trim();
      if(value==='▶ ◎ ♪ f ◉')socialErrors.push({reason:'legacy-fake-social-glyphs'});
    }

    const headerNodes=[...root.querySelectorAll('[data-storefront-component="system.commerce-header"],[data-storefront-component="system.header"]')].filter(visible);
    const headers=headerNodes.length;
    const sections=[...root.querySelectorAll('[data-storefront-component="layout.section"]')].filter(visible);
    const activeHeader=headerNodes[0]??null;
    const mobileMenus=activeHeader?[...activeHeader.querySelectorAll('[data-storefront-mobile-menu="true"]')].filter(visible).length:0;
    const mobileNavOutside=activeHeader?[...activeHeader.querySelectorAll('[data-storefront-component="system.navigation"]')].filter(element=>visible(element)&&!element.closest('[data-storefront-mobile-menu="true"]')).length:0;

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
      socialErrors,
    };
  },{
    viewport,
    maxHorizontalOverflowPx:manifest.browser.maxHorizontalOverflowPx,
    minimumTouchTargetPx:manifest.browser.minimumTouchTargetPx,
    recommendedTouchTargetPx:manifest.browser.recommendedTouchTargetPx,
  });
}

function commerceMoneyDigits(value){
  const digits=String(value??'').replace(/[^0-9]/g,'');
  if(!digits)return null;
  const parsed=Number(digits);
  return Number.isFinite(parsed)?parsed:null;
}
function classifyProductionCommerceMutation(request){
  const method=request.method().toUpperCase();
  if(!['POST','PUT','PATCH','DELETE'].includes(method))return null;
  let pathname='';
  try{pathname=new URL(request.url()).pathname.toLowerCase()}catch{return null}
  if(/^\/api\/(?:admin\/)?orders(?:\/|$)/.test(pathname))return'order';
  if(/^\/api\/payments(?:\/|$)/.test(pathname))return'payment';
  if(/(?:fulfillment|fulfilment|invoice|order-documents|product-documents\/order)/.test(pathname))return'commerce-side-effect';
  return null;
}

async function proveFactoryCommerceInteraction(browser,manifest){
  if(!manifest.factoryCandidate)return{required:false,passed:true,status:'not-applicable'};
  const requiredPages=['product','cart','checkout'];
  if(!requiredPages.every(pageType=>manifest.pageTypes.includes(pageType)))return{required:false,passed:true,status:'not-applicable'};
  const page=await browser.newPage({viewport:viewportProfiles.desktop,deviceScaleFactor:1});
  const forbiddenCommerceMutations=[];
  await page.route('**/api/**',async route=>{
    const request=route.request(),kind=classifyProductionCommerceMutation(request);
    if(kind){
      forbiddenCommerceMutations.push({kind,method:request.method(),url:request.url()});
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  const result={required:true,passed:false,checks:{},errors:[]};
  const previewFor=(pageType,extra={})=>{
    const params=new URLSearchParams({template:manifest.templateKey,version:String(manifest.templateVersion),page:pageType,viewport:'desktop',factory:'1',commerceProof:'1'});
    for(const[key,value]of Object.entries(extra))if(value!==undefined&&value!==null&&String(value))params.set(key,String(value));
    return baseUrl+'/visual-fidelity-qa?'+params.toString();
  };
  const rootFor=pageType=>page.locator('[data-visual-fidelity-root="runtime"][data-template-key="'+manifest.templateKey+'"][data-template-version="'+manifest.templateVersion+'"][data-factory-candidate="true"][data-page-type="'+pageType+'"][data-commerce-proof="true"]').first();
  const dismissCookieBanner=async()=>{
    const banner=page.locator('.cookieBanner:visible').first();
    if(await banner.count()===0)return;
    const necessary=banner.getByRole('button',{name:'Csak szükséges',exact:true});
    if(await necessary.count()===1)await necessary.click();
    await banner.waitFor({state:'hidden',timeout:5000}).catch(()=>undefined);
  };
  const visit=async(pageType,extra={})=>{
    const response=await page.goto(previewFor(pageType,extra),{waitUntil:'domcontentloaded',timeout:30000});
    if(!response?.ok())throw new Error('COMMERCE_ROUTE_FAILED:'+pageType+':'+(response?.status()??'no-response'));
    await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
    const root=rootFor(pageType);
    await root.waitFor({state:'visible',timeout:10000});
    await dismissCookieBanner();
    return root;
  };
  try{
    let cartRoot=await visit('cart');
    await cartRoot.locator('[data-storefront-preview-cart="empty"]').waitFor({state:'visible',timeout:10000});
    result.checks.emptyState=true;

    let productRoot=await visit('product');
    const optionLinks=productRoot.locator('[data-storefront-structured="option-selector"] a');
    const optionCount=await optionLinks.count();
    let selectedVariantId=null;
    if(optionCount>1){
      const productInfo=productRoot.locator('[data-storefront-commerce="product-info"]').first();
      const beforePrice=(await productInfo.locator('[data-storefront-product-price="true"]').innerText()).trim();
      const beforeStock=(await productInfo.locator('[data-storefront-product-stock="true"]').innerText()).trim();
      const target=optionLinks.nth(optionCount-1);
      const label=(await target.innerText()).trim();
      const href=await target.getAttribute('href');
      selectedVariantId=href?new URL(href,page.url()).searchParams.get('variant'):null;
      await Promise.all([
        page.waitForURL(url=>url.pathname==='/visual-fidelity-qa'&&url.searchParams.get('page')==='product'&&(!selectedVariantId||url.searchParams.get('variant')===selectedVariantId),{timeout:15000}),
        target.click(),
      ]);
      productRoot=rootFor('product');
      await productRoot.waitFor({state:'visible',timeout:10000});
      const selected=productRoot.locator('[data-storefront-structured="option-selector"] a[aria-current="true"]').first();
      const afterInfo=productRoot.locator('[data-storefront-commerce="product-info"]').first();
      const afterPrice=(await afterInfo.locator('[data-storefront-product-price="true"]').innerText()).trim();
      const afterStock=(await afterInfo.locator('[data-storefront-product-stock="true"]').innerText()).trim();
      result.checks.selectedState=await selected.count()===1&&(await selected.innerText()).trim()===label;
      result.checks.priceUpdate=beforePrice!==afterPrice;
      result.checks.stockUpdate=beforeStock!==afterStock;
      result.checks.variantSelection=result.checks.selectedState===true;
    }else{
      result.checks.variantSelection='not-applicable';
      result.checks.selectedState='not-applicable';
      result.checks.priceUpdate='not-applicable';
      result.checks.stockUpdate='not-applicable';
    }

    const purchase=productRoot.getByRole('button',{name:/Kosárba/}).first();
    await purchase.waitFor({state:'visible',timeout:10000});
    if(await purchase.isDisabled())throw new Error('COMMERCE_PURCHASE_DISABLED');
    await purchase.click();
    const confirmation=page.locator('[data-storefront-cart-confirmation="shared-v1"]:visible');
    await confirmation.waitFor({state:'visible',timeout:10000});
    result.checks.addToCartAcknowledgement=await confirmation.getByRole('button',{name:'Tovább vásárolok',exact:true}).count()===1
      &&await confirmation.getByRole('link',{name:'Kosár megnyitása',exact:true}).count()===1;
    await Promise.all([
      page.waitForURL(url=>url.pathname==='/visual-fidelity-qa'&&url.searchParams.get('page')==='cart',{timeout:15000}),
      confirmation.getByRole('link',{name:'Kosár megnyitása',exact:true}).click(),
    ]);

    cartRoot=rootFor('cart');
    await cartRoot.locator('[data-storefront-preview-cart="interactive"]').waitFor({state:'visible',timeout:10000});
    let quantity=cartRoot.locator('[data-storefront-preview-cart-quantity]').first();
    const initial=(await quantity.innerText()).trim();
    await cartRoot.getByRole('button',{name:'Mennyiség növelése',exact:true}).first().click();
    await page.waitForFunction(()=>document.querySelector('[data-storefront-preview-cart-quantity]')?.textContent?.trim()==='2 db',{timeout:5000});
    quantity=cartRoot.locator('[data-storefront-preview-cart-quantity]').first();
    const increased=(await quantity.innerText()).trim();
    await cartRoot.getByRole('button',{name:'Mennyiség csökkentése',exact:true}).first().click();
    await page.waitForFunction(()=>document.querySelector('[data-storefront-preview-cart-quantity]')?.textContent?.trim()==='1 db',{timeout:5000});
    quantity=cartRoot.locator('[data-storefront-preview-cart-quantity]').first();
    const decreased=(await quantity.innerText()).trim();
    result.checks.quantityIncrease=initial==='1 db'&&increased==='2 db';
    result.checks.quantityDecrease=decreased==='1 db';
    result.checks.quantityMutation=result.checks.quantityIncrease===true&&result.checks.quantityDecrease===true;

    await cartRoot.getByRole('button',{name:'Tétel törlése',exact:true}).first().click();
    await cartRoot.locator('[data-storefront-preview-cart="empty"]').waitFor({state:'visible',timeout:5000});
    result.checks.removeItem=true;
    result.checks.emptyStateAfterRemove=true;
    result.checks.removeAndEmptyState=result.checks.removeItem===true&&result.checks.emptyStateAfterRemove===true;

    productRoot=await visit('product',selectedVariantId?{variant:selectedVariantId}:{});
    const repurchase=productRoot.getByRole('button',{name:/Kosárba/}).first();
    await repurchase.click();
    const confirmation2=page.locator('[data-storefront-cart-confirmation="shared-v1"]:visible');
    await confirmation2.waitFor({state:'visible',timeout:10000});
    await Promise.all([
      page.waitForURL(url=>url.pathname==='/visual-fidelity-qa'&&url.searchParams.get('page')==='cart',{timeout:15000}),
      confirmation2.getByRole('link',{name:'Kosár megnyitása',exact:true}).click(),
    ]);
    cartRoot=rootFor('cart');
    await cartRoot.locator('[data-storefront-preview-cart="interactive"]').waitFor({state:'visible',timeout:10000});
    result.checks.reAddItem=(await cartRoot.locator('[data-storefront-preview-cart-quantity]').first().innerText()).trim()==='1 db';
    await Promise.all([
      page.waitForURL(url=>url.pathname==='/visual-fidelity-qa'&&url.searchParams.get('page')==='checkout',{timeout:15000}),
      cartRoot.getByRole('link',{name:'Tovább a pénztárhoz',exact:true}).click(),
    ]);
    result.checks.checkoutEntry=true;

    const checkoutRoot=rootFor('checkout');
    await checkoutRoot.locator('[data-storefront-preview-checkout="interactive-fail-closed"]').waitFor({state:'visible',timeout:10000});
    const subtotal=(await checkoutRoot.locator('[data-storefront-preview-subtotal]').innerText()).trim();
    const beforeShipping=(await checkoutRoot.locator('[data-storefront-preview-shipping-cost]').innerText()).trim();
    const beforeTotal=(await checkoutRoot.locator('[data-storefront-preview-grand-total]').innerText()).trim();
    const parcel=checkoutRoot.getByRole('radio',{name:/Csomagpont/});
    await checkoutRoot.locator('label.choiceCard').filter({hasText:/Csomagpont/}).first().click();
    await page.waitForFunction(()=>document.querySelector('input[name="shippingProvider"]:checked')!==null,{timeout:5000});
    await page.waitForFunction(({beforeShipping,beforeTotal})=>{
      const shipping=document.querySelector('[data-storefront-preview-shipping-cost]')?.textContent?.trim();
      const total=document.querySelector('[data-storefront-preview-grand-total]')?.textContent?.trim();
      return Boolean(shipping&&total&&shipping!==beforeShipping&&total!==beforeTotal);
    },{beforeShipping,beforeTotal},{timeout:5000});
    const afterShipping=(await checkoutRoot.locator('[data-storefront-preview-shipping-cost]').innerText()).trim();
    const afterTotal=(await checkoutRoot.locator('[data-storefront-preview-grand-total]').innerText()).trim();
    result.checks.shippingSelection=await parcel.isChecked();
    result.checks.totalRecalculation=beforeShipping!==afterShipping&&beforeTotal!==afterTotal;
    result.checks.shippingRecalculation=result.checks.shippingSelection===true&&result.checks.totalRecalculation===true;
    const subtotalValue=commerceMoneyDigits(subtotal),beforeShippingValue=commerceMoneyDigits(beforeShipping),beforeTotalValue=commerceMoneyDigits(beforeTotal),afterShippingValue=commerceMoneyDigits(afterShipping),afterTotalValue=commerceMoneyDigits(afterTotal);
    result.checks.totalConsistency=[subtotalValue,beforeShippingValue,beforeTotalValue,afterShippingValue,afterTotalValue].every(value=>value!==null)
      &&subtotalValue+beforeShippingValue===beforeTotalValue
      &&subtotalValue+afterShippingValue===afterTotalValue;

    await checkoutRoot.getByPlaceholder('Írd be a választott automata vagy átvételi pont nevét / címét').fill('Preview csomagpont');
    await checkoutRoot.getByRole('button',{name:'Tovább a fizetéshez',exact:true}).click();
    const transfer=checkoutRoot.getByRole('radio',{name:/Banki átutalás/});
    await transfer.waitFor({state:'visible',timeout:5000});
    await checkoutRoot.locator('label.choiceCard').filter({hasText:/Banki átutalás/}).first().click();
    await page.waitForFunction(()=>document.querySelector('input[name="paymentProvider"]:checked')!==null,{timeout:5000});
    result.checks.paymentSelection=await transfer.isChecked();
    await checkoutRoot.getByRole('button',{name:'Tovább az összesítéshez',exact:true}).click();

    const terms=checkoutRoot.getByRole('checkbox',{name:/Elolvastam és elfogadom/});
    const privacy=checkoutRoot.getByRole('checkbox',{name:/Tudomásul vettem/});
    await checkoutRoot.locator('label.inlineCheck').filter({hasText:/Elolvastam és elfogadom/}).first().click();
    await checkoutRoot.locator('label.inlineCheck').filter({hasText:/Tudomásul vettem/}).first().click();
    result.checks.legalConsent=await terms.isChecked()&&await privacy.isChecked();

    const submit=checkoutRoot.locator('[data-storefront-preview-order-submit="true"]');
    await submit.waitFor({state:'visible',timeout:5000});
    await page.waitForFunction(()=>{const element=document.querySelector('[data-storefront-preview-order-submit="true"]');return element instanceof HTMLButtonElement&&!element.disabled},{timeout:5000});
    await submit.click();
    const blocked=checkoutRoot.locator('[data-storefront-preview-order-blocked="true"]');
    await blocked.waitFor({state:'visible',timeout:5000});
    await page.waitForTimeout(150);
    result.checks.orderSubmissionFailClosed=(await blocked.innerText()).trim()==='Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.';
    result.checks.realOrderRequestAttempted=forbiddenCommerceMutations.some(item=>item.kind==='order');
    result.checks.realPaymentRequestAttempted=forbiddenCommerceMutations.some(item=>item.kind==='payment');
    result.checks.productionCommerceMutationRequestAttempted=forbiddenCommerceMutations.length>0;
    if(forbiddenCommerceMutations.length)result.errors.push('PRODUCTION_COMMERCE_MUTATION_ATTEMPTED:'+forbiddenCommerceMutations.map(item=>item.kind+':'+item.method+':'+item.url).join(','));

    const provenOrNotApplicable=value=>value===true||value==='not-applicable';
    result.passed=result.checks.emptyState===true
      &&provenOrNotApplicable(result.checks.variantSelection)
      &&provenOrNotApplicable(result.checks.selectedState)
      &&provenOrNotApplicable(result.checks.priceUpdate)
      &&provenOrNotApplicable(result.checks.stockUpdate)
      &&result.checks.addToCartAcknowledgement===true
      &&result.checks.quantityIncrease===true
      &&result.checks.quantityDecrease===true
      &&result.checks.quantityMutation===true
      &&result.checks.removeItem===true
      &&result.checks.emptyStateAfterRemove===true
      &&result.checks.removeAndEmptyState===true
      &&result.checks.reAddItem===true
      &&result.checks.checkoutEntry===true
      &&result.checks.shippingSelection===true
      &&result.checks.shippingRecalculation===true
      &&result.checks.totalRecalculation===true
      &&result.checks.totalConsistency===true
      &&result.checks.paymentSelection===true
      &&result.checks.legalConsent===true
      &&result.checks.orderSubmissionFailClosed===true
      &&result.checks.realOrderRequestAttempted===false
      &&result.checks.realPaymentRequestAttempted===false
      &&result.checks.productionCommerceMutationRequestAttempted===false;
    if(!result.passed)result.errors.push('COMMERCE_INTERACTION_INCOMPLETE');
  }catch(error){
    result.errors.push(error instanceof Error?error.message:String(error));
  }finally{
    await page.close();
  }
  return result;
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
        const candidateQuery=manifest.factoryCandidate?'&factory=1':manifest.qualityCandidate?'&qualityCandidate=1':'';
        const url=`${baseUrl}/visual-fidelity-qa?template=${encodeURIComponent(manifest.templateKey)}&version=${manifest.templateVersion}&page=${encodeURIComponent(pageType)}&viewport=${viewport}${candidateQuery}`;
        try{
          await page.emulateMedia({reducedMotion:'reduce'});
          const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
          if(!response?.ok())throw new Error(`ROUTE_FAILED:${response?.status()??'no-response'}`);
          await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
          await page.waitForFunction(expected=>document.querySelector('.cookieBanner[data-template-aware-cookie="true"]')?.getAttribute('data-cookie-template-key')===expected,manifest.templateKey,{timeout:2500}).catch(()=>undefined);
          const cookieDiagnostics=await page.evaluate(expected=>{
            const banner=document.querySelector('.cookieBanner[data-template-aware-cookie="true"]');
            if(!banner)return{count:0,templateKey:null,preset:null,layout:null,visible:false};
            const rect=banner.getBoundingClientRect(),style=getComputedStyle(banner);
            return{count:1,templateKey:banner.getAttribute('data-cookie-template-key'),preset:banner.getAttribute('data-cookie-preset'),layout:banner.getAttribute('data-cookie-layout'),visible:rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden',expected};
          },manifest.templateKey);
          await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.cookieBanner,.skipLink{display:none!important}'});
          await waitForImages(page);
          await page.waitForTimeout(120);

          const roots=page.locator('[data-visual-fidelity-root="runtime"]:visible');
          const rootCount=await roots.count();
          if(rootCount!==1)throw new Error(`RUNTIME_ROOT_COUNT:${rootCount}`);
          const diagnostics=await browserDiagnostics(page,manifest,viewport);
          const caseErrors=[];
          const caseWarnings=[];

          if(cookieDiagnostics.count!==1)caseErrors.push(`COOKIE_SURFACE_CARDINALITY:${cookieDiagnostics.count}`);
          else{
            if(cookieDiagnostics.templateKey!==manifest.templateKey)caseErrors.push(`COOKIE_TEMPLATE_AUTHORITY:${cookieDiagnostics.templateKey??'missing'}`);
            if(!cookieDiagnostics.preset||cookieDiagnostics.preset==='generic-safe-fallback')caseErrors.push('COOKIE_TEMPLATE_PRESET_REQUIRED');
            if(!cookieDiagnostics.layout)caseErrors.push('COOKIE_TEMPLATE_LAYOUT_REQUIRED');
            if(!cookieDiagnostics.visible)caseErrors.push('COOKIE_SURFACE_NOT_VISIBLE');
          }
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
          if(diagnostics.socialErrors.length)caseErrors.push(`SOCIAL_LINK_INTEGRITY:${diagnostics.socialErrors.length}:${JSON.stringify(diagnostics.socialErrors.slice(0,6))}`);

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
      const candidateQuery=manifest.factoryCandidate?'&factory=1':manifest.qualityCandidate?'&qualityCandidate=1':'';
      const demoUrl=`${baseUrl}/visual-fidelity-qa?template=${encodeURIComponent(manifest.templateKey)}&version=${manifest.templateVersion}&page=content&viewport=mobile&demoContent=szallitas${candidateQuery}`;
      const page=await browser.newPage({viewport:viewportProfiles.mobile,deviceScaleFactor:1});
      const name=`${safeName(manifest.templateKey)}-v${manifest.templateVersion}-demo-szallitas-mobile`;
      try{
        const response=await page.goto(demoUrl,{waitUntil:'domcontentloaded',timeout:30000});
        if(!response?.ok())throw new Error(`DEMO_ROUTE_FAILED:${response?.status()??'no-response'}`);
        await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
        const runtimeRoot=page.locator('[data-visual-fidelity-root="runtime"]:visible').first();
        await runtimeRoot.waitFor({state:'visible',timeout:10000});
        const demoWarning=runtimeRoot.getByText('MINTA TARTALOM',{exact:false}).first();
        await demoWarning.waitFor({state:'visible',timeout:5000}).catch(()=>undefined);
        const warningText=await runtimeRoot.getByText('MINTA TARTALOM',{exact:false}).count();
        const mobileMenu=runtimeRoot.locator('[data-storefront-mobile-menu="true"]:visible');
        await mobileMenu.first().waitFor({state:'visible',timeout:5000}).catch(()=>undefined);
        const menuCount=await mobileMenu.count();
        const caseErrors=[];
        const candidate=manifest.factoryCandidate||manifest.qualityCandidate;
        const demoShowroomReadyAttr=await runtimeRoot.getAttribute('data-demo-showroom-ready');
        if(demoShowroomReadyAttr!=='true'&&demoShowroomReadyAttr!=='false')caseErrors.push('DEMO_SHOWROOM_READINESS_MISSING');
        else{
          const demoShowroomReady=demoShowroomReadyAttr==='true';
          if(candidate&&!demoShowroomReady)caseErrors.push('CANDIDATE_DEMO_NOT_SHOWROOM_READY');
          if(demoShowroomReady&&warningText>0)caseErrors.push(candidate?'CANDIDATE_SHOWROOM_PLACEHOLDER_WARNING_PRESENT':'SHOWROOM_READY_DEMO_WARNING_PRESENT');
          if(!demoShowroomReady&&warningText<1)caseErrors.push('DEMO_WARNING_MISSING');
        }
        if(menuCount!==1)caseErrors.push(`DEMO_MOBILE_MENU_CARDINALITY:${menuCount}`);
        for(const error of caseErrors)errors.push({case:name,error});
        const pathOut=path.join(outputDir,`${name}.png`);
        await page.screenshot({path:pathOut,fullPage:true,animations:'disabled'});
        cases.push({templateKey:manifest.templateKey,templateVersion:manifest.templateVersion,pageType:'content-demo',viewport:'mobile',url:demoUrl,screenshotPath:pathOut,errors:caseErrors,warnings:[]});
      }catch(error){
        errors.push({case:name,error:error instanceof Error?error.message:String(error)});
      }finally{await page.close();}
    }
  }
  for(const selected of scope.selected){
    const proof=await proveFactoryCommerceInteraction(browser,selected.template);
    selected.commerceInteraction=proof;
    if(proof.required&&!proof.passed)errors.push({case:safeName(selected.template.templateKey)+'-commerce-interaction',error:'FACTORY_COMMERCE_INTERACTION_NOT_PROVEN:'+(proof.errors.join('|')||'unknown')});
  }
}finally{
  await browser.close();
}

const acceptanceProofs=scope.selected.map(selected=>{
  const manifest=selected.template;
  const templateCases=cases.filter(item=>item.templateKey===manifest.templateKey&&item.templateVersion===manifest.templateVersion);
  const expectedMatrixKeys=new Set(manifest.pageTypes.flatMap(pageType=>manifest.viewports.map(viewport=>`${pageType}:${viewport}`)));
  const matrixCases=templateCases.filter(item=>expectedMatrixKeys.has(`${item.pageType}:${item.viewport}`));
  const observedMatrixKeys=new Set(matrixCases.map(item=>`${item.pageType}:${item.viewport}`));
  const fullBrowserMatrixComplete=observedMatrixKeys.size===expectedMatrixKeys.size&&[...expectedMatrixKeys].every(key=>observedMatrixKeys.has(key));
  const browserMatrixPassed=fullBrowserMatrixComplete&&matrixCases.every(item=>(item.errors??[]).length===0);
  const proceduralReplays=manifest.proceduralMemory?.failureReplays??[];
  const proceduralMemoryPassed=manifest.factoryCandidate
    ?manifest.proceduralMemory?.preflightOk===true&&proceduralReplays.length>0&&proceduralReplays.every(item=>item.passed===true)
    :true;
  const commerceInteraction=selected.commerceInteraction??{required:false,passed:true,status:'not-applicable'};
  const commerceInteractionPassed=!manifest.factoryCandidate||commerceInteraction.passed===true;
  const factoryIdentityPinned=!manifest.factoryCandidate||(
    manifest.provenance?.targetTemplateKey===manifest.templateKey
    &&manifest.provenance?.targetTemplateVersion===manifest.templateVersion
    &&templateCases.every(item=>String(item.url??'').includes('factory=1'))
  );
  const showroomEvidence=manifest.showroomEvidence??[];
  const showroomContractPassed=!manifest.factoryCandidate||(
    showroomEvidence.length>0
    &&showroomEvidence.every(row=>Boolean(row.pageKey)&&row.schemaVersion===1&&Boolean(row.presentationAuthority)&&row.entrypointPresent===true&&row.navigationPresent===true)
  );
  const blockers=[];
  if(!browserMatrixPassed)blockers.push('BROWSER_MATRIX_NOT_PROVEN');
  if(!proceduralMemoryPassed)blockers.push('PROCEDURAL_MEMORY_REPLAY_FAILED');
  if(!factoryIdentityPinned)blockers.push('FACTORY_CANDIDATE_IDENTITY_NOT_PINNED');
  if(!showroomContractPassed)blockers.push('FACTORY_SHOWROOM_CONTRACT_NOT_PROVEN');
  if(!commerceInteractionPassed)blockers.push('FACTORY_COMMERCE_INTERACTION_NOT_PROVEN');
  if(manifest.factoryCandidate)blockers.push('VERCEL_PRODUCT_OWNER_JOURNEY_PROOF_REQUIRED');
  const maturity=browserMatrixPassed&&proceduralMemoryPassed&&factoryIdentityPinned&&showroomContractPassed&&commerceInteractionPassed&&manifest.productOwnerReady===true
    ?'visually-ready'
    :browserMatrixPassed&&proceduralMemoryPassed&&factoryIdentityPinned&&showroomContractPassed
      ?'technically-ready'
      :'compiled';
  return{
    contract:'shoporation.template-factory-ci-acceptance-proof.v1',
    templateKey:manifest.templateKey,
    templateVersion:manifest.templateVersion,
    factoryCandidate:Boolean(manifest.factoryCandidate),
    sourceCommit:headSha==='HEAD'?null:headSha,
    provenance:manifest.provenance??null,
    browserMatrixPassed,
    browserMatrixComplete:fullBrowserMatrixComplete,
    browserMatrixCaseCount:observedMatrixKeys.size,
    browserMatrixExpectedCaseCount:expectedMatrixKeys.size,
    proceduralMemoryPassed,
    factoryIdentityPinned,
    showroomContractPassed,
    showroomEvidence,
    commerceInteractionPassed,
    commerceInteraction,
    productOwnerReadyByCompiler:manifest.productOwnerReady===true,
    maturity,
    handoffReady:false,
    blockers,
  };
});

const evidence={
  contract:'shoporation.template-factory-quality-evidence.v2',
  sourceCommit:headSha==='HEAD'?null:headSha,
  baseSha:baseSha||null,
  changes,
  selection:scope.reasons,
  legacyTemplateChanges:scope.legacyTemplateChanges,
  cases,
  acceptanceProofs,
  errors,
  warnings,
  capturedAt:new Date().toISOString(),
};
await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(evidence,null,2));
console.log(JSON.stringify({selection:scope.reasons,legacyTemplateChanges:scope.legacyTemplateChanges,cases:cases.length,errorCount:errors.length,warningCount:warnings.length},null,2));
if(errors.length){
  console.error(JSON.stringify(errors,null,2));
  process.exitCode=1;
}
