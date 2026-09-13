import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {createStorefrontGuidedVisualComponentRegistry} from '@/lib/builder/storefront-guided-visual';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {PLANS} from '@/lib/plans/catalog';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Beauty Lab canonical template upgrade',()=>{
  const template=getStorefrontTemplatePackage('beauty.beauty-lab');
  if(!template)throw new Error('BEAUTY_LAB_CANONICAL_TEMPLATE_MISSING');

  it('publishes recovered Beauty Lab as a real v2 catalog package across every page preset',()=>{
    expect(template.manifest.templateVersion).toBe(2);
    expect(new Set(template.pages.map(page=>page.templateVersion))).toEqual(new Set([2]));
    expect(template.pages.every(page=>page.metadata?.canonicalTemplateVersion===2)).toBe(true);
  });

  it('plans persisted Beauty Lab v1 drafts as an explicit draft-only upgrade',()=>{
    const plan=planStorefrontTemplateInstallation({
      template,
      componentRegistry:createStorefrontGuidedVisualComponentRegistry(),
      capability:{plan:'alap',features:PLANS.alap.features},
      existingPages:template.pages.map((page,index)=>({
        pageKey:page.pageKey,
        pageType:page.pageType,
        draftRevision:index+1,
        draftTemplateKey:'beauty.beauty-lab',
        draftTemplateVersion:1,
      })),
    });
    expect(plan.mode).toBe('upgrade');
    expect(plan.templateVersion).toBe(2);
    expect(plan.pages.every(page=>page.document.templateVersion===2)).toBe(true);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false});
  });

  it('exposes a deliberate Builder upgrade confirmation instead of silently replacing persisted drafts',()=>{
    const library=read('src/components/admin/storefront-template-library.tsx');
    const page=read('src/app/admin/tartalom/builder/page.tsx');
    expect(page).toContain('currentTemplateVersion={document?.templateVersion??null}');
    expect(library).toContain('Sablon frissítése');
    expect(library).toContain('SABLONFRISSÍTÉS');
    expect(library).toContain('A publikált storefront érintetlen marad');
    expect(library).toContain('A jelenlegi draft oldalak szerkesztéseit a ');
    expect(library).toContain('sablonfrissítés');
    expect(library).toContain('felülírhatja');
    expect(library).toContain('template.templateVersion>currentTemplateVersion');
  });
});
