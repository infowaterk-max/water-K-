import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_GLOBAL_STYLES_METADATA_KEY,
  STOREFRONT_GLOBAL_STYLES_VERSION,
  getStorefrontGlobalStyleState,
  parseStorefrontGlobalStyleState,
  resolveStorefrontGlobalStyleCssVariables,
  setStorefrontGlobalStyleState,
  storefrontGlobalStyleStatesEqual,
} from '@/lib/builder/storefront-global-styles';
import {assertSafeStorefrontFidelityDocument} from '@/lib/builder/storefront-fidelity-security';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const read=(path:string)=>readFileSync(path,'utf8');
const page=():StorefrontPageDocument=>({schemaVersion:1,pageKey:'home.main',pageType:'home',templateKey:'test.template',templateVersion:1,metadata:{source:'test'},sections:[]});

describe('Storefront Global Design Tokens / Global Styles v1',()=>{
  it('uses one versioned Page Schema metadata contract',()=>{
    expect(STOREFRONT_GLOBAL_STYLES_VERSION).toBe('shoporation.storefront-global-styles.v1');
    expect(STOREFRONT_GLOBAL_STYLES_METADATA_KEY).toBe('shoporationGlobalStyles');
    const document=setStorefrontGlobalStyleState(page(),{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accent:'#11aa88',accentSecondary:'#3355ff',accentTertiary:'#bbdd44'}});
    expect(getStorefrontGlobalStyleState(document).tokens).toMatchObject({accent:'#11aa88',accentSecondary:'#3355ff',accentTertiary:'#bbdd44'});
    expect(document.metadata?.source).toBe('test');
    expect(document.sections).toEqual([]);
  });

  it('fails closed on arbitrary token keys and non-hex colors',()=>{
    expect(()=>parseStorefrontGlobalStyleState({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{rawCss:'body{display:none}'}})).toThrow('STOREFRONT_GLOBAL_STYLES_TOKEN_UNKNOWN');
    expect(()=>parseStorefrontGlobalStyleState({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accent:'red'}})).toThrow('STOREFRONT_GLOBAL_STYLES_COLOR_INVALID');
    expect(()=>parseStorefrontGlobalStyleState({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accentSecondary:'blue'}})).toThrow('STOREFRONT_GLOBAL_STYLES_COLOR_INVALID');
    expect(()=>parseStorefrontGlobalStyleState({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{headingFont:'https://evil.test/font.woff2'}})).toThrow('STOREFRONT_GLOBAL_STYLES_HEADING_FONT_INVALID');
  });

  it('accepts controlled font, spacing and radius presets only',()=>{
    const state=parseStorefrontGlobalStyleState({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{headingFont:'editorial-serif',bodyFont:'system-sans',spacingScale:'airy',radiusScale:'rounded'}});
    expect(state.tokens).toMatchObject({headingFont:'editorial-serif',bodyFont:'system-sans',spacingScale:'airy',radiusScale:'rounded'});
    expect(()=>parseStorefrontGlobalStyleState({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{spacingScale:'13px'}})).toThrow('STOREFRONT_GLOBAL_STYLES_SPACING_INVALID');
    expect(()=>parseStorefrontGlobalStyleState({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{radiusScale:'9999px'}})).toThrow('STOREFRONT_GLOBAL_STYLES_RADIUS_INVALID');
  });

  it('maps the controlled palette to the shared storefront CSS token vocabulary',()=>{
    const document=setStorefrontGlobalStyleState(page(),{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{background:'#112233',accent:'#44aa77',accentSecondary:'#5566ee',accentTertiary:'#bbee44',headingFont:'editorial-serif',bodyFont:'humanist-sans',spacingScale:'compact',radiusScale:'sharp'}});
    const css=resolveStorefrontGlobalStyleCssVariables(document);
    expect(css['--shoporation-color-background']).toBe('#112233');
    expect(css['--shoporation-color-accent']).toBe('#44aa77');
    expect(css['--shoporation-color-accent-secondary']).toBe('#5566ee');
    expect(css['--shoporation-color-accent-tertiary']).toBe('#bbee44');
    expect(css['--shoporation-heading-font']).toContain('Georgia');
    expect(css['--shoporation-body-font']).toContain('Trebuchet');
    expect(css['--shoporation-space-m']).toBe('1rem');
    expect(css['--shoporation-radius-m']).toBe('4px');
  });

  it('compares normalized global style states and preserves business/page content',()=>{
    const original=page();
    original.sections=[{id:'hero',componentKey:'content.heading',componentVersion:1,config:{text:'Merchant title'},bindings:{text:{path:'content.hero.title',fallback:'Merchant title'}}}];
    const state={version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accent:'#AABBCC'}} as const;
    const styled=setStorefrontGlobalStyleState(original,state);
    expect(styled.sections[0]?.config.text).toBe('Merchant title');
    expect(styled.sections[0]?.bindings?.text?.path).toBe('content.hero.title');
    expect(storefrontGlobalStyleStatesEqual(getStorefrontGlobalStyleState(styled),{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accent:'#aabbcc'}})).toBe(true);
  });

  it('routes global-style validation through the existing fidelity security save gate',()=>{
    const document=page();
    document.metadata={shoporationGlobalStyles:{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{javascript:'alert(1)'}}};
    expect(()=>assertSafeStorefrontFidelityDocument(document)).toThrow('STOREFRONT_GLOBAL_STYLES_TOKEN_UNKNOWN');
  });

  it('renders global overrides through the common runtime instead of a second renderer',()=>{
    const runtime=read('src/components/builder/storefront-runtime-renderer.tsx');
    expect(runtime).toContain('resolveStorefrontGlobalStyleCssVariables');
    expect(runtime).toContain('data-storefront-global-styles-v1');
    expect(runtime).toContain("fontFamily:'var(--shoporation-body-font, Arial, sans-serif)'");
    expect(runtime).not.toContain('dangerouslySetInnerHTML');
  });

  it('wires Normal-mode Builder controls into the existing working-copy apply path',()=>{
    const settings=read('src/components/admin/storefront-fidelity-settings.tsx');
    const controls=read('src/components/admin/storefront-global-styles-controls.tsx');
    expect(settings).toContain('<StorefrontGlobalStylesControls document={document} onApply={onApply}/>');
    expect(controls).toContain('data-storefront-global-styles-v1');
    expect(controls).toContain('Másodlagos akcentus');
    expect(controls).toContain('Harmadlagos akcentus');
    expect(controls).toContain('Sablon alapértékek visszaállítása');
    expect(controls).not.toMatch(/textarea|raw css|dangerouslySetInnerHTML/i);
  });

  it('keeps one atomic draft-only database operation and forward-hardens its palette allowlist',()=>{
    const original=read('supabase/migrations/20260913000500_storefront_global_styles_v1.sql');
    const palette=read('supabase/migrations/20260913193000_storefront_global_styles_accent_palette.sql');
    expect(original).toContain('create or replace function public.save_storefront_global_style_drafts_v1');
    expect(palette).toContain('create or replace function public.save_storefront_global_style_drafts_v1');
    expect(palette).toContain("'accentSecondary'");
    expect(palette).toContain("'accentTertiary'");
    expect(palette).toContain('public.save_storefront_page_draft_v1(');
    expect(palette).toContain("'storefront_page_drafts_only'");
    expect(palette).toContain('public.can_manage_storefront');
    expect(palette).toContain("v_item->'document'->'metadata'->'shoporationGlobalStyles' is distinct from p_global_styles");
    expect(palette).not.toContain('publish_storefront_page_v1');
  });

  it('only fans out from the normal Save action when global style state changed',()=>{
    const actions=read('src/app/admin/tartalom/builder/actions.ts');
    expect(actions).toContain('storefrontGlobalStyleStatesEqual(previousGlobalStyles,nextGlobalStyles)');
    expect(actions).toContain('saveCurrentStorefrontGlobalStyleDrafts');
    expect(actions).toContain('saveCurrentStorefrontPageDraft');
  });

  it('preserves merchant global style overrides across template and AI materialization',()=>{
    const persistence=read('src/lib/builder/storefront-template-persistence.ts');
    expect(persistence).toContain('getCurrentStorefrontGlobalStyleState');
    expect(persistence).toContain('setStorefrontGlobalStyleState(page.document,globalStyles)');
    const ai=read('src/lib/builder/storefront-ai-generator-server.ts');
    expect(ai).toContain('saveCurrentStorefrontTemplateDraftPlan');
  });
});
