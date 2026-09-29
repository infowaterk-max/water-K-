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
const engineFunctionalProofPath=(process.env.PRODUCT_OWNER_ENGINE_FUNCTIONAL_PROOF??'').trim();
const engineFunctionalOnly=['1','true'].includes((process.env.PRODUCT_OWNER_ENGINE_FUNCTIONAL_ONLY??'').trim().toLowerCase());

if(!previewUrl)throw new Error('PRODUCT_OWNER_PREVIEW_URL_REQUIRED');
if(!engineFunctionalOnly&&!templateKey)throw new Error('PRODUCT_OWNER_TEMPLATE_KEY_REQUIRED');
if(!engineFunctionalOnly&&(!Number.isInteger(templateVersion)||templateVersion<1))throw new Error('PRODUCT_OWNER_TEMPLATE_VERSION_REQUIRED');

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


async function dismissCookieConsent(page){
  const dialog=page.locator('[data-template-aware-cookie="true"][role="dialog"]:visible');
  if(!(await dialog.count()))return false;
  const necessary=dialog.getByRole('button',{name:'Csak szükséges',exact:true});
  await necessary.waitFor({state:'visible',timeout:5000});
  await necessary.click();
  await dialog.waitFor({state:'hidden',timeout:5000}).catch(()=>undefined);
  return true;
}

async function authenticatePlatformOperator(page){
  const origin=new URL(previewUrl).origin;
  if(storageState&&await exists(storageState)){
    const response=await page.goto(new URL('/admin/platform',origin).toString(),{waitUntil:'domcontentloaded',timeout:30000});
    await dismissCookieConsent(page);
    if(response&&new URL(page.url()).pathname==='/admin/platform')return true;
  }
  if(!email||!password)throw new Error('ENGINE_FUNCTIONAL_PLATFORM_CREDENTIALS_REQUIRED');
  const response=await page.goto(new URL('/platform',origin).toString(),{waitUntil:'domcontentloaded',timeout:30000});
  if(!response)throw new Error('ENGINE_FUNCTIONAL_PLATFORM_LOGIN_NO_RESPONSE');
  await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
  await dismissCookieConsent(page);
  const emailInput=page.locator('input[name="email"]:visible').first();
  const passwordInput=page.locator('input[name="password"]:visible').first();
  const submit=page.getByRole('button',{name:'Belépés a Shoperationbe',exact:true});
  await emailInput.waitFor({state:'visible',timeout:10000});
  await passwordInput.waitFor({state:'visible',timeout:10000});
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submit.click();
  const navigated=await page.waitForURL(url=>url.pathname==='/admin/platform',{waitUntil:'commit',timeout:30000}).then(()=>true).catch(()=>false);
  if(!navigated){
    const message=await page.locator('.notice,[role="alert"]').filter({visible:true}).last().innerText().catch(()=>null);
    throw new Error(`ENGINE_FUNCTIONAL_PLATFORM_LOGIN_FAILED:path=${new URL(page.url()).pathname};message=${(message??'no diagnostic').replace(/\\s+/g,' ').slice(0,240)}`);
  }
  await page.waitForTimeout(350);
  const settled=new URL(page.url());
  if(settled.pathname!=='/admin/platform')throw new Error(`ENGINE_FUNCTIONAL_PLATFORM_ROLE_REQUIRED:path=${settled.pathname};reason=${settled.searchParams.get('reason')??'redirected'}`);
  return true;
}

