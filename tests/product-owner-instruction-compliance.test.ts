import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import {createStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-preview-demo';
import {applyAuthoredTemplatePreviewFallbacks} from '@/lib/builder/storefront-template-preview-canonical';

const page=(type:string)=>PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===type)!;

describe('Product Owner instruction compliance',()=>{
  it('blocks handoff unless the active instruction ledger evidence is satisfied',()=>{
    expect(()=>execFileSync(process.execPath,['scripts/shoperation-instruction-compliance.mjs','--check'],{stdio:'pipe'})).not.toThrow();
    const ledger=JSON.parse(readFileSync('quality/development/instruction-ledger.v1.json','utf8'));
    const plan=JSON.parse(readFileSync('quality/development/active-plan.json','utf8'));
    expect(ledger.taskId).toBe(plan.taskId);
    expect(ledger.instructions.length).toBeGreaterThanOrEqual(3);
    for(const instruction of ledger.instructions){
      expect(['implemented','accepted-frozen']).toContain(instruction.state);
      expect(instruction.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(instruction.checks.length).toBeGreaterThan(0);
      expect(instruction.regressionTests.length).toBeGreaterThan(0);
    }
  });

  it('keeps real Playroom preview description and checkout totals when authored fallbacks are empty strings',()=>{
    const productPage=page('product');
    const productContext=createStorefrontTemplatePreviewBindingContext({template:PLAYROOM_V20_TEMPLATE_PACKAGE,page:productPage});
    const productResolved=applyAuthoredTemplatePreviewFallbacks({page:productPage,context:productContext}) as any;
    expect(productResolved.product.description).toMatch(/kooperatív|arcade|kaland|arénajáték|műfaj/i);
    expect(productResolved.product.description.trim().length).toBeGreaterThan(40);

    const checkoutPage=page('checkout');
    const checkoutContext=createStorefrontTemplatePreviewBindingContext({template:PLAYROOM_V20_TEMPLATE_PACKAGE,page:checkoutPage});
    const checkoutResolved=applyAuthoredTemplatePreviewFallbacks({page:checkoutPage,context:checkoutContext}) as any;
    expect(checkoutResolved.cart.lines.length).toBeGreaterThan(0);
    expect(checkoutResolved.cart.subtotal).toBeGreaterThan(0);
    expect(checkoutResolved.cart.total).toBeGreaterThan(0);
  });

  it('records this failure class as a global Known Failure with instruction-to-evidence authority',()=>{
    const knowledge=JSON.parse(readFileSync('quality/knowledge/shoperation-quality-knowledge.v1.json','utf8'));
    expect(knowledge.authorityRules.some((item:any)=>item.id==='SQ-AUTH-021')).toBe(true);
    expect(knowledge.knownFailures.some((item:any)=>item.id==='SQ-KF-025')).toBe(true);
    expect(knowledge.globalBaselineFailureIds).toContain('SQ-KF-025');
  });
});
