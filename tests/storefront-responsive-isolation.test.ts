import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {resolveStorefrontVisualStyle,resolveStorefrontVisualStyleLegacyCascade} from '@/lib/builder/storefront-visual-style';
import {setStorefrontNodeStyleSlot,setStorefrontNodeViewportStyle} from '@/lib/builder/storefront-fidelity-builder-operations';
import {resolveStorefrontStyleSlot} from '@/lib/builder/storefront-fidelity-engine';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import {
  assertStorefrontViewportIsolation,
  collectStorefrontEffectiveVisualState,
  materializeStorefrontPageResponsiveStyles,
  materializeStorefrontTemplateResponsiveStyles,
  listUnmaterializedStorefrontVisualSurfaces,
  ensureStorefrontResponsiveAuthority,
  hasStorefrontResponsiveAuthorityV2,
} from '@/lib/builder/storefront-responsive-isolation';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'responsive-isolation.home',
  pageType:'home',
  templateKey:'test.responsive-isolation',
  templateVersion:1,
  sections:[{
    id:'hero',
    componentKey:'layout.stack',
    componentVersion:1,
    config:{
      direction:'vertical',
      gap:'m',
      align:'stretch',
      justify:'start',
      style:{
        base:{minHeight:'12rem',padding:'1rem'},
        desktop:{minHeight:'20rem'},
        tablet:{padding:'.8rem'},
        mobile:{padding:'.6rem'},
      },
      styleSlots:{
        card:{
          base:{minHeight:'4rem'},
          desktop:{minHeight:'6rem'},
          tablet:{minHeight:'5rem'},
          mobile:{minHeight:'4rem'},
        },
      },
    },
  }],
});