async function proveSharedE13FunctionalEngine(page){
  const origin=new URL(previewUrl).origin;
  const proof={
    contract:'shoporation.shared-engine-functional-proof.v1',
    engine:'E13',
    platformAuthenticated:false,
    acceptanceEntry:false,
    acceptanceInstanceId:null,
    acceptanceSeeder:false,
    sharedRuntime:false,
    quoteStatus:null,
    quotePositive:false,
    mixedFixture:false,
    shippingOptionCount:0,
    shippingStep:false,
    paymentOptionCount:0,
    paymentStep:false,
    summaryStep:false,
    submitEnabled:false,
    failClosed:false,
    sideEffectRequests:[],
    error:null,
    passed:false,
  };
  const sideEffects=[];
  const observe=request=>{
    try{
      const url=new URL(request.url());
      const method=request.method();
      const blocked=method==='POST'&&[
        '/api/orders',
        '/api/payment',
        '/api/payments',
        '/api/invoice',
        '/api/invoices',
        '/api/shipping',
      ].some(prefix=>url.pathname===prefix||url.pathname.startsWith(prefix+'/'));
      if(blocked)sideEffects.push(`${method} ${url.pathname}`);
    }catch{}
  };
  page.on('request',observe);
  try{
    proof.platformAuthenticated=await authenticatePlatformOperator(page);
    const entryResponse=await page.goto(new URL('/storefront-template-preview/engine-proof/checkout',origin).toString(),{waitUntil:'domcontentloaded',timeout:30000});
    if(!entryResponse)throw new Error('ENGINE_ACCEPTANCE_ENTRY_NO_RESPONSE');
    await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
    const entryRoot=page.locator('[data-engine-functional-proof="E13"]');
    await entryRoot.waitFor({state:'visible',timeout:15000});
    const entryAlert=entryRoot.getByRole('alert');
    if(await entryAlert.count())throw new Error(`ENGINE_ACCEPTANCE_TARGET_FAILED:${(await entryAlert.first().innerText()).replace(/\s+/g,' ').slice(0,400)}`);
    proof.acceptanceEntry=true;
    proof.acceptanceInstanceId=await entryRoot.getAttribute('data-acceptance-instance-id');
    if(!proof.acceptanceInstanceId)throw new Error('ENGINE_ACCEPTANCE_INSTANCE_ID_MISSING');

    const start=page.getByRole('button',{name:'E13 checkout proof indítása',exact:true});
    await start.waitFor({state:'visible',timeout:10000});
    await Promise.all([
      page.waitForURL(url=>/^\/admin\/platform\/acceptance\/[0-9a-f-]+\/checkout$/i.test(url.pathname),{timeout:30000}),
      start.click(),
    ]);

    const checkoutLink=page.getByRole('link',{name:'Pénztár megnyitása',exact:true});
    await checkoutLink.waitFor({state:'visible',timeout:20000});
    proof.acceptanceSeeder=true;
    const quotePromise=page.waitForResponse(response=>{
      try{
        const url=new URL(response.url());
        return url.pathname==='/api/checkout/quote'&&response.request().method()==='POST'&&response.status()===200;
      }catch{return false}
    },{timeout:25000});
    await Promise.all([
      page.waitForURL(url=>url.pathname==='/penztar',{timeout:20000}),
      checkoutLink.click(),
    ]);

    const checkoutRoot=page.locator('[data-checkout-acceptance="preview"]');
    await checkoutRoot.waitFor({state:'visible',timeout:15000});
    proof.sharedRuntime=await page.locator('[data-storefront-live-checkout="shared-e13"]').count()>0;
    if(!proof.sharedRuntime)throw new Error('ENGINE_SHARED_E13_RUNTIME_MISSING');

    const quoteResponse=await quotePromise;
    proof.quoteStatus=quoteResponse.status();
    const quote=await quoteResponse.json().catch(()=>null);
    proof.quotePositive=Boolean(quote?.ok===true&&Number(quote?.total_gross_huf)>0);
    proof.mixedFixture=Boolean(Number(quote?.physical_lines)>0&&Number(quote?.digital_lines)>0&&quote?.fulfillment_mode==='mixed');
    if(!proof.quotePositive)throw new Error('ENGINE_AUTHORITATIVE_QUOTE_NOT_POSITIVE');
    if(!proof.mixedFixture)throw new Error('ENGINE_MIXED_ACCEPTANCE_FIXTURE_NOT_PROVEN');

    const customerType=page.locator('select[name="customerType"]:visible').first();
    if(await customerType.count())await customerType.selectOption('retail');
    const values={
      name:'Acceptance Vásárló',
      email:'acceptance@example.invalid',
      phone:'+3612345678',
      billingPostcode:'2760',
      billingCity:'Nagykáta',
      billingAddress:'Acceptance utca 1.',
    };
    for(const[name,value]of Object.entries(values)){
      const input=page.locator(`input[name="${name}"]:visible`).first();
      if(await input.count())await input.fill(value);
    }

    const shippingRadios=page.locator('input[name="shippingProvider"]:visible:not(:disabled)');
    proof.shippingOptionCount=await shippingRadios.count();
    if(proof.shippingOptionCount<1)throw new Error('ENGINE_ACCEPTANCE_SHIPPING_OPTION_MISSING');
    let shippingAdvanced=false;
    for(let index=0;index<proof.shippingOptionCount&&!shippingAdvanced;index+=1){
      const radio=shippingRadios.nth(index);
      if(!(await radio.isChecked()))await radio.check().catch(()=>undefined);
      const parcelText=page.locator('input[placeholder*="átvételi pont"]:visible').first();
      if(await parcelText.count())await parcelText.fill('Acceptance automata');
      await page.getByRole('button',{name:'Tovább a fizetéshez',exact:true}).click();
      shippingAdvanced=await page.locator('[data-checkout-panel="payment"]:visible').waitFor({state:'visible',timeout:2500}).then(()=>true).catch(()=>false);
    }
    if(!shippingAdvanced)throw new Error('ENGINE_ACCEPTANCE_SHIPPING_STEP_BLOCKED');
    proof.shippingStep=true;

    const paymentRadios=page.locator('input[name="paymentProvider"]:visible:not(:disabled)');
    proof.paymentOptionCount=await paymentRadios.count();
    if(proof.paymentOptionCount<1)throw new Error('ENGINE_ACCEPTANCE_PAYMENT_OPTION_MISSING');
    const checkedPayment=page.locator('input[name="paymentProvider"]:visible:checked');
    if(await checkedPayment.count()===0)await paymentRadios.first().check();
    await page.getByRole('button',{name:'Tovább az összesítéshez',exact:true}).click();
    await page.locator('[data-checkout-panel="summary"]:visible').waitFor({state:'visible',timeout:10000});
    proof.paymentStep=true;
    proof.summaryStep=true;

    const guest=page.getByRole('button',{name:'Folytatás vendégként',exact:true});
    if(await guest.count()&&await guest.isVisible())await guest.click();
    await page.locator('input[name="termsAccepted"]').check();
    await page.locator('input[name="privacyAcknowledged"]').check();

    const submit=page.getByRole('button',{name:'Acceptance · rendelésleadás tesztelése',exact:true});
    await submit.waitFor({state:'visible',timeout:10000});
    proof.submitEnabled=await submit.isEnabled();
    if(!proof.submitEnabled)throw new Error('ENGINE_ACCEPTANCE_SUBMIT_DISABLED');
    await submit.click();
    const blocked=page.getByRole('alert').filter({hasText:'Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.'});
    await blocked.waitFor({state:'visible',timeout:10000});
    proof.failClosed=true;
    proof.sideEffectRequests=[...sideEffects];
    proof.passed=proof.platformAuthenticated
      &&proof.acceptanceEntry
      &&proof.acceptanceSeeder
      &&proof.sharedRuntime
      &&proof.quoteStatus===200
      &&proof.quotePositive
      &&proof.mixedFixture
      &&proof.shippingStep
      &&proof.paymentStep
      &&proof.summaryStep
      &&proof.paymentOptionCount>0
      &&proof.submitEnabled
      &&proof.failClosed
      &&proof.sideEffectRequests.length===0;
  }catch(error){
    proof.error=error instanceof Error?error.message:String(error);
    proof.sideEffectRequests=[...sideEffects];
  }finally{
    page.off('request',observe);
  }
  return proof;
}

