import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {writeStorefrontFidelityMetadata} from '@/lib/builder/storefront-fidelity-engine';
import {
  canUseStorefrontFidelityCapability,
  getStorefrontBuilderEditMode,
  inspectStorefrontFidelityBuilder,
  resolveStorefrontBuilderEditCapabilities,
} from '@/lib/builder/storefront-fidelity-inspector';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'inspector.home',
  pageType:'home',
  templateKey:'reference.inspector',
  templateVersion:1,
  sections:[
    {id:'hero',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'l'},children:[
      {id:'image',componentKey:'content.image',componentVersion:1,config:{src:'/hero.jpg',alt:'Hero',width:1200,height:800,fit:'cover',loading:'eager',radius:'none'}},
    ]},
  ],
});

describe('Visual Builder fidelity inspector',()=>{
  it('defaults to the safe normal mode',()=>{
    const source=page();
    expect(getStorefrontBuilderEditMode(source)).toBe('normal');
    expect(canUseStorefrontFidelityCapability(source,'content')).toBe(true);
    expect(canUseStorefrontFidelityCapability(source,'responsive-order')).toBe(false);
    expect(canUseStorefrontFidelityCapability(source,'raw-allowlisted-style')).toBe(false);
  });

  it('makes edit-mode capabilities cumulative rather than replacing safer capabilities',()=>{
    expect(resolveStorefrontBuilderEditCapabilities('advanced')).toEqual(expect.arrayContaining(['content','media','responsive-grid','responsive-order','typography']));
    expect(resolveStorefrontBuilderEditCapabilities('expert')).toEqual(expect.arrayContaining(['content','responsive-order','free-section-geometry','raw-allowlisted-style']));
  });

  it('summarizes mode, guard and performance for Builder UI without changing the document',()=>{
    const source=writeStorefrontFidelityMetadata(page(),{
      editMode:'advanced',
      designGuard:{mode:'warn',presetId:'beauty.reference.home',baselineVersion:2,protectedNodeIds:['hero']},
    });
    const before=structuredClone(source);
    const inspected=inspectStorefrontFidelityBuilder(source);
    expect(inspected.editMode).toBe('advanced');
    expect(inspected.designGuard).toEqual({mode:'warn',presetId:'beauty.reference.home',baselineVersion:2,protectedNodeCount:1});
    expect(inspected.performance.status).toBe('ok');
    expect(inspected.performance.metrics.eagerImageCount).toBe(1);
    expect(source).toEqual(before);
  });

  it('surfaces hard performance violations as errors for release-facing UI',()=>{
    const source=page();
    source.sections=Array.from({length:37},(_,index)=>({id:`section-${index}`,componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'none'}}));
    const inspected=inspectStorefrontFidelityBuilder(source);
    expect(inspected.performance.status).toBe('error');
    expect(inspected.performance.ok).toBe(false);
    expect(inspected.performance.issues.some(issue=>issue.metric==='sectionCount'&&issue.severity==='error')).toBe(true);
  });
});
