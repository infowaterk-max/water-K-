import {describe,expect,it} from 'vitest';
import {
  VX_BUILDER_CORE_CONTRACT,
  VX_SHOP_BUILDER_PROFILE,
  VX_SITE_BUILDER_PROFILE,
  assertVxBuilderProfile,
  clampVxGridSpan,
  isVxBuilderLibraryGroupAllowed,
  resolveVxResizeSpan,
} from '@/lib/builder/vx-builder-core';

describe('VX Builder Core',()=>{
  it('keeps one guarded structural contract for both product profiles',()=>{
    expect(VX_BUILDER_CORE_CONTRACT.hierarchy).toEqual(['page','section','container','component']);
    expect(VX_BUILDER_CORE_CONTRACT.gridColumns).toBe(12);
    expect(VX_BUILDER_CORE_CONTRACT.guardedFreedom.arbitraryAbsolutePositioning).toBe(false);
    expect(VX_BUILDER_CORE_CONTRACT.guardedFreedom.rawHtmlComposition).toBe(false);
    expect(VX_BUILDER_CORE_CONTRACT.guardedFreedom.viewportScopedOverrides).toBe(true);
    expect(VX_SHOP_BUILDER_PROFILE.productName).toBe('VX Shop Builder');
    expect(VX_SITE_BUILDER_PROFILE.productName).toBe('VX Site Builder');
  });

  it('keeps commerce in the Shop profile and out of the Site profile',()=>{
    expect(assertVxBuilderProfile(VX_SHOP_BUILDER_PROFILE)).toBe(VX_SHOP_BUILDER_PROFILE);
    expect(assertVxBuilderProfile(VX_SITE_BUILDER_PROFILE)).toBe(VX_SITE_BUILDER_PROFILE);
    expect(isVxBuilderLibraryGroupAllowed(VX_SHOP_BUILDER_PROFILE,'commerce')).toBe(true);
    expect(isVxBuilderLibraryGroupAllowed(VX_SITE_BUILDER_PROFILE,'commerce')).toBe(false);
    expect(()=>assertVxBuilderProfile({...VX_SITE_BUILDER_PROFILE,commerce:true,libraryGroups:[...VX_SITE_BUILDER_PROFILE.libraryGroups,'commerce']})).toThrow('VX_BUILDER_SITE_COMMERCE_PROFILE_FORBIDDEN');
  });

  it('normalizes direct resize into safe 12-column spans',()=>{
    expect(clampVxGridSpan(-8)).toBe(1);
    expect(clampVxGridSpan(1.49)).toBe(1);
    expect(clampVxGridSpan(7.6)).toBe(8);
    expect(clampVxGridSpan(99)).toBe(12);
    expect(clampVxGridSpan(Number.NaN,6)).toBe(6);
  });

  it('resolves pointer movement by grid columns and never escapes the grid',()=>{
    expect(resolveVxResizeSpan({startSpan:6,startX:100,currentX:260,pixelsPerColumn:80})).toBe(8);
    expect(resolveVxResizeSpan({startSpan:6,startX:100,currentX:-1000,pixelsPerColumn:80})).toBe(1);
    expect(resolveVxResizeSpan({startSpan:11,startX:100,currentX:1000,pixelsPerColumn:80})).toBe(12);
    expect(resolveVxResizeSpan({startSpan:5,startX:100,currentX:500,pixelsPerColumn:0})).toBe(5);
  });
});