const requested=new URL(previewUrl);
if(engineFunctionalOnly){
  if(requested.pathname!=='/platform')throw new Error('ENGINE_FUNCTIONAL_PREVIEW_ENTRY_INVALID');
}else if(requested.pathname!=='/storefront-template-preview'||!exactIdentity(previewUrl)){
  throw new Error('PRODUCT_OWNER_PREVIEW_IDENTITY_INVALID');
}

await mkdir(outputDir,{recursive:true});
const errors=[];
const checks={};
let technicalProof=null;
if(!engineFunctionalOnly&&await exists(qualityManifestPath)){
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
}else if(!engineFunctionalOnly){
  errors.push('TECHNICAL_ACCEPTANCE_MANIFEST_MISSING');
}

if(!engineFunctionalOnly){
  checks.engineFunctionalProofPassed=false;
  checks.engineFunctionalProofPath=engineFunctionalProofPath||null;
  if(!engineFunctionalProofPath){
    errors.push('ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN:proof path missing');
  }else if(!(await exists(engineFunctionalProofPath))){
    errors.push('ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN:proof artifact missing');
  }else{
    try{
      const engineProof=JSON.parse(await readFile(engineFunctionalProofPath,'utf8'));
      checks.engineFunctionalProofContract=engineProof?.contract??null;
      checks.engineFunctionalProofEngine=engineProof?.engine??null;
      checks.engineFunctionalProofSourceCommit=engineProof?.sourceCommit??null;
      checks.engineFunctionalProofArtifactPassed=engineProof?.passed===true;
      const contractOk=engineProof?.contract==='shoporation.shared-engine-functional-proof.v1';
      const engineOk=engineProof?.engine==='E13';
      const commitOk=!sourceCommit||engineProof?.sourceCommit===sourceCommit;
      checks.engineFunctionalProofPassed=contractOk&&engineOk&&commitOk&&engineProof?.passed===true;
      if(!checks.engineFunctionalProofPassed){
        const detail=[
          contractOk?'contract=ok':`contract=${engineProof?.contract??'missing'}`,
          engineOk?'engine=E13':`engine=${engineProof?.engine??'missing'}`,
          commitOk?'sourceCommit=ok':`sourceCommit=${engineProof?.sourceCommit??'missing'}`,
          engineProof?.passed===true?'passed=true':'passed=false',
        ].join(',');
        errors.push(`ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN:${detail}`);
      }
    }catch(error){
      errors.push(`ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN:invalid proof artifact:${error instanceof Error?error.message:String(error)}`);
    }
  }
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
  if(engineFunctionalOnly){
    const engineProof=await proveSharedE13FunctionalEngine(page);
    checks.engineFunctionalProof={E13:engineProof};
    checks.engineFunctionalProofPassed=engineProof.passed===true;
    if(!checks.engineFunctionalProofPassed)errors.push(`ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN:${engineProof.error??'functional proof incomplete'}`);
  }else{
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

    const shell=page.locator(`[data-storefront-account-shell="preview"][data-storefront-template="${templateKey}"]`);
    await shell.waitFor({state:'visible',timeout:10000}).catch(()=>undefined);
    checks.templateAwareAuthShellCount=await shell.count();
    checks.templateAwareAuthShell=checks.templateAwareAuthShellCount===1;
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

    const convergence={};
    let homeRoot=await visitCandidate('home','home-route-convergence');
    convergence.headerCart=await clickCandidate(homeRoot.getByRole('link',{name:'Kosár',exact:true}).first(),'cart','header-cart');

    homeRoot=await visitCandidate('home','home-account-convergence');
    convergence.headerAccount=await clickCandidate(homeRoot.getByRole('link',{name:'Fiókom',exact:true}).first(),'account','header-account');

    homeRoot=await visitCandidate('home','home-wishlist-convergence');
    convergence.headerWishlist=await clickCandidate(homeRoot.getByRole('link',{name:'Kedvenceim',exact:true}).first(),'account','header-wishlist');

    homeRoot=await visitCandidate('home','home-product-convergence');
    convergence.productCard=await clickCandidate(homeRoot.locator('[data-storefront-commerce-card="loot-vault"] a').first(),'product','product-card');

    homeRoot=await visitCandidate('home','home-add-to-cart-convergence');
    const homePurchase=homeRoot.getByRole('button',{name:'Kosárba',exact:true}).first();
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

    let productRoot=await visitCandidate('product','pdp-add-to-cart-convergence');
    const pdpPurchase=productRoot.getByRole('button',{name:'Kosárba',exact:true}).first();
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
    checks.routeConvergencePassed=Object.values(convergence).length>=9&&Object.values(convergence).every(Boolean);
    if(!checks.routeConvergencePassed)errors.push('MULTI_ENTRY_ROUTE_CONVERGENCE_NOT_PROVEN');

    const accountRoot=await visitCandidate('account','account-capability-proof');
    const accountLabels=['Rendeléseim','Letöltéseim','Dokumentumaim','Kívánságlista','Ügyeim','Visszaküldés','Fiókadatok','Marketing beállítások'];
    checks.accountSurfacePassed=(await Promise.all(accountLabels.map(async label=>accountRoot.getByRole('link',{name:label,exact:true}).count()))).every(count=>count>0);
    if(!checks.accountSurfacePassed)errors.push('CANONICAL_ACCOUNT_SURFACES_NOT_PROVEN');

    const engineChecks={};
    let engineRoot=await visitCandidate('catalog','engine-e2');
    engineChecks.E2=await engineRoot.locator('[data-storefront-structured="catalog-facets"]').count()>0
      &&await engineRoot.locator('[data-storefront-commerce="product-grid"]').count()>0;
    engineRoot=await visitCandidate('product','engine-e7-e13-product');
    engineChecks.E7=await engineRoot.locator('[data-storefront-structured="key-specs"],[data-storefront-structured="specification-groups"]').count()>0;
    const productPurchaseVisible=await engineRoot.locator('[data-storefront-commerce="purchase-controls"]').count()>0;
    engineRoot=await visitCandidate('blog-index','engine-e10');
    engineChecks.E10=await engineRoot.locator('[data-storefront-story="index"]').count()>0
      &&await engineRoot.locator('[data-storefront-story="feature"]').count()>0;
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
  }

}catch(error){
  const message=error instanceof Error?error.message:String(error);
  errors.push(`JOURNEY_EXCEPTION:${message}`);
  checks.journeyException=message;
}finally{
  await context?.close().catch(()=>undefined);
  await browser?.close().catch(()=>undefined);
}

