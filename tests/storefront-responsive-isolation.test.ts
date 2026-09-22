import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import {
  assertStorefrontViewportIsolation,
  collectStorefrontEffectiveVisualState,
  materializeStorefrontPageResponsiveStyles,
  listUnmaterializedStorefrontVisualSurfaces,
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
  it('materializes current effective styles into explicit viewport slots without changing rendering semantics',()=>{
    const before=page();
    expect(listUnmaterializedStorefrontVisualSurfaces(before)).toEqual(expect.arrayContaining(['hero.style','hero.styleSlots.card']));
    const after=materializeStorefrontPageResponsiveStyles(before);
    expect(listUnmaterializedStorefrontVisualSurfaces(after)).toEqual([]);
    for(const viewport of ['desktop','tablet','mobile'] as const){
      expect(collectStorefrontEffectiveVisualState(after,viewport)).toEqual(collectStorefrontEffectiveVisualState(before,viewport));
    }
    const hero=after.sections[0]!;
    const style=hero.config.style as Record<string,Record<string,unknown>>;
    expect(style.desktop.minHeight).toBe('20rem');
    expect(style.tablet.minHeight).toBe('20rem');
    expect(style.mobile.minHeight).toBe('20rem');
    const card=(hero.config.styleSlots as Record<string,Record<string,Record<string,unknown>>>).card;
    expect(card.desktop.minHeight).toBe('6rem');
    expect(card.tablet.minHeight).toBe('5rem');
    expect(card.mobile.minHeight).toBe('4rem');
  });

  it('turns later desktop edits into true desktop-only edits because tablet/mobile are explicit',()=>{
    const frozen=materializeStorefrontPageResponsiveStyles(page());
    const changed=structuredClone(frozen);
    const style=changed.sections[0]!.config.style as Record<string,Record<string,unknown>>;
    style.desktop={...style.desktop,minHeight:'24rem'};

    expect(resolveStorefrontVisualStyle(changed.sections[0]!.config.style,'desktop').minHeight).toBe('24rem');
    expect(resolveStorefrontVisualStyle(changed.sections[0]!.config.style,'tablet').minHeight).toBe('20rem');
    expect(resolveStorefrontVisualStyle(changed.sections[0]!.config.style,'mobile').minHeight).toBe('20rem');
    expect(()=>assertStorefrontViewportIsolation({before:frozen,after:changed,allowedViewports:['desktop'],label:'desktop-edit'})).not.toThrow();
  });

  it('is enforced at both template installation and normal draft persistence boundaries',()=>{
    const catalog=readFileSync('src/lib/builder/storefront-template-catalog.ts','utf8');
    const persistence=readFileSync('src/lib/builder/storefront-persistence.ts','utf8');
    expect(catalog).toContain('materializeStorefrontTemplateResponsiveStyles(runtimeNormalized)');
    expect(persistence).toContain('const document=materializeStorefrontPageResponsiveStyles(input.document)');
    expect(persistence).toContain('p_document:document');
    expect(persistence).toContain('hashStorefrontPageDocument(document)');
  });

  it('fails closed when a desktop edit leaks into tablet or mobile',()=>{
    const before=page();
    const after=structuredClone(before);
    const style=after.sections[0]!.config.style as Record<string,Record<string,unknown>>;
    style.desktop={...style.desktop,minHeight:'24rem'};
    expect(()=>assertStorefrontViewportIsolation({before,after,allowedViewports:['desktop'],label:'leak'}))
      .toThrow(/STOREFRONT_VIEWPORT_ISOLATION_VIOLATION:leak:tablet:hero\.style/);
  });
});
