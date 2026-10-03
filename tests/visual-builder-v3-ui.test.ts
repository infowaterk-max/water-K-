import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('Visual Builder v3 Publish Readiness adoption',()=>{
  it('keeps V3 as the active Builder surface and consumes the canonical readiness contract',()=>{
    const route=readFileSync('src/app/admin/tartalom/builder/page.tsx','utf8');
    const source=readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
    expect(route).toContain('StorefrontVisualBuilderV3');
    expect(route).not.toContain('StorefrontVisualBuilderProduction');
    expect(source).toContain("from '@/lib/builder/storefront-publish-readiness'");
    expect(source).toContain('inspectStorefrontPublishReadiness({document,pages,draft:{dirty,draftRevision}})');
    expect(source).toContain("readiness.decision==='UNKNOWN'");
    expect(source).toContain('data-readiness-state={category.state}');
    expect(source).toContain('readinessFindingDetail');
  });

  it('removes the legacy Fidelity-only publish checklist instead of keeping a parallel readiness authority',()=>{
    const source=readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
    expect(source).not.toContain('const viewportStatus=');
    expect(source).not.toContain("const readiness=[{label:'Mentett piszkozat'");
    expect(source).not.toContain('statusFromIssues(imageIssues)');
    expect(source).not.toContain('StorefrontFidelityInspectorStatus');
    expect(source).not.toContain('const statusLabel=');
  });

  it('fails closed: UNKNOWN and BLOCK cannot enable publish, while PASS may proceed subject to draft guards',()=>{
    const source=readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
    expect(source).toContain("disabled={busy||dirty||!draftRevision||readiness.decision!=='PASS'} onClick={publish}");
    expect(source).not.toContain('disabled={busy||dirty||!draftRevision||readinessBlockers>0} onClick={publish}');
    expect(source).toContain("readiness.decision==='BLOCK'?'Még van blokkoló pont':readiness.decision==='UNKNOWN'?'Nem teljesen igazolt'");
    expect(source).toContain('onClick={publish}');
  });

  it('renders Core explanation/provenance without inventing external evidence or pixel-to-repair causality',()=>{
    const source=readFileSync('src/components/admin/storefront-visual-builder-v3.tsx','utf8');
    expect(source).toContain('finding.reason');
    expect(source).toContain('finding.evidence.authority');
    expect(source).toContain('finding.evidence.source');
    expect(source).toContain('finding.repairability');
    expect(source).toContain('finding.location.pageType');
    expect(source).toContain('finding.location.viewport');
    expect(source).toContain('finding.location.nodeId');
    expect(source).toContain('finding.location.path');
    expect(source).toContain('finding.location.href');
    expect(source).not.toContain('external:{');
    expect(source).not.toContain('peakRegion');
    expect(source).not.toContain('mismatchRatio');
    expect(source).not.toContain('structuredCause');
  });
});