const diagnosticRoute=cleanUrl(previewUrl);
const diagnostics=errors.map(rawValue=>{
  const raw=String(rawValue),code=raw.split(':')[0],detail=raw.includes(':')?raw.slice(raw.indexOf(':')+1):raw;
  const base={code,reason:raw,route:diagnosticRoute,contract:engineFunctionalOnly?'shoporation.shared-engine-functional-proof.v1':'shoporation.template-factory-product-owner-handoff.v2',expected:engineFunctionalOnly?'Shared engine functional proof PASS':'Product Owner journey check PASS',actual:detail,evidence:engineFunctionalOnly?[`engine=E13`,`sourceCommit=${sourceCommit??'unknown'}`]:[`template=${templateKey}@${templateVersion}`]};
  if(code==='TEMPLATE_AWARE_AUTH_SHELL_MISSING')return{...base,contract:'template-aware-auth-shell',expected:'exactly one template-aware preview auth shell',actual:`count=${checks.templateAwareAuthShellCount??0}`};
  if(code==='TEMPLATE_AUTH_STYLE_IDENTITY_MISSING')return{...base,contract:'template-versioned-auth-style',expected:'template/version-aware auth style marker present',actual:'marker missing'};
  if(code==='VISIBLE_SHARED_AUTH_SURFACE_NOT_UNIQUE')return{...base,contract:'visible-auth-surface',expected:'exactly one visible shared auth surface',actual:`count=${checks.visibleAuthSurfaceCount??'unknown'}`};
  if(code==='SOURCE_COMMIT_MISMATCH'||code==='PREVIEW_SOURCE_COMMIT_MISMATCH')return{...base,contract:'exact-head-provenance',expected:sourceCommit??'exact source commit',actual:raw};
  if(code==='ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN')return{...base,contract:'shoporation.shared-engine-functional-proof.v1',expected:'E13 real /penztar journey PASS with authoritative quote and fail-closed submit',actual:detail};
  return base;
});
const proof=engineFunctionalOnly?{
  contract:'shoporation.shared-engine-functional-proof.v1',
  engine:'E13',
  sourceCommit,
  previewUrl:cleanUrl(previewUrl),
  checks,
  errors,
  diagnostics,
  passed:errors.length===0&&checks.engineFunctionalProofPassed===true,
  maturity:errors.length===0?'engine-functional-proven':'engine-functional-blocked',
  verifiedAt:new Date().toISOString(),
}:{
  contract:'shoporation.template-factory-product-owner-handoff.v2',
  templateKey,
  templateVersion,
  sourceCommit,
  previewUrl:cleanUrl(previewUrl),
  checks,
  errors,
  diagnostics,
  maturity:errors.length===0?'product-owner-ready':'visually-ready',
  handoffReady:errors.length===0,
  accepted:false,
  verifiedAt:new Date().toISOString(),
};
await writeFile(path.join(outputDir,'proof.json'),JSON.stringify(proof,null,2));
console.log(JSON.stringify(proof,null,2));
if(errors.length)process.exitCode=1;

