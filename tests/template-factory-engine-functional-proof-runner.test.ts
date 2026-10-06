import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Template Factory shared engine functional proof runner',()=>{
  const runner=read('scripts/template-factory-product-owner-handoff.mjs');
  const workflow=read('.github/workflows/template-factory-quality-gate.yml');

  it('keeps engine behavior proof separate from template presence proof',()=>{
    expect(runner).toContain("PRODUCT_OWNER_ENGINE_FUNCTIONAL_ONLY");
    expect(runner).toContain("shoporation.shared-engine-functional-proof.v1");
    expect(runner).toContain("/storefront-template-preview/engine-proof/checkout");
    expect(runner).toContain("E13 checkout proof indítása");
    expect(runner).toContain("data-storefront-live-checkout=\"shared-e13\"");
    expect(runner).toContain("'/api/checkout/quote'");
    expect(runner).toContain("Acceptance · rendelésleadás tesztelése");
    expect(runner).toContain("proof.sideEffectRequests.length===0");
    expect(runner).toContain("waitUntil:'commit'");
    expect(runner).toContain("ENGINE_FUNCTIONAL_PLATFORM_ROLE_REQUIRED");
    expect(runner).toContain("dismissCookieConsent(page)");
    expect(runner).toContain("const loginUrl=new URL('/api/auth/workforce-login',origin)");
    expect(runner).toContain("loginUrl.searchParams.set('next','/admin/platform')");
    expect(runner).toContain("page.locator('[data-workforce-auth=\"true\"]')");
    expect(runner).toContain("name:'Tovább a biztonsági ellenőrzéshez'");
    expect(runner).not.toContain("page.goto(new URL('/platform',origin)");
    expect(runner).not.toContain("name:'Belépés a Shoperationbe'");
    expect(runner).toContain("name:'Csak szükséges'");
    expect(runner).toContain("ENGINE_ACCEPTANCE_ENTRY_CARDINALITY_INVALID");
    expect(runner).toContain("document.querySelectorAll(selector).length===1");
    expect(runner).toContain("entryRoots.first()");
    expect(runner).not.toContain("force:true");
    expect(runner).not.toContain("createPilotAcceptanceToken");
  });

  it('runs shared E13 behavior before the expensive 14x3 visual matrix',()=>{
    const engine=workflow.indexOf('Prove shared E13 engine functionality before visual matrix');
    const matrix=workflow.indexOf('Run scoped Template Factory browser proof (acceptance requires reconciled 14x3)');
    expect(engine).toBeGreaterThan(0);
    expect(matrix).toBeGreaterThan(engine);
    expect(workflow).toContain('PRODUCT_OWNER_PREVIEW_URL: "${{ steps.runtime-preview.outputs.base-url }}/platform"');
    expect(workflow).toContain('PRODUCT_OWNER_ENGINE_FUNCTIONAL_ONLY: "true"');
    expect(workflow).toContain('TEMPLATE_HANDOFF_OUTPUT_DIR: artifacts/template-engine-functional-proof');
    expect(workflow).toContain('ENGINE_FUNCTIONAL_PROOF_FAILED=artifacts/template-engine-functional-proof/proof.json');
  });

  it('binds current proof identity and deployed runtime identity separately through E13 and Product Owner proof',()=>{
    expect(workflow).toContain('PRODUCT_OWNER_ENGINE_FUNCTIONAL_PROOF: artifacts/template-engine-functional-proof/proof.json');
    expect(runner).toContain("PRODUCT_OWNER_ENGINE_FUNCTIONAL_PROOF");
    expect(runner).toContain("checks.engineFunctionalProofPassed=contractOk&&engineOk&&commitOk&&runtimeCommitOk&&engineProof?.passed===true");
    expect(runner).toContain("engineProof?.sourceCommit===sourceCommit");
    expect(runner).toContain("engineProof?.runtimeSourceCommit===runtimeSourceCommit");
    expect(runner).toContain("PRODUCT_OWNER_RUNTIME_SOURCE_COMMIT");
    expect(workflow).toContain('PRODUCT_OWNER_RUNTIME_SOURCE_COMMIT: ${{ steps.runtime-preview.outputs.runtime-source-commit }}');
    expect(workflow).toContain("const sha='${{ steps.live-proof.outputs.runtime_sha }}'");
    expect(runner).toContain("ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN:proof artifact missing");
  });

  it('uses one canonical Preview resolver, rejects production/non-preview targets, and fails closed without an anchor',()=>{
    expect((workflow.match(/repos\\.listDeployments/g)??[])).toHaveLength(1);
    expect((workflow.match(/id: runtime-preview/g)??[])).toHaveLength(1);
    expect(workflow).not.toContain('id: product-owner-preview');
    expect(workflow).not.toContain('id: engine-functional-preview');
    expect(workflow).toContain("deployment.production_environment===true||environment==='production'");
    expect(workflow).toContain("deployment.production_environment!==true&&environment==='preview'");
    expect(workflow).toContain('Rejecting non-preview deployment');
    expect(workflow).toContain("const maxAttempts=runtimeMode==='CURRENT_HEAD'?90:1");
    expect(workflow).toContain('TEMPLATE_LIVE_RUNTIME_PREVIEW_ANCHOR_MISSING');
    expect(workflow).toContain('non-production Vercel Preview deployment for the Atlas-selected runtime source');
    expect(workflow).toContain('PRODUCT_OWNER_PREVIEW_URL: "${{ steps.runtime-preview.outputs.base-url }}/storefront-template-preview?');
  });

  it('does not replace the existing Product Owner visual handoff',()=>{
    expect(workflow).toContain('Prove Product Owner login journey on selected runtime');
    expect(workflow).toContain('TEMPLATE_HANDOFF_OUTPUT_DIR: artifacts/template-factory-handoff');
    expect(runner).toContain("shoporation.template-factory-product-owner-handoff.v2");
  });
});
