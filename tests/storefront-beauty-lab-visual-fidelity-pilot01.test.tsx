import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {PLANS} from '@/lib/plans/catalog';
import {
  BEAUTY_LAB_DESIGN_TOKENS,
  BEAUTY_LAB_HOME_PAGE,
  BEAUTY_LAB_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE,
} from '@/lib/builder/templates/beauty-lab';

const capability={plan:'pro' as const,features:PLANS.pro.features};
const render=(page:typeof BEAUTY_LAB_HOME_PAGE,viewport:'desktop'|'tablet'|'mobile')=>renderToStaticMarkup(<StorefrontRuntimeRenderer page={page} viewport={viewport} bindingContext={{}} componentRegistry={createStorefrontVisualBuilderComponentRegistry()} rendererRegistry={createStorefrontVisualBuilderRendererRegistry()} capability={capability}/>);

describe('Visual Fidelity Pilot 01 — Beauty Lab',()=>{
  it('locks the warm ivory + deep sage editorial palette and eliminates primitive Beauty Lab SVG authority',()=>{
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-color-background']).toBe('#F7F3EB');
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-color-primary']).toBe('#46523F');
    expect(BEAUTY_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('#A6AA92');
    const serialized=JSON.stringify(BEAUTY_LAB_TEMPLATE_PACKAGE);
    expect(serialized).not.toContain('/storefront-demo/beauty-lab/formula.svg');
    expect(serialized).not.toContain('/storefront-demo/beauty-lab/ingredient.svg');
    expect(serialized).not.toContain('/storefront-demo/beauty-lab/texture.svg');
    expect(serialized).toContain('images.unsplash.com');
  });

  it('ships the canonical header, photo-dominant hero and editorial title treatment',()=>{
    const html=render(BEAUTY_LAB_HOME_PAGE,'desktop');
    expect(html).toContain('data-storefront-component="system.header"');
    expect(html).toContain('data-presentation="editorial-lab"');
    expect(html).toContain('YOUR SKIN.');
    expect(html).toContain('YOUR FORMULA.');
    expect(html).toContain('data-presentation="editorial-photo"');
    expect(html).toContain('data-presentation="editorial-copy-panel"');
    expect(html).toContain('data-presentation="editorial-product-inset"');
    expect(html).toContain('Találd meg a formulád');
  });

  it('ships the canonical Formula Finder, concern, Ingredient Index, Texture Lab, product and routine modules',()=>{
    const html=render(BEAUTY_LAB_HOME_PAGE,'desktop');
    expect(html).toContain('SHOP BY SKIN GOAL');
    expect(html).toContain('data-presentation="editorial-choice-grid"');
    expect(html).toContain('data-presentation="media-index"');
    expect(html).toContain('data-presentation="media-navigation"');
    expect(html).toContain('data-presentation="beauty-lab"');
    expect(html).toContain('BUILD YOUR ROUTINE');
    expect(html).toContain('NEW FORMULAS');
    expect(html).toContain('BEAUTY LAB EDIT');
  });

  it('renders the same canonical Page Schema across desktop, tablet and mobile with responsive compositions',()=>{
    const desktop=render(BEAUTY_LAB_HOME_PAGE,'desktop');
    const tablet=render(BEAUTY_LAB_HOME_PAGE,'tablet');
    const mobile=render(BEAUTY_LAB_HOME_PAGE,'mobile');
    for(const html of [desktop,tablet,mobile]){
      expect(html).toContain('data-storefront-visual="layered-canvas"');
      expect(html).toContain('data-storefront-guided="finder"');
      expect(html).toContain('data-storefront-commerce="product-grid"');
      expect(html).toContain('Ingredient Index');
      expect(html).toContain('Texture Lab');
    }
    expect(desktop).toContain('minmax(0,1.65fr) minmax(14rem,.85fr)');
    expect(mobile).toContain('grid-template-columns:1fr');
  });

  it('renders the canonical PDP gallery/buybox, rating, chips, sticky desktop purchase UX, tabs and related products',()=>{
    const desktop=render(BEAUTY_LAB_PRODUCT_PAGE,'desktop');
    const tablet=render(BEAUTY_LAB_PRODUCT_PAGE,'tablet');
    const mobile=render(BEAUTY_LAB_PRODUCT_PAGE,'mobile');
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('data-presentation="editorial-thumbnails"');
    expect(desktop).toContain('data-storefront-commerce="review-summary"');
    expect(desktop).toContain('data-presentation="chips"');
    expect(desktop).toMatch(/data-presentation="sticky-buybox"[^>]*position:sticky/);
    expect(tablet).toMatch(/data-presentation="sticky-buybox"[^>]*position:sticky/);
    expect(mobile).not.toMatch(/data-presentation="sticky-buybox"[^>]*position:sticky/);
    expect(desktop).toContain('data-storefront-commerce="content-tabs"');
    expect(desktop).toContain('A formuláról');
    expect(desktop).toContain('Ingredient information');
    expect(desktop).toContain('COMPLETE THE ROUTINE');
  });

  it('does not fake a before/after efficacy claim in the presentation-only pilot',()=>{
    expect(JSON.stringify(BEAUTY_LAB_TEMPLATE_PACKAGE)).not.toMatch(/before.?after|előtte.?utána/i);
  });
});
