import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const previewUrl=(process.env.PRODUCT_OWNER_PREVIEW_URL??'').trim();
const templateKey=(process.env.PRODUCT_OWNER_TEMPLATE_KEY??'').trim();
const templateVersion=Number(process.env.PRODUCT_OWNER_TEMPLATE_VERSION??'');
const sourceCommit=(process.env.PRODUCT_OWNER_SOURCE_COMMIT??'').trim()||null;
const email=(process.env.PRODUCT_OWNER_TEST_EMAIL??'').trim();
const password=process.env.PRODUCT_OWNER_TEST_PASSWORD??'';
const storageState=(process.env.PRODUCT_OWNER_STORAGE_STATE??'').trim();
const vercelAutomationBypassSecret=(process.env.VERCEL_AUTOMATION_BYPASS_SECRET??'').trim();
const qualityManifestPath=(process.env.TEMPLATE_QUALITY_MANIFEST??'artifacts/template-factory-quality/manifest.json').trim();
const outputDir=(process.env.TEMPLATE_HANDOFF_OUTPUT_DIR??'artifacts/template-factory-handoff').trim();

if(!previewUrl)throw new Error('PRODUCT_OWNER_PREVIEW_URL_REQUIRED');
if(!templateKey)throw new Error('PRODUCT_OWNER_TEMPLATE_KEY_REQUIRED');
if(!Number.isInteger(templateVersion)||templateVersion<1)throw new Error('PRODUCT_OWNER_TEMPLATE_VERSION_REQUIRED');

const exists=async file=>{try{await access(file);return true}catch{return false}};
const cleanUrl=value=>{
  const parsed=new URL(value);
  parsed.searchParams.delete('_vercel_share');
  return parsed.toString();
};
const exactIdentity=url=>{
  const parsed=new URL(url);
  return parsed.searchParams.get('template')===templateKey
    &&Number(parsed.searchParams.get('version'))===templateVersion
    &&parsed.searchParams.get('factory')==='1';
};
const previewFor=(pageType,extra={})=>{
  const parsed=new URL(previewUrl);
  parsed.searchParams.set('template',templateKey);
  parsed.searchParams.set('version',String(templateVersion));
  parsed.searchParams.set('factory','1');
  parsed.searchParams.set('viewport','desktop');
  parsed.searchParams.set('page',pageType);
  parsed.searchParams.delete('demoContent');
  parsed.searchParams.delete('embed');
  for(const[key,value]of Object.entries(extra)){
    if(value===null||value===undefined||value==='')parsed.searchParams.delete(key);
    else parsed.searchParams.set(key,String(value));
  }
  return parsed.toString();
};
const candidatePageIdentity=(url,pageType)=>{
  const parsed=new URL(url);
  return parsed.pathname==='/storefront-template-preview'
    &&exactIdentity(parsed.toString())
    &&parsed.searchParams.get('page')===pageType;
};

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

const requested=new URL(previewUrl);
if(requested.pathname!=='/storefront-template-preview'||!exactIdentity(previewUrl)){
  throw new Error('PRODUCT_OWNER_PREVIEW_IDENTITY_INVALID');
}

await mkdir(outputDir,{recursive:true});
const errors=[];
const checks={};
let technicalProof=null;
if(await exists(qualityManifestPath)){
  technicalProof=JSON.parse(await readFile(qualityManifestPath,'utf8'));
  const acceptance=(technicalProof.acceptanceProofs??[]).find(item=>item.templateKey===templateKey&&item.templateVersion===templateVersion);
  checks.technicalAcceptanceProofFound=Boolean(acceptance);
  if(!acceptance)errors.push('TECHNICAL_ACCEPTANCE_PROOF_MISSING');
  else{
    checks.browserMatrixPassed=acceptance.browserMatrixPassed===true;
    checks.proceduralMemoryPassed=acceptance.proceduralMemoryPassed===true;
    checks.factoryIdentityPinned=acceptance.factoryIdentityPinned===true;
    checks.showroomContractPassed=acceptance.showroomContractPassed===true;
    checks.showroomEvidence=Array.isArray(acceptance.showroomEvidence)?acceptance.showroomEvidence:[];
    checks.navigationCompletenessPassed=checks.showroomContractPassed
      &&checks.showroomEvidence.length>0
      &&checks.showroomEvidence.filter(row=>row.reachability==='shell-navigation').every(row=>row.navigationPresent===true&&row.entrypointPresent===true);
    if(!checks.browserMatrixPassed)errors.push('BROWSER_MATRIX_NOT_PROVEN');
    if(!checks.proceduralMemoryPassed)errors.push('PROCEDURAL_MEMORY_NOT_PROVEN');
    if(!checks.factoryIdentityPinned)errors.push('FACTORY_IDENTITY_NOT_PINNED');
    if(!checks.showroomContractPassed)errors.push('FACTORY_SHOWROOM_CONTRACT_NOT_PROVEN');
    if(!checks.navigationCompletenessPassed)errors.push('TEMPLATE_NAVIGATION_COMPLETENESS_NOT_PROVEN');
    if(sourceCommit&&acceptance.sourceCommit!==sourceCommit)errors.push('SOURCE_COMMIT_MISMATCH');
  }
}else{
  errors.push('TECHNICAL_ACCEPTANCE_MANIFEST_MISSING');
}

