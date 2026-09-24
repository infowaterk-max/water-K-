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
const vercelTrustedOidcToken=(process.env.VERCEL_TRUSTED_OIDC_TOKEN??'').trim();
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
    if(!checks.browserMatrixPassed)errors.push('BROWSER_MATRIX_NOT_PROVEN');
    if(!checks.proceduralMemoryPassed)errors.push('PROCEDURAL_MEMORY_NOT_PROVEN');
    if(!checks.factoryIdentityPinned)errors.push('FACTORY_IDENTITY_NOT_PINNED');
    if(sourceCommit&&acceptance.sourceCommit!==sourceCommit)errors.push('SOURCE_COMMIT_MISMATCH');
  }
}else{
  errors.push('TECHNICAL_ACCEPTANCE_MANIFEST_MISSING');
}

let browser;
let context;
try{
  browser=await chromium.launch({headless:true});
  const contextOptions=storageState&&await exists(storageState)?{storageState}:{};
  if(vercelTrustedOidcToken){
    contextOptions.extraHTTPHeaders={'x-vercel-trusted-oidc-idp-token':vercelTrustedOidcToken};
  }
  checks.vercelTrustedOidcPresented=Boolean(vercelTrustedOidcToken);
  context=await browser.newContext(contextOptions);
  const page=await context.newPage();
  const response=await page.goto(previewUrl,{waitUntil:'domcontentloaded',timeout:30000});
  checks.entryResponse=Boolean(response);
  checks.entryStatus=response?.status()??null;
  await page.waitForLoadState('load',{timeout:15000}).catch(()=>undefined);
  checks.entryTitle=await page.title().catch(()=>null);
  if(checks.entryStatus!==null&&checks.entryStatus>=400)errors.push(`ENTRY_HTTP_STATUS_${checks.entryStatus}`);
  await page.waitForFunction(
    () => location.pathname==='/storefront-template-preview-login'
      || Boolean(document.querySelector('[data-template-preview="representative-demo"]')),
    {timeout:10000},
  ).catch(()=>undefined);
  checks.entrySettledPath=new URL(page.url()).pathname;

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
    checks.templateAwareAuthShell=await shell.count()===1;
    if(!checks.templateAwareAuthShell)errors.push('TEMPLATE_AWARE_AUTH_SHELL_MISSING');

    const styles=page.locator(`[data-storefront-global-styles-v1="true"][data-storefront-template="${templateKey}"][data-storefront-template-version="${templateVersion}"]`);
    checks.templateVersionedAuthStyle=await styles.count()>0;
    if(!checks.templateVersionedAuthStyle)errors.push('TEMPLATE_AUTH_STYLE_IDENTITY_MISSING');

    const authSurface=page.locator('[data-storefront-auth-surface="true"]');
    checks.sharedAuthSurface=await authSurface.count()===1;
    if(!checks.sharedAuthSurface)errors.push('SHARED_AUTH_SURFACE_MISSING');

    if(email&&password){
      const visibleEmail=authSurface.locator('input[name="email"]:visible');
      const visiblePassword=authSurface.locator('input[name="password"]:visible');
      const visibleLoginButton=authSurface.locator('button:visible').filter({hasText:/^\\s*Belépés\\s*$/});
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
    const root=page.locator(
      `[data-template-preview="representative-demo"][data-template-key="${templateKey}"][data-template-version="${templateVersion}"][data-factory-candidate="true"][data-template-recipe="${templateKey}@${templateVersion}"]`
    );
    await root.first().waitFor({state:'attached',timeout:10000}).catch(()=>undefined);
    checks.previewProvenanceStamp=await root.count()===1;
    if(!checks.previewProvenanceStamp)errors.push('PREVIEW_PROVENANCE_STAMP_MISSING');
    if(await root.count()===1){
      const provenance=await root.first().evaluate(element=>({
        compileSource:element.getAttribute('data-compile-source'),
        foundationTemplate:element.getAttribute('data-foundation-template'),
        sourceCommit:element.getAttribute('data-source-commit'),
      }));
      checks.compileSource=provenance.compileSource;
      checks.foundationTemplate=provenance.foundationTemplate;
      checks.previewSourceCommit=provenance.sourceCommit;
      if(provenance.compileSource!=='template-factory')errors.push('PREVIEW_COMPILE_SOURCE_MISMATCH');
      if(!provenance.foundationTemplate||provenance.foundationTemplate==='none')errors.push('PREVIEW_FOUNDATION_PROVENANCE_MISSING');
      if(sourceCommit&&provenance.sourceCommit!==sourceCommit)errors.push('PREVIEW_SOURCE_COMMIT_MISMATCH');
      await root.first().screenshot({path:path.join(outputDir,'product-owner-preview.png'),animations:'disabled',timeout:25000});
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

const proof={
  contract:'shoporation.template-factory-product-owner-handoff.v1',
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

