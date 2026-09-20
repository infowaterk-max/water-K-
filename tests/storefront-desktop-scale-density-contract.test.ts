import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';
import{
  STOREFRONT_BREAKPOINT_CONTRACT,
  STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX,
  STOREFRONT_DESKTOP_SCALE_DENSITY_CONTRACT,
  STOREFRONT_LAYOUT_GRID_CONTRACT,
  resolveStorefrontViewportForWidth,
}from'@/lib/builder/storefront-foundation';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Storefront Desktop scale / density contract',()=>{
  it('locks canonical breakpoints and logical viewport widths',()=>{
    expect(STOREFRONT_BREAKPOINT_CONTRACT.mobile).toEqual({minWidthPx:0,maxWidthPx:767});
    expect(STOREFRONT_BREAKPOINT_CONTRACT.tablet).toEqual({minWidthPx:768,maxWidthPx:1199});
    expect(STOREFRONT_BREAKPOINT_CONTRACT.desktop).toEqual({minWidthPx:1200,maxWidthPx:null});
    expect(STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX).toEqual({desktop:1200,tablet:768,mobile:390});
    expect(resolveStorefrontViewportForWidth(767)).toBe('mobile');
    expect(resolveStorefrontViewportForWidth(768)).toBe('tablet');
    expect(resolveStorefrontViewportForWidth(1199)).toBe('tablet');
    expect(resolveStorefrontViewportForWidth(1200)).toBe('desktop');
  });

  it('aligns default runtime content width with canonical Desktop and keeps an explicit wide role',()=>{
    expect(STOREFRONT_LAYOUT_GRID_CONTRACT.maxContentWidthPx).toBe(1200);
    expect(STOREFRONT_LAYOUT_GRID_CONTRACT.maxWideCommerceWidthPx).toBe(1440);
    expect(STOREFRONT_LAYOUT_GRID_CONTRACT.maxNarrowContentWidthPx).toBe(760);
    expect(STOREFRONT_LAYOUT_GRID_CONTRACT.layoutPresets).toContain('wide');
    expect(STOREFRONT_DESKTOP_SCALE_DENSITY_CONTRACT.browserZoomBaselinePercent).toBe(100);
    expect(STOREFRONT_DESKTOP_SCALE_DENSITY_CONTRACT.browserZoomSupportedPercent).toBe(125);
    const primitives=read('src/components/builder/storefront-primitives.tsx');
    const globals=read('src/app/globals.css');
    const responsive=read('src/app/responsive-final.css');
    expect(primitives).toContain("['full','wide','content','narrow']");
    expect(primitives).toContain('var(--shoporation-content-max, 1200px)');
    expect(primitives).toContain('var(--shoporation-wide-commerce-max, 1440px)');
    expect(globals).toContain('.shell{width:min(1200px,calc(100% - 32px))');
    expect(globals).toContain('.shell{width:min(100% - 22px,1200px)');
    expect(globals).not.toContain('.shell{width:min(100% - 22px,1240px)');
    expect(responsive).toContain('.shell{width:min(100% - 32px,1200px)');
    expect(responsive).not.toContain('.shell{width:min(100% - 32px,1280px)');
  });

  it('uses actual browser layout width as published runtime breakpoint authority',()=>{
    const responsive=read('src/components/builder/storefront-responsive-runtime.tsx');
    const home=read('src/app/page.tsx');
    const account=read('src/components/account/storefront-account-shell.tsx');
    expect(responsive).toContain('resolveStorefrontViewportForWidth(window.innerWidth)');
    expect(responsive).toContain("window.addEventListener('resize',update");
    expect(home).toContain('<StorefrontResponsiveRuntime');
    expect(account).toContain('<StorefrontResponsiveRuntime');
  });

  it('keeps operational account density semantic and capability navigation compact',()=>{
    const globals=read('src/lib/builder/storefront-global-styles.ts');
    const accountCss=read('src/app/account-workflow.css');
    const accountShell=read('src/components/account/storefront-account-shell.tsx');
    const quoteManager=read('src/components/account/b2b-quote-request-manager.tsx');
    const cartStyleQuantity=read('src/components/commerce/cart-style-quantity-control.tsx');
    const overview=read('src/app/fiokom/page.tsx');
    const surfaces=read('src/components/builder/storefront-digital-commerce-surfaces.tsx');
    const commerceHeader=read('src/components/builder/storefront-commerce-header.tsx');
    const commerceHeaderCss=read('src/components/builder/storefront-commerce-header.module.css');
    expect(globals).toContain("'--shoporation-type-page-title'");
    expect(globals).toContain("'--shoporation-control-height'");
    expect(accountCss).toContain('.storefrontAccountShell .accountPage.section');
    expect(accountCss).toContain('.storefrontAccountShell .storefrontAccountRouteContent>.section');
    expect(accountCss).toContain('.storefrontAccountShell .storefrontAccountRouteContent .sectionTitle');
    expect(accountCss).toContain('var(--shoporation-type-page-title');
    expect(accountCss).toContain('var(--shoporation-control-height');
    expect(accountShell).toContain('className="storefrontAccountWorkspace"');
    expect(accountShell).toContain('className="storefrontAccountSidebar"');
    expect(accountCss).toContain('grid-template-columns:minmax(15rem,17rem) minmax(0,1fr)');
    expect(accountCss).toContain('@media(max-width:960px)');
    expect(accountCss).toContain('.accountQuoteFormGrid');
    expect(quoteManager).toContain('className="accountFormField accountQuoteProduct"');
    expect(quoteManager).toContain('className="accountFormField accountQuoteQuantity"');
    expect(quoteManager).toContain('className="accountFormField accountQuoteNote"');
    expect(quoteManager).toContain('<CartStyleQuantityControl contract="rfq"');
    expect(quoteManager).toContain('<option value="">Válassz terméket</option>');
    expect(quoteManager).not.toContain('type="number"');
    expect(cartStyleQuantity).toContain("data-rfq-quantity-layout={!cart?'cart-vertical-arrows':undefined}");
    expect(cartStyleQuantity).toContain("data-rfq-remove-control={!cart?'true':undefined}");
    expect(cartStyleQuantity).toContain('background:\'#cf3038\'');
    expect(cartStyleQuantity).toContain('data-cart-icon="trash"');
    expect(cartStyleQuantity).toContain("data-rfq-quantity-field={!cart?'true':undefined}");
    expect(cartStyleQuantity).toContain("background:'var(--shoporation-color-background,#020b17)'");
    expect(cartStyleQuantity).toContain("color:'var(--shoporation-color-text,#fff)'");
    expect(cartStyleQuantity).toContain("background:'transparent',color:'inherit'");
    expect(cartStyleQuantity).not.toContain("background:'#fbfcfa'");
    expect(overview).toContain('className="actions accountPrimaryActions"');
    expect(overview).not.toContain('className="btn btnGhost" href="/fiokom/letoltesek"');
    expect(surfaces).toContain("flexWrap:mobile?'nowrap':'wrap'");
    expect(surfaces).toContain("overflowX:mobile?'auto':'visible'");
    expect(commerceHeader).toContain("fontSize:viewport==='mobile'?'1rem':'.94rem'");
    expect(commerceHeader).toContain("minHeight:tablet?'3.35rem':'3.65rem'");
    expect(commerceHeaderCss).toContain('font-size: .88rem !important;');
  });
});