let browser;
let context;
try{
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({
    ...(storageState&&await exists(storageState)?{storageState}:{}),
    ...(vercelAutomationBypassSecret?{extraHTTPHeaders:{
      'x-vercel-protection-bypass':vercelAutomationBypassSecret,
      'x-vercel-set-bypass-cookie':'true',
    }}:{}),
  });
  checks.vercelAutomationBypassConfigured=Boolean(vercelAutomationBypassSecret);
  if(!checks.vercelAutomationBypassConfigured)errors.push('VERCEL_AUTOMATION_BYPASS_SECRET_REQUIRED');
  const page=await context.newPage();
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
  const response=await page.goto(previewUrl,{waitUntil:'domcontentloaded',timeout:30000});
  checks.entryResponse=Boolean(response);
  await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
  if(!storageState){
    checks.templateAwareLoginRedirectSettled=await page
      .waitForURL(url=>url.pathname==='/storefront-template-preview-login',{timeout:10000})
      .then(()=>true)
      .catch(()=>false);
    if(!checks.templateAwareLoginRedirectSettled)errors.push('TEMPLATE_AWARE_LOGIN_REDIRECT_NOT_SETTLED');
  }

  let current=new URL(page.url());
  checks.entryPath=current.pathname;
  if(current.pathname==='/storefront-template-preview-login'){
    checks.templateAwareLoginRoute=true;
    checks.loginIdentity=current.searchParams.get('template')===templateKey
      &&Number(current.searchParams.get('version'))===templateVersion
      &&current.searchParams.get('factory')==='1';
    if(!checks.loginIdentity)errors.push('LOGIN_TEMPLATE_IDENTITY_MISMATCH');

    const next=current.searchParams.get('next');
    checks.returnTargetPreserved=Boolean(next&&exactIdentity(new URL(next,current.origin).toString()));
    if(!checks.returnTargetPreserved)errors.push('LOGIN_RETURN_TARGET_MISMATCH');

    const streamedAuthSurface=page.locator('main[data-template-preview-auth="true"] [data-storefront-auth-surface="true"]:visible');
    await streamedAuthSurface.waitFor({state:'visible',timeout:15000}).catch(()=>undefined);
    checks.templateAwareAuthContentReady=await streamedAuthSurface.count()===1;
    if(!checks.templateAwareAuthContentReady)errors.push('TEMPLATE_AWARE_AUTH_CONTENT_NOT_READY');

    const shellSelector=`[data-storefront-account-shell="preview"][data-storefront-template="${templateKey}"]`;
    const allTemplateShells=page.locator(shellSelector);
    const visibleTemplateShell=page.locator(shellSelector+':visible');
    const visibleAccountShells=page.locator('[data-storefront-account-shell]:visible');
    await visibleTemplateShell.waitFor({state:'visible',timeout:10000}).catch(()=>undefined);
    checks.templateAwareAuthShellCount=await allTemplateShells.count();
    checks.visibleTemplateAwareAuthShellCount=await visibleTemplateShell.count();
    checks.visibleAccountShellCount=await visibleAccountShells.count();
    checks.hiddenTemplateAwareAuthShellCount=Math.max(0,checks.templateAwareAuthShellCount-checks.visibleTemplateAwareAuthShellCount);
    checks.templateAwareAuthShell=checks.visibleTemplateAwareAuthShellCount===1&&checks.visibleAccountShellCount===1;
    if(!checks.templateAwareAuthShell)errors.push('TEMPLATE_AWARE_AUTH_SHELL_MISSING');

    const styles=page.locator(`[data-storefront-global-styles-v1="true"][data-storefront-template="${templateKey}"][data-storefront-template-version="${templateVersion}"]`);
    checks.templateVersionedAuthStyle=await styles.count()>0;
    if(!checks.templateVersionedAuthStyle)errors.push('TEMPLATE_AUTH_STYLE_IDENTITY_MISSING');

    const allAuthSurfaces=page.locator('[data-storefront-auth-surface="true"]');
    const authSurface=page.locator('[data-storefront-auth-surface="true"]:visible');
    await authSurface.waitFor({state:'visible',timeout:10000}).catch(()=>undefined);
    checks.sharedAuthSurfaceCount=await allAuthSurfaces.count();
    checks.visibleSharedAuthSurfaceCount=await authSurface.count();
    checks.sharedAuthSurface=checks.visibleSharedAuthSurfaceCount===1;
    if(!checks.sharedAuthSurface)errors.push('VISIBLE_SHARED_AUTH_SURFACE_NOT_UNIQUE');

    if(email&&password){
      const visibleEmail=authSurface.locator('input[name="email"]');
      const visiblePassword=authSurface.locator('input[name="password"]');
      const visibleLoginButton=authSurface.locator('button[type="submit"]:visible');
      checks.visibleAuthEmailTargetCount=await visibleEmail.count();
      checks.visibleAuthPasswordTargetCount=await visiblePassword.count();
      checks.visibleAuthSubmitTargetCount=await visibleLoginButton.count();
      if(checks.visibleAuthEmailTargetCount!==1)errors.push('VISIBLE_AUTH_EMAIL_TARGET_NOT_UNIQUE');
      if(checks.visibleAuthPasswordTargetCount!==1)errors.push('VISIBLE_AUTH_PASSWORD_TARGET_NOT_UNIQUE');
      if(checks.visibleAuthSubmitTargetCount!==1)errors.push('VISIBLE_AUTH_SUBMIT_TARGET_NOT_UNIQUE');
      if(checks.visibleAuthEmailTargetCount===1&&checks.visibleAuthPasswordTargetCount===1&&checks.visibleAuthSubmitTargetCount===1){
        await visibleEmail.fill(email);
        await visiblePassword.fill(password);
        await Promise.all([
          page.waitForURL(url=>url.pathname==='/storefront-template-preview',{timeout:30000}),
          visibleLoginButton.click(),
        ]).catch(error=>errors.push(`AUTHENTICATED_RETURN_FAILED:${error instanceof Error?error.message:String(error)}`));
        await page.waitForLoadState('domcontentloaded',{timeout:15000}).catch(()=>undefined);
        await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
      }
    }else if(!storageState){
      errors.push('PRODUCT_OWNER_AUTH_CREDENTIALS_OR_STORAGE_STATE_REQUIRED');
    }
  }else{
    checks.templateAwareLoginRoute=storageState?true:false;
  }

  current=new URL(page.url());
  checks.finalPath=current.pathname;
  checks.finalIdentity=current.pathname==='/storefront-template-preview'&&exactIdentity(current.toString());
  if(!checks.finalIdentity)errors.push('FINAL_PREVIEW_IDENTITY_MISMATCH');

  if(checks.finalIdentity){
    const allRoots=page.locator('[data-template-preview="representative-demo"]');
    const root=page.locator('[data-template-preview="representative-demo"]:visible');
    await root.first().waitFor({state:'visible',timeout:30000}).catch(()=>undefined);
    checks.previewRootCount=await allRoots.count();
    checks.visiblePreviewRootCount=await root.count();
    checks.previewProvenanceStamp=checks.visiblePreviewRootCount===1;
    if(!checks.previewProvenanceStamp)errors.push('PREVIEW_PROVENANCE_STAMP_MISSING');
    if(checks.visiblePreviewRootCount===1){
      const provenance=await root.first().evaluate(element=>({
        templateKey:element.getAttribute('data-template-key'),
        templateVersion:element.getAttribute('data-template-version'),
        factoryCandidate:element.getAttribute('data-factory-candidate'),
        templateRecipe:element.getAttribute('data-template-recipe'),
        compileSource:element.getAttribute('data-compile-source'),
        foundationTemplate:element.getAttribute('data-foundation-template'),
        sourceCommit:element.getAttribute('data-source-commit'),
        pageType:element.getAttribute('data-page-type'),
      }));
      checks.previewTemplateKey=provenance.templateKey;
      checks.previewTemplateVersion=provenance.templateVersion;
      checks.previewFactoryCandidate=provenance.factoryCandidate;
      checks.previewTemplateRecipe=provenance.templateRecipe;
      checks.compileSource=provenance.compileSource;
      checks.foundationTemplate=provenance.foundationTemplate;
      checks.previewSourceCommit=provenance.sourceCommit;
      checks.previewPageType=provenance.pageType;
      if(provenance.templateKey!==templateKey)errors.push('PREVIEW_TEMPLATE_KEY_MISMATCH');
      if(Number(provenance.templateVersion)!==templateVersion)errors.push('PREVIEW_TEMPLATE_VERSION_MISMATCH');
      if(provenance.factoryCandidate!=='true')errors.push('PREVIEW_FACTORY_CANDIDATE_MISMATCH');
      if(provenance.templateRecipe!==`${templateKey}@${templateVersion}`)errors.push('PREVIEW_RECIPE_IDENTITY_MISMATCH');
      if(provenance.compileSource!=='template-factory')errors.push('PREVIEW_COMPILE_SOURCE_MISMATCH');
      if(!provenance.foundationTemplate||provenance.foundationTemplate==='none')errors.push('PREVIEW_FOUNDATION_PROVENANCE_MISSING');
      if(sourceCommit&&provenance.sourceCommit!==sourceCommit)errors.push('PREVIEW_SOURCE_COMMIT_MISMATCH');
      await root.first().screenshot({path:path.join(outputDir,'product-owner-preview.png'),animations:'disabled',timeout:25000});
    }

    const rootFor=pageType=>page.locator(
      `[data-template-preview="representative-demo"][data-template-key="${templateKey}"][data-template-version="${templateVersion}"][data-factory-candidate="true"][data-template-recipe="${templateKey}@${templateVersion}"][data-page-type="${pageType}"]`
    ).first();
    const assertCandidatePage=async(pageType,label)=>{
      await page.waitForURL(url=>candidatePageIdentity(url.toString(),pageType),{timeout:15000});
      const candidateRoot=rootFor(pageType);
      await candidateRoot.waitFor({state:'visible',timeout:10000});
      const count=await candidateRoot.count();
      if(count!==1)throw new Error(`CANDIDATE_PRESENTATION_ROOT_CARDINALITY:${label}:${count}`);
      const provenance=await candidateRoot.evaluate(element=>({
        compileSource:element.getAttribute('data-compile-source'),
        sourceCommit:element.getAttribute('data-source-commit'),
      }));
      if(provenance.compileSource!=='template-factory')throw new Error(`CANDIDATE_PRESENTATION_AUTHORITY_MISMATCH:${label}`);
      if(sourceCommit&&provenance.sourceCommit!==sourceCommit)throw new Error(`CANDIDATE_ROUTE_SOURCE_COMMIT_MISMATCH:${label}`);
      return candidateRoot;
    };
    const visitCandidate=async(pageType,label,extra={})=>{
      const response=await page.goto(previewFor(pageType,extra),{waitUntil:'domcontentloaded',timeout:30000});
      if(!response)throw new Error(`CANDIDATE_ROUTE_NO_RESPONSE:${label}`);
      await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
      return assertCandidatePage(pageType,label);
    };
    const clickCandidate=async(locator,pageType,label)=>{
      try{
        await locator.waitFor({state:'visible',timeout:10000});
        await Promise.all([
          page.waitForURL(url=>candidatePageIdentity(url.toString(),pageType),{timeout:15000}),
          locator.click(),
        ]);
        await assertCandidatePage(pageType,label);
        return true;
      }catch(error){
        const message=error instanceof Error?error.message:String(error);
        errors.push(`ROUTE_CONVERGENCE_${label.toUpperCase().replace(/[^A-Z0-9]+/g,'_')}:${message}`);
        return false;
      }
    };

    const evidencePageTypes=[...new Set((checks.showroomEvidence??[]).map(row=>row.pageType).filter(Boolean))];
    checks.presentationContinuityPassed=evidencePageTypes.length>0;
    checks.placeholderContentPassed=evidencePageTypes.length>0;
    const placeholderTokens=['Minta tartalom','A kínálat feltöltés alatt áll','Ez a sablon által létrehozott mintaoldal'];
    for(const pageType of evidencePageTypes){
      try{
        const candidateRoot=await visitCandidate(pageType,`inventory-${pageType}`);
        const text=(await candidateRoot.innerText()).replace(/\s+/g,' ');
        if(placeholderTokens.some(token=>text.includes(token))){
          checks.placeholderContentPassed=false;
          errors.push(`FACTORY_PLACEHOLDER_CONTENT_VISIBLE:${pageType}`);
        }
      }catch(error){
        checks.presentationContinuityPassed=false;
        const message=error instanceof Error?error.message:String(error);
        errors.push(`PRESENTATION_CONTINUITY_${String(pageType).toUpperCase().replace(/[^A-Z0-9]+/g,'_')}:${message}`);
      }
    }

    const commerceInteraction={};
    try{
      let commerceCartRoot=await visitCandidate('cart','commerce-empty-baseline');
      const removeExisting=async()=>{
        for(let attempt=0;attempt<12;attempt+=1){
          const removeButtons=commerceCartRoot.getByRole('button',{name:'Tétel törlése',exact:true});
          if(await removeButtons.count()===0)break;
          await removeButtons.first().click();
          await page.waitForTimeout(80);
          commerceCartRoot=rootFor('cart');
        }
      };
      await removeExisting();
      await commerceCartRoot.locator('[data-storefront-preview-cart="empty"]').waitFor({state:'visible',timeout:10000});
      commerceInteraction.emptyState=true;

      let commerceProductRoot=await visitCandidate('product','commerce-variant-selection');
      const optionLinks=commerceProductRoot.locator('[data-storefront-structured="option-selector"] a');
      const optionCount=await optionLinks.count();
      let selectedVariant=null;
      if(optionCount>1){
        const productInfo=commerceProductRoot.locator('[data-storefront-commerce="product-info"]').first();
        const beforePrice=(await productInfo.locator('[data-storefront-product-price="true"]').innerText()).trim();
        const beforeStock=(await productInfo.locator('[data-storefront-product-stock="true"]').innerText()).trim();
        const target=optionLinks.nth(optionCount-1);
        const targetLabel=(await target.innerText()).trim();
        const targetHref=await target.getAttribute('href');
        selectedVariant=targetHref?new URL(targetHref,page.url()).searchParams.get('variant'):null;
        await Promise.all([
          page.waitForURL(url=>candidatePageIdentity(url.toString(),'product')&&(!selectedVariant||url.searchParams.get('variant')===selectedVariant),{timeout:15000}),
          target.click(),
        ]);
        commerceProductRoot=await assertCandidatePage('product','commerce-variant-selected');
        const selectedOption=commerceProductRoot.locator('[data-storefront-structured="option-selector"] a[aria-current="true"]').first();
        const afterInfo=commerceProductRoot.locator('[data-storefront-commerce="product-info"]').first();
        const afterPrice=(await afterInfo.locator('[data-storefront-product-price="true"]').innerText()).trim();
        const afterStock=(await afterInfo.locator('[data-storefront-product-stock="true"]').innerText()).trim();
        commerceInteraction.selectedState=await selectedOption.count()===1&&(await selectedOption.innerText()).trim()===targetLabel;
        commerceInteraction.priceUpdate=beforePrice!==afterPrice;
        commerceInteraction.stockUpdate=beforeStock!==afterStock;
        commerceInteraction.variantSelection=commerceInteraction.selectedState===true;
      }else{
        commerceInteraction.variantSelection='not-applicable';
        commerceInteraction.selectedState='not-applicable';
        commerceInteraction.priceUpdate='not-applicable';
        commerceInteraction.stockUpdate='not-applicable';
      }

      const purchaseButton=commerceProductRoot.getByRole('button',{name:/Kosárba/}).first();
      await purchaseButton.waitFor({state:'visible',timeout:10000});
      await purchaseButton.click();
      const confirmation=page.locator('[data-storefront-cart-confirmation="shared-v1"]:visible');
      await confirmation.waitFor({state:'visible',timeout:10000});
      commerceInteraction.addToCartAcknowledgement=await confirmation.getByRole('button',{name:'Tovább vásárolok',exact:true}).count()===1
        &&await confirmation.getByRole('link',{name:'Kosár megnyitása',exact:true}).count()===1;
      await clickCandidate(confirmation.getByRole('link',{name:'Kosár megnyitása',exact:true}),'cart','commerce-add-to-cart');

      commerceCartRoot=rootFor('cart');
      await commerceCartRoot.locator('[data-storefront-preview-cart="interactive"]').waitFor({state:'visible',timeout:10000});
      const quantity=commerceCartRoot.locator('[data-storefront-preview-cart-quantity]').first();
      const initialQuantity=(await quantity.innerText()).trim();
      await commerceCartRoot.getByRole('button',{name:'Mennyiség növelése',exact:true}).first().click();
      await page.waitForFunction(()=>document.querySelector('[data-storefront-preview-cart-quantity]')?.textContent?.trim()==='2 db',{timeout:5000});
      const increasedQuantity=(await quantity.innerText()).trim();
      await commerceCartRoot.getByRole('button',{name:'Mennyiség csökkentése',exact:true}).first().click();
      await page.waitForFunction(()=>document.querySelector('[data-storefront-preview-cart-quantity]')?.textContent?.trim()==='1 db',{timeout:5000});
      const decreasedQuantity=(await quantity.innerText()).trim();
      commerceInteraction.quantityIncrease=initialQuantity==='1 db'&&increasedQuantity==='2 db';
      commerceInteraction.quantityDecrease=decreasedQuantity==='1 db';
      commerceInteraction.quantityMutation=commerceInteraction.quantityIncrease===true&&commerceInteraction.quantityDecrease===true;

      await commerceCartRoot.getByRole('button',{name:'Tétel törlése',exact:true}).first().click();
      await commerceCartRoot.locator('[data-storefront-preview-cart="empty"]').waitFor({state:'visible',timeout:10000});
      commerceInteraction.removeItem=true;
      commerceInteraction.emptyStateAfterRemove=true;
      commerceInteraction.removeAndEmptyState=true;

      commerceProductRoot=await visitCandidate('product','commerce-readd',selectedVariant?{variant:selectedVariant}:{});
      await commerceProductRoot.getByRole('button',{name:/Kosárba/}).first().click();
      const readdConfirmation=page.locator('[data-storefront-cart-confirmation="shared-v1"]:visible');
      await readdConfirmation.waitFor({state:'visible',timeout:10000});
      await clickCandidate(readdConfirmation.getByRole('link',{name:'Kosár megnyitása',exact:true}),'cart','commerce-readd-cart');
      commerceCartRoot=rootFor('cart');
      await commerceCartRoot.locator('[data-storefront-preview-cart="interactive"]').waitFor({state:'visible',timeout:10000});
      commerceInteraction.reAddItem=(await commerceCartRoot.locator('[data-storefront-preview-cart-quantity]').first().innerText()).trim()==='1 db';
      commerceInteraction.checkoutEntry=await clickCandidate(commerceCartRoot.getByRole('link',{name:'Tovább a pénztárhoz',exact:true}).first(),'checkout','commerce-checkout');

      const checkoutRoot=rootFor('checkout');
      await checkoutRoot.locator('[data-storefront-preview-checkout="interactive-fail-closed"]').waitFor({state:'visible',timeout:10000});
      const subtotal=(await checkoutRoot.locator('[data-storefront-preview-subtotal]').innerText()).trim();
      const beforeShipping=(await checkoutRoot.locator('[data-storefront-preview-shipping-cost]').innerText()).trim();
      const beforeGrandTotal=(await checkoutRoot.locator('[data-storefront-preview-grand-total]').innerText()).trim();
      const parcel=checkoutRoot.getByRole('radio',{name:/Csomagpont/}).first();
      await parcel.check();
      const afterShipping=(await checkoutRoot.locator('[data-storefront-preview-shipping-cost]').innerText()).trim();
      const afterGrandTotal=(await checkoutRoot.locator('[data-storefront-preview-grand-total]').innerText()).trim();
      commerceInteraction.shippingSelection=await parcel.isChecked();
      commerceInteraction.totalRecalculation=beforeShipping!==afterShipping&&beforeGrandTotal!==afterGrandTotal;
      commerceInteraction.shippingRecalculation=commerceInteraction.shippingSelection===true&&commerceInteraction.totalRecalculation===true;
      const subtotalValue=commerceMoneyDigits(subtotal),beforeShippingValue=commerceMoneyDigits(beforeShipping),beforeTotalValue=commerceMoneyDigits(beforeGrandTotal),afterShippingValue=commerceMoneyDigits(afterShipping),afterTotalValue=commerceMoneyDigits(afterGrandTotal);
      commerceInteraction.totalConsistency=[subtotalValue,beforeShippingValue,beforeTotalValue,afterShippingValue,afterTotalValue].every(value=>value!==null)
        &&subtotalValue+beforeShippingValue===beforeTotalValue
        &&subtotalValue+afterShippingValue===afterTotalValue;

      const transfer=checkoutRoot.getByRole('radio',{name:'Banki átutalás',exact:true});
      await transfer.check();
      commerceInteraction.paymentSelection=await transfer.isChecked();

      await checkoutRoot.locator('[data-storefront-preview-order-submit="true"]').click();
      const blocked=checkoutRoot.locator('[data-storefront-preview-order-blocked="true"]');
      await blocked.waitFor({state:'visible',timeout:5000});
      await page.waitForTimeout(150);
      commerceInteraction.orderSubmissionFailClosed=(await blocked.innerText()).includes('Előnézeti módban rendelés nem adható le');
      commerceInteraction.realOrderRequestAttempted=forbiddenCommerceMutations.some(item=>item.kind==='order');
      commerceInteraction.realPaymentRequestAttempted=forbiddenCommerceMutations.some(item=>item.kind==='payment');
      commerceInteraction.productionCommerceMutationRequestAttempted=forbiddenCommerceMutations.length>0;
    }catch(error){
      commerceInteraction.exception=error instanceof Error?error.message:String(error);
    }
    checks.commerceInteraction=commerceInteraction;
    const provenOrNotApplicable=value=>value===true||value==='not-applicable';
    checks.commerceInteractionPassed=commerceInteraction.emptyState===true
      &&provenOrNotApplicable(commerceInteraction.variantSelection)
      &&provenOrNotApplicable(commerceInteraction.selectedState)
      &&provenOrNotApplicable(commerceInteraction.priceUpdate)
      &&provenOrNotApplicable(commerceInteraction.stockUpdate)
      &&commerceInteraction.addToCartAcknowledgement===true
      &&commerceInteraction.quantityIncrease===true
      &&commerceInteraction.quantityDecrease===true
      &&commerceInteraction.quantityMutation===true
      &&commerceInteraction.removeItem===true
      &&commerceInteraction.emptyStateAfterRemove===true
      &&commerceInteraction.removeAndEmptyState===true
      &&commerceInteraction.reAddItem===true
      &&commerceInteraction.checkoutEntry===true
      &&commerceInteraction.shippingSelection===true
      &&commerceInteraction.shippingRecalculation===true
      &&commerceInteraction.totalRecalculation===true
      &&commerceInteraction.totalConsistency===true
      &&commerceInteraction.paymentSelection===true
      &&commerceInteraction.orderSubmissionFailClosed===true
      &&commerceInteraction.realOrderRequestAttempted===false
      &&commerceInteraction.realPaymentRequestAttempted===false
      &&commerceInteraction.productionCommerceMutationRequestAttempted===false;
    if(forbiddenCommerceMutations.length)errors.push('PRODUCTION_COMMERCE_MUTATION_ATTEMPTED:'+forbiddenCommerceMutations.map(item=>item.kind+':'+item.method+':'+item.url).join(','));
    if(!checks.commerceInteractionPassed)errors.push('COMMERCE_INTERACTION_NOT_PROVEN');
    const convergence={};
    let homeRoot=await visitCandidate('home','home-route-convergence');
    convergence.headerCart=await clickCandidate(homeRoot.getByRole('link',{name:'Kosár',exact:true}).first(),'cart','header-cart');

    homeRoot=await visitCandidate('home','home-account-convergence');
    convergence.headerAccount=await clickCandidate(homeRoot.getByRole('button',{name:'Fiókom',exact:true}).first(),'account','header-account');

    homeRoot=await visitCandidate('home','home-wishlist-convergence');
    convergence.headerWishlist=await clickCandidate(homeRoot.getByRole('link',{name:'Kedvenceim',exact:true}).first(),'account','header-wishlist');

    homeRoot=await visitCandidate('home','home-product-convergence');
    convergence.productCard=await clickCandidate(homeRoot.locator('[data-storefront-commerce-card] a[href*="page=product"]').first(),'product','product-card');

    homeRoot=await visitCandidate('home','home-add-to-cart-convergence');
    const homePurchase=homeRoot.getByRole('button',{name:/Kosárba/}).first();
    if(await homePurchase.count()>0){
      try{
        await homePurchase.waitFor({state:'visible',timeout:10000});
        await homePurchase.click();
        const confirmation=page.locator('[data-storefront-cart-confirmation="shared-v1"]:visible');
        await confirmation.waitFor({state:'visible',timeout:10000});
        convergence.homeAddToCart=await clickCandidate(confirmation.getByRole('link',{name:'Kosár megnyitása',exact:true}),'cart','home-add-to-cart-open-cart');
      }catch(error){
        convergence.homeAddToCart=false;
        errors.push(`ROUTE_CONVERGENCE_HOME_ADD_TO_CART:${error instanceof Error?error.message:String(error)}`);
      }
    }else{
      convergence.homeAddToCart='variant-selection-required';
    }

    let productRoot=await visitCandidate('product','pdp-add-to-cart-convergence');
    const pdpPurchase=productRoot.getByRole('button',{name:/Kosárba/}).first();
    try{
      await pdpPurchase.waitFor({state:'visible',timeout:10000});
      await pdpPurchase.click();
      const confirmation=page.locator('[data-storefront-cart-confirmation="shared-v1"]:visible');
      await confirmation.waitFor({state:'visible',timeout:10000});
      convergence.pdpAddToCart=await clickCandidate(confirmation.getByRole('link',{name:'Kosár megnyitása',exact:true}),'cart','pdp-add-to-cart-open-cart');
    }catch(error){
      convergence.pdpAddToCart=false;
      errors.push(`ROUTE_CONVERGENCE_PDP_ADD_TO_CART:${error instanceof Error?error.message:String(error)}`);
    }

    const cartRoot=await visitCandidate('cart','cart-checkout-convergence');
    convergence.cartCheckout=await clickCandidate(cartRoot.getByRole('link',{name:'Tovább a pénztárhoz',exact:true}).first(),'checkout','cart-checkout');

    homeRoot=await visitCandidate('home','home-about-convergence');
    convergence.about=await clickCandidate(homeRoot.getByRole('link',{name:'Rólunk',exact:true}).first(),'content','footer-about');

    homeRoot=await visitCandidate('home','home-contact-convergence');
    convergence.contact=await clickCandidate(homeRoot.getByRole('link',{name:'Kapcsolat',exact:true}).first(),'contact','footer-contact');

    homeRoot=await visitCandidate('home','home-shipping-convergence');
    convergence.shipping=await clickCandidate(homeRoot.getByRole('link',{name:'Szállítás és fizetés',exact:true}).first(),'legal','footer-shipping-payment');

    checks.routeConvergence=convergence;
    checks.routeConvergencePassed=Object.values(convergence).length>=9&&Object.values(convergence).every(value=>value===true||value==='variant-selection-required');
    if(!checks.routeConvergencePassed)errors.push('MULTI_ENTRY_ROUTE_CONVERGENCE_NOT_PROVEN');

    let accountRoot=await visitCandidate('account','account-capability-proof');
    const accountTargets=[
      ['Rendeléseim','orders'],['Letöltéseim','letoltesek'],['Dokumentumaim','dokumentumok'],['Kívánságlista','kivansaglista'],
      ['Ügyeim','ugyek'],['Visszaküldés','visszakuldes'],['Fiókadatok','profile'],['Marketing beállítások','marketing'],
    ];
    checks.accountSurfacePassed=(await Promise.all(accountTargets.map(async([label,view])=>{
      const link=accountRoot.getByRole('link',{name:label,exact:true}).first();
      if(await link.count()!==1)return false;
      const href=await link.getAttribute('href');
      return Boolean(href&&new URL(href,page.url()).searchParams.get('accountView')===view);
    }))).every(Boolean);
    if(!checks.accountSurfacePassed)errors.push('CANONICAL_ACCOUNT_SURFACES_NOT_PROVEN');
    try{
      const casesLink=accountRoot.getByRole('link',{name:'Ügyeim',exact:true}).first();
      await Promise.all([
        page.waitForURL(url=>candidatePageIdentity(url.toString(),'account')&&url.searchParams.get('accountView')==='ugyek',{timeout:15000}),
        casesLink.click(),
      ]);
      accountRoot=await assertCandidatePage('account','account-cases-empty-state');
      const emptyState=accountRoot.locator('[data-storefront-preview-account-state="ugyek"]');
      await emptyState.waitFor({state:'visible',timeout:10000});
      checks.accountInteractionPassed=(await emptyState.innerText()).includes('Jelenleg nincs folyamatban lévő ügyed');
    }catch(error){
      checks.accountInteractionPassed=false;
      errors.push(`ACCOUNT_INTERACTION_NOT_PROVEN:${error instanceof Error?error.message:String(error)}`);
    }
    if(!checks.accountInteractionPassed&&!errors.some(item=>String(item).startsWith('ACCOUNT_INTERACTION_NOT_PROVEN')))errors.push('ACCOUNT_INTERACTION_NOT_PROVEN');

    const engineChecks={};
    let engineRoot=await visitCandidate('catalog','engine-e2');
    engineChecks.E2=await engineRoot.locator('[data-storefront-structured="catalog-facets"]').count()>0
      &&await engineRoot.locator('[data-storefront-commerce="product-grid"]').count()>0;
    engineRoot=await visitCandidate('product','engine-e7-e13-product');
    engineChecks.E7=await engineRoot.locator('[data-storefront-structured="key-specs"],[data-storefront-structured="specification-groups"]').count()>0;
    const productPurchaseVisible=await engineRoot.locator('[data-storefront-commerce="purchase-controls"]').count()>0;
    engineRoot=await visitCandidate('blog-index','engine-e10-index');
    const storyIndexVisible=await engineRoot.locator('[data-storefront-story="index"]').count()>0;
    engineRoot=await visitCandidate('blog-article','engine-e10-article');
    const storyEditorialVisible=await engineRoot.locator('[data-storefront-story="hero"],[data-storefront-story="feature"]').count()>0;
    engineChecks.E10=storyIndexVisible&&storyEditorialVisible;
    engineRoot=await visitCandidate('cart','engine-e13-cart');
    const cartVisible=await engineRoot.locator('[data-storefront-commerce="cart-summary"]').count()>0;
    engineRoot=await visitCandidate('checkout','engine-e13-checkout');
    const checkoutVisible=await engineRoot.locator('[data-storefront-commerce="checkout-summary"]').count()>0;
    engineChecks.E13=productPurchaseVisible&&cartVisible&&checkoutVisible;
    engineChecks.E1=checks.presentationContinuityPassed===true;
    checks.engineDemoIntegration=engineChecks;
    checks.engineDemoIntegrationPassed=Object.values(engineChecks).every(Boolean);
    if(!checks.engineDemoIntegrationPassed)errors.push('SHARED_ENGINE_DEMO_INTEGRATION_NOT_PROVEN');

    if(!checks.placeholderContentPassed)errors.push('PLACEHOLDER_CONTENT_CLEANUP_NOT_PROVEN');
    if(!checks.presentationContinuityPassed)errors.push('TEMPLATE_PRESENTATION_CONTINUITY_NOT_PROVEN');
  }

}catch(error){
  const message=error instanceof Error?error.message:String(error);
  errors.push(`JOURNEY_EXCEPTION:${message}`);
  checks.journeyException=message;
}finally{
  await context?.close().catch(()=>undefined);
  await browser?.close().catch(()=>undefined);
}

const proof={
  contract:'shoporation.template-factory-product-owner-handoff.v2',
  templateKey,
  templateVersion,
  sourceCommit,
  previewUrl:cleanUrl(previewUrl),
  checks,
  errors,
  maturity:errors.length===0?'product-owner-ready':'visually-ready',
  handoffReady:errors.length===0,
  accepted:false,
  verifiedAt:new Date().toISOString(),
};
await writeFile(path.join(outputDir,'proof.json'),JSON.stringify(proof,null,2));
console.log(JSON.stringify(proof,null,2));
if(errors.length)process.exitCode=1;