describe('Storefront responsive isolation foundation',()=>{
  it('migrates historical cascading templates into explicit viewport snapshots without visual loss',()=>{
    const before=page();
    const sourceStyle=before.sections[0]!.config.style;
    expect(resolveStorefrontVisualStyleLegacyCascade(sourceStyle,'desktop').minHeight).toBe('20rem');
    expect(resolveStorefrontVisualStyleLegacyCascade(sourceStyle,'tablet').minHeight).toBe('20rem');
    expect(resolveStorefrontVisualStyleLegacyCascade(sourceStyle,'mobile').minHeight).toBe('20rem');

    const after=materializeStorefrontPageResponsiveStyles(before);
    expect(hasStorefrontResponsiveAuthorityV2(before)).toBe(false);
    expect(hasStorefrontResponsiveAuthorityV2(after)).toBe(true);
    expect(listUnmaterializedStorefrontVisualSurfaces(after)).toEqual([]);
    const hero=after.sections[0]!;
    const style=hero.config.style as Record<string,Record<string,unknown>>;
    expect(style.desktop.minHeight).toBe('20rem');
    expect(style.desktop.padding).toBeUndefined();
    expect(style.tablet.minHeight).toBe('20rem');
    expect(style.tablet.padding).toBe('.8rem');
    expect(style.mobile.minHeight).toBe('20rem');
    expect(style.mobile.padding).toBe('.6rem');
    for(const viewport of ['desktop','tablet','mobile'] as const){
      expect(resolveStorefrontVisualStyle(hero.config.style,viewport))
        .toEqual(resolveStorefrontVisualStyleLegacyCascade(sourceStyle,viewport));
    }

    const card=(hero.config.styleSlots as Record<string,Record<string,Record<string,unknown>>>).card;
    expect(card.desktop.minHeight).toBe('6rem');
    expect(card.tablet.minHeight).toBe('5rem');
    expect(card.mobile.minHeight).toBeUndefined();
    expect(resolveStorefrontVisualStyle(card,'mobile').minHeight).toBe('4rem');
  });

  it('never runs legacy cascade materialization over an already-v2 canonical template',()=>{
    const before=structuredClone(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const after=materializeStorefrontTemplateResponsiveStyles(before);
    expect(after).toEqual(before);
    expect(after).not.toBe(before);
  });

  it('protects historical persisted pages at Runtime read without mutating the stored source',()=>{
    const legacy=page();
    const migrated=ensureStorefrontResponsiveAuthority(legacy);
    expect(hasStorefrontResponsiveAuthorityV2(legacy)).toBe(false);
    expect(hasStorefrontResponsiveAuthorityV2(migrated)).toBe(true);
    for(const viewport of ['desktop','tablet','mobile'] as const){
      expect(resolveStorefrontVisualStyle(migrated.sections[0]!.config.style,viewport))
        .toEqual(resolveStorefrontVisualStyleLegacyCascade(legacy.sections[0]!.config.style,viewport));
    }
    expect(legacy.metadata?.responsiveAuthorityVersion).toBeUndefined();
  });

  it('never re-materializes an already-v2 Builder document after a viewport override is cleared',()=>{
    const current=materializeStorefrontPageResponsiveStyles(page());
    let edited=setStorefrontNodeViewportStyle(current,'hero','tablet',{});
    const before=structuredClone(edited);
    edited=ensureStorefrontResponsiveAuthority(edited);
    expect(edited).toEqual(before);
    expect(resolveStorefrontVisualStyle(edited.sections[0]!.config.style,'tablet')).toEqual({minHeight:'12rem',padding:'1rem'});
  });

  it('makes viewport edits intrinsically isolated under base + exact viewport semantics',()=>{
    const before=page();
    const changed=structuredClone(before);
    const style=changed.sections[0]!.config.style as Record<string,Record<string,unknown>>;
    style.desktop={...style.desktop,minHeight:'24rem'};

    expect(resolveStorefrontVisualStyle(changed.sections[0]!.config.style,'desktop').minHeight).toBe('24rem');
    expect(resolveStorefrontVisualStyle(changed.sections[0]!.config.style,'tablet').minHeight).toBe('12rem');
    expect(resolveStorefrontVisualStyle(changed.sections[0]!.config.style,'mobile').minHeight).toBe('12rem');
    expect(()=>assertStorefrontViewportIsolation({before,after:changed,allowedViewports:['desktop'],label:'desktop-edit'})).not.toThrow();
  });

  it('preserves Builder reset-to-base semantics instead of re-materializing cleared overrides on save',()=>{
    const frozen=materializeStorefrontPageResponsiveStyles(page());
    let reset=setStorefrontNodeViewportStyle(frozen,'hero','tablet',{});
    expect(resolveStorefrontVisualStyle(reset.sections[0]!.config.style,'tablet')).toEqual({minHeight:'12rem',padding:'1rem'});

    reset=setStorefrontNodeStyleSlot(reset,'hero','card','mobile',{});
    expect(resolveStorefrontStyleSlot(reset.sections[0]!.config.styleSlots,'card','mobile')).toEqual({minHeight:'4rem'});

    const persistence=readFileSync('src/lib/builder/storefront-persistence.ts','utf8');
    expect(persistence).not.toContain('materializeStorefrontPageResponsiveStyles(input.document)');
    expect(persistence).toContain('p_document:input.document');
    expect(persistence).toContain('hashStorefrontPageDocument(input.document)');
  });

  it('materializes old source packages at migration boundaries and protects old persisted reads in memory',()=>{
    const catalog=readFileSync('src/lib/builder/storefront-template-catalog.ts','utf8');
    const renderer=readFileSync('src/components/builder/storefront-runtime-renderer.tsx','utf8');
    const builderPage=readFileSync('src/app/admin/tartalom/builder/page.tsx','utf8');
    expect(catalog).toContain('materializeStorefrontTemplateResponsiveStyles(runtimeNormalized)');
    expect(renderer).toContain('ensureStorefrontResponsiveAuthority(normalizedPage)');
    expect(builderPage).toContain('ensureStorefrontResponsiveAuthority(document)');
  });

  it('fails closed if a declared desktop-only transformation also mutates tablet',()=>{
    const before=page();
    const after=structuredClone(before);
    const style=after.sections[0]!.config.style as Record<string,Record<string,unknown>>;
    style.desktop={...style.desktop,minHeight:'24rem'};
    style.tablet={...style.tablet,gap:'9rem'};
    expect(()=>assertStorefrontViewportIsolation({before,after,allowedViewports:['desktop'],label:'leak'}))
      .toThrow(/STOREFRONT_VIEWPORT_ISOLATION_VIOLATION:leak:tablet:hero\.style/);
  });
});
