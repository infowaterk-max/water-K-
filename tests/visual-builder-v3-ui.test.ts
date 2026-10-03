import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('Visual Builder v3 Publish Readiness adoption',()=>{
  it('keeps V3 as the active Builder surface and consumes the canonical readiness contract',()=>{
    const route=readFileSync('src/app/admin/tartalom/builder/page.tsx','utf8');
    const source=readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
    expect(route).toContain('StorefrontVisualBuilderV3');
    expect(route).not.toContain('StorefrontVisualBuilderProduction');
    expect(source).toContain("from '@/lib/builder/storefront-publish-readiness'");
    expect(source).toContain('inspectStorefrontPublishReadiness({');
    expect(source).toContain("readiness.decision==='UNKNOWN'");
    expect(source).toContain('category.state');
    expect(source).toContain('readinessFindingDetail');
  });

  it('removes the old fidelity-only checklist and keeps the decision contract separate from publishing',()=>{
    const source=readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
    expect(source).not.toContain("const viewportStatus=");
    expect(source).not.toContain("const readiness=[{label:'Mentett piszkozat'");
    expect(source).not.toContain('statusFromIssues(imageIssues)');
    expect(source).toContain('readinessBlockers>0');
    expect(source).toContain('onClick={publish}');
    expect(source).not.toContain("readiness.decision==='PASS'&&publish");
  });
});
