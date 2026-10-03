import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const source=()=>readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
const route=()=>readFileSync('src/app/admin/tartalom/builder/page.tsx','utf8');

describe('Visual Builder v3 Smart Auto-Fix adoption',()=>{
  it('keeps V3 active and consumes the canonical Smart Auto-Fix Core',()=>{
    const v3=source();
    expect(route()).toContain('StorefrontVisualBuilderV3');
    expect(v3).toContain("from '@/lib/builder/storefront-smart-autofix'");
    expect(v3).toContain('planStorefrontSmartAutoFix({document,finding})');
    expect(v3).toContain('applyStorefrontSmartAutoFixPlan({document,plan:autoFixPlan,registry:componentRegistry,capability})');
    expect(v3).toContain('data-smart-autofix');
  });

  it('exposes Auto-Fix per readiness finding rather than only the category lead',()=>{
    const v3=source();
    expect(v3).toContain('category.findings.map(finding=>');
    expect(v3).toContain('data-readiness-finding={finding.id}');
    expect(v3).toContain('onClick={()=>planAutoFix(finding)}>Javítási terv');
    expect(v3).toContain("disabled={busy||activeRepair?.status!=='READY'} onClick={applyAutoFix}>Alkalmazás");
  });

  it('separates preview planning from explicit READY-only apply',()=>{
    const v3=source();
    const planner=v3.slice(v3.indexOf('const planAutoFix='),v3.indexOf('const applyAutoFix='));
    expect(planner).toContain('planStorefrontSmartAutoFix');
    expect(planner).toContain('setAutoFixPlan(planned)');
    expect(planner).not.toContain('applyStorefrontSmartAutoFixPlan');
    expect(v3).toContain("if(!autoFixPlan||autoFixPlan.status!=='READY')return");
  });

  it('applies one successful repair as one ordinary Builder history commit and invalidates stale previews',()=>{
    const v3=source();
    const apply=v3.slice(v3.indexOf('const applyAutoFix='),v3.indexOf('const move='));
    expect(apply).toContain('applyStorefrontSmartAutoFixPlan');
    expect(apply.match(/commitDocument\(result\.document\)/g)).toHaveLength(1);
    expect(v3).toContain('setAutoFixPlan(null)');
    expect(v3).toContain('useEffect(()=>setAutoFixPlan(null),[history?.present])');
  });

  it('does not connect Auto-Fix UI to AI, Smart Intent parsing or automatic publish',()=>{
    const v3=source();
    const autoFix=v3.slice(v3.indexOf('const planAutoFix='),v3.indexOf('const move='));
    expect(autoFix).not.toContain('planStorefrontSmartIntent');
    expect(autoFix).not.toContain('publishVisualBuilderPageAction');
    expect(autoFix).not.toContain('saveVisualBuilderDraftAction');
    expect(autoFix).not.toContain('storefront-ai-generator');
  });
});
