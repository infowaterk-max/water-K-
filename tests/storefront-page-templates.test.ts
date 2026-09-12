import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  applyStorefrontPageTemplate,
  createStorefrontBuilderPageTemplateLibrary,
  materializeStorefrontPageTemplateForNewPage,
  materializeStorefrontPageTemplateSource,
  STOREFRONT_PAGE_TEMPLATES_VERSION,
} from '@/lib/builder/storefront-page-templates';
import {
  getStorefrontGlobalStyleState,
  setStorefrontGlobalStyleState,
  STOREFRONT_GLOBAL_STYLES_VERSION,
} from '@/lib/builder/storefront-global-styles';
import {BEAUTY_LAB_HOME_PAGE,BEAUTY_LAB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/beauty-lab';

const registry=createStorefrontVisualBuilderComponentRegistry();
const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
const read=(path:string)=>readFileSync(path,'utf8');

describe('Storefront Page Templates v1',()=>{
  it('exposes the canonical page-preset hierarchy without a second page authority',()=>{
    const current={...structuredClone(BEAUTY_LAB_HOME_PAGE),pageKey:'merchant.home'};
    const library=createStorefrontBuilderPageTemplateLibrary(BEAUTY_LAB_TEMPLATE_PACKAGE,current);
    expect(library.version).toBe(STOREFRONT_PAGE_TEMPLATES_VERSION);
    expect(library.templateKey).toBe(BEAUTY_LAB_TEMPLATE_PACKAGE.manifest.templateKey);
    expect(library.pageTemplates).toHaveLength(BEAUTY_LAB_TEMPLATE_PACKAGE.pages.length);
    expect(library.pageTemplates.filter(item=>item.canApplyToCurrent)).toHaveLength(1);
    expect(new Set(library.pageTemplates.filter(item=>item.canCreateNew).map(item=>item.pageType))).toEqual(new Set(['content','blog-article','legal']));
  });

  it('applies a full canonical Page Preset while preserving current page identity and global brand styles',()=>{
    let current={...structuredClone(BEAUTY_LAB_HOME_PAGE),pageKey:'merchant.home',sections:[...BEAUTY_LAB_HOME_PAGE.sections].reverse()};
    current=setStorefrontGlobalStyleState(current,{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accent:'#123456',spacingScale:'airy'}});
    const library=createStorefrontBuilderPageTemplateLibrary(BEAUTY_LAB_TEMPLATE_PACKAGE,current);
    const preset=library.pageTemplates.find(item=>item.canApplyToCurrent)!;
    const source=materializeStorefrontPageTemplateSource(BEAUTY_LAB_TEMPLATE_PACKAGE,preset.presetId);
    const next=applyStorefrontPageTemplate({current,source,registry,capability});
    expect(next.pageKey).toBe('merchant.home');
    expect(next.pageType).toBe('home');
    expect(next.templateKey).toBe(current.templateKey);
    expect(next.templateVersion).toBe(current.templateVersion);
    expect(next.sections).toEqual(BEAUTY_LAB_HOME_PAGE.sections);
    expect(next.sections).not.toBe(BEAUTY_LAB_HOME_PAGE.sections);
    expect(getStorefrontGlobalStyleState(next).tokens).toMatchObject({accent:'#123456',spacingScale:'airy'});
  });

  it('rejects cross-page-type replacement and cross-template identity changes',()=>{
    const current={...structuredClone(BEAUTY_LAB_HOME_PAGE),pageKey:'merchant.home'};
    const library=createStorefrontBuilderPageTemplateLibrary(BEAUTY_LAB_TEMPLATE_PACKAGE,current);
    const contentPreset=library.pageTemplates.find(item=>item.pageType==='content')!;
    const contentSource=materializeStorefrontPageTemplateSource(BEAUTY_LAB_TEMPLATE_PACKAGE,contentPreset.presetId);
    expect(()=>applyStorefrontPageTemplate({current,source:contentSource,registry,capability})).toThrow('STOREFRONT_PAGE_TEMPLATE_PAGE_TYPE_MISMATCH');
    const wrongTemplate={...structuredClone(BEAUTY_LAB_HOME_PAGE),templateKey:'other.template'};
    expect(()=>applyStorefrontPageTemplate({current,source:wrongTemplate,registry,capability})).toThrow('STOREFRONT_PAGE_TEMPLATE_TEMPLATE_MISMATCH');
  });

  it('creates new repeatable Page Schema drafts from canonical presets and keeps global styles',()=>{
    let reference={...structuredClone(BEAUTY_LAB_HOME_PAGE),pageKey:'merchant.home'};
    reference=setStorefrontGlobalStyleState(reference,{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{primary:'#112233',radiusScale:'rounded'}});
    const library=createStorefrontBuilderPageTemplateLibrary(BEAUTY_LAB_TEMPLATE_PACKAGE,reference);
    const legalPreset=library.pageTemplates.find(item=>item.pageType==='legal')!;
    const legalSource=materializeStorefrontPageTemplateSource(BEAUTY_LAB_TEMPLATE_PACKAGE,legalPreset.presetId);
    const created=materializeStorefrontPageTemplateForNewPage({reference,source:legalSource,targetPageKey:'legal.privacy',registry,capability});
    expect(created.pageKey).toBe('legal.privacy');
    expect(created.pageType).toBe('legal');
    expect(getStorefrontGlobalStyleState(created).tokens).toMatchObject({primary:'#112233',radiusScale:'rounded'});
    const homePreset=library.pageTemplates.find(item=>item.pageType==='home')!;
    const homeSource=materializeStorefrontPageTemplateSource(BEAUTY_LAB_TEMPLATE_PACKAGE,homePreset.presetId);
    expect(()=>materializeStorefrontPageTemplateForNewPage({reference,source:homeSource,targetPageKey:'home.duplicate',registry,capability})).toThrow('STOREFRONT_PAGE_TEMPLATE_REPEATABLE_TYPE_REQUIRED');
  });

  it('keeps creation tenant-scoped, draft-only and on the existing page persistence authority',()=>{
    const action=read('src/app/admin/tartalom/builder/page-template-actions.ts');
    expect(action).toContain("requireCurrentStoreContext('store.manage')");
    expect(action).toContain('getCurrentStorefrontPageState(targetPageKey)');
    expect(action).toContain('STOREFRONT_PAGE_TEMPLATE_TARGET_EXISTS');
    expect(action).toContain('saveCurrentStorefrontPageDraft');
    expect(action).toContain('expectedDraftRevision:null');
    expect(action).not.toContain('publishCurrentStorefrontPage');
    expect(action).not.toMatch(/from\(['\"](?:products|orders|customers|variants|collections)['\"]\).*\.(?:insert|update|delete)/s);
  });

  it('wires Page Templates into the existing Builder preset surface without replacing Template Library',()=>{
    const panel=read('src/components/admin/storefront-page-templates-panel.tsx');
    const host=read('src/components/admin/storefront-saved-blocks-panel.tsx');
    expect(panel).toContain('data-storefront-page-templates-v1');
    expect(panel).toContain('Teljes oldal alkalmazása');
    expect(panel).toContain('Új draft oldal létrehozása');
    expect(panel).toContain('getVisualBuilderPageTemplateSourceAction');
    expect(panel).toContain('createVisualBuilderPageFromTemplateAction');
    expect(host).toContain('StorefrontPageTemplatesPanel');
    expect(host.indexOf('StorefrontPageTemplatesPanel')).toBeLessThan(host.indexOf('data-storefront-preset-library-v1'));
  });
});
