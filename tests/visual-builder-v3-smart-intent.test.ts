import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const source=()=>readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
const route=()=>readFileSync('src/app/admin/tartalom/builder/page.tsx','utf8');

describe('Visual Builder v3 Smart Intent adoption',()=>{
  it('keeps V3 active and consumes the canonical Smart Intent Core',()=>{
    const v3=source();
    expect(route()).toContain('StorefrontVisualBuilderV3');
    expect(v3).toContain("from '@/lib/builder/storefront-smart-intent'");
    expect(v3).toContain('planStorefrontSmartIntent({document,rawText:smartIntentText,nodeId:selected.id,viewport,registry:componentRegistry,capability})');
    expect(v3).toContain('applyStorefrontSmartIntentPlan({document,plan:smartIntentPlan,registry:componentRegistry,capability})');
    expect(v3).toContain('data-smart-intent');
  });

  it('separates plan from apply and permits apply only for READY plans',()=>{
    const v3=source();
    expect(v3).toContain('Előbb terv készül, csak utána alkalmazható.');
    expect(v3).toContain('onClick={planSmartIntent}>Értelmezés');
    expect(v3).toContain("disabled={busy||smartIntentPlan?.status!=='READY'} onClick={applySmartIntent}>Alkalmazás");
    expect(v3).toContain("onChange={event=>{setSmartIntentText(event.target.value);setSmartIntentPlan(null);}}");
    expect(v3).not.toContain('onChange={event=>applySmartIntent');
  });

  it('applies a READY plan as one ordinary Builder history document commit',()=>{
    const v3=source();
    expect(v3).toContain('const applySmartIntent=()=>');
    expect(v3).toContain('commitDocument(result.document)');
    expect(v3).toContain('pushStorefrontBuilderHistory');
    expect(v3).toContain('setSmartIntentPlan(null)');
  });

  it('does not connect Smart Intent to AI generation or diagnostics-driven repair',()=>{
    const v3=source();
    expect(v3).not.toContain('generateCurrentStorefrontWithAi');
    expect(v3).not.toContain('storefront-ai-generator');
    expect(v3).not.toContain('planStorefrontSmartIntent({document,readiness');
    expect(v3).not.toContain('planStorefrontSmartIntent({document,visualDiff');
    expect(v3).toContain('pl. legyen nagyobb a kép mobilon');
  });
});
