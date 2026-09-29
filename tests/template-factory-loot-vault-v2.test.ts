import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  buildRegisteredStorefrontTemplateFactoryCandidate,
  getStorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/recipe-registry';
import {
  LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS,
  LOOT_VAULT_V2_FACTORY_RECIPE,
} from '@/lib/builder/template-factory/recipes/loot-vault-v2';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';
import {resolveStorefrontTemplatePreviewPackage} from '@/lib/builder/storefront-template-preview-auth';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {createStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-preview-demo';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {STOREFRONT_SUPPORT_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-support';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);

describe('Loot Vault v2 Factory canonical wiring',()=>{
  it('keeps Factory media metadata complete and package-owned',()=>{
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.reference).toMatchObject({
      key:'gaming.loot-vault.visual-first-approved-2026-09-28',
      approved:true,
    });
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.reference.requiredPageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS).toHaveLength(14);
    expect(LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS.every(asset=>asset.state==='ready'&&asset.src.startsWith('/storefront-demo/loot-vault-v2/'))).toBe(true);
    expect(LOOT_VAULT_V2_FACTORY_RECIPE.media.requirements?.reduce((sum,item)=>sum+item.minCount,0)).toBe(14);
  });

  it('compiles the exact canonical 14-page v2 package instead of a parallel Page Schema authority',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.package).toEqual(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    expect(build.package.pages.map(page=>page.pageType)).toEqual(STOREFRONT_PAGE_TYPES);
    expect(build.report.inheritedPageTypes).toEqual([]);
    expect(build.report.overriddenPageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    const article=build.package.pages.find(page=>page.pageType==='blog-article');
    expect(JSON.stringify(article)).toContain('"componentKey":"story.hero"');
  });

  it('locks the Product Owner approved Visual First authority and 95% fidelity target across all 14 pages',()=>{
    expect(LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    for(const page of LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages){
      expect(page.metadata?.visualAuthority).toBe('product-owner-approved-2026-09-28');
      expect(page.metadata?.referenceComposition).toBe('approved-2026-09-28-visual-first');
      expect(page.metadata?.visualFidelityTargetPercent).toBe(95);
      expect(page.metadata?.builderCompatibility).toBe('required-public-visual-builder');
      expect(page.metadata?.implementationMode).toBe('canonical-page-schema-builder-safe');
    }
  });

  it('is Product Owner preview-ready without implying acceptance or production catalog activation',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.issues).toEqual([]);
    expect(build.report.technicalReady).toBe(true);
    expect(build.report.productOwnerReady).toBe(true);
    expect(build.report.representativeMediaCount).toBe(14);
    expect(build.report.plannedMediaCount).toBe(0);
    expect(build.report.internalReferenceMediaCount).toBe(0);

    const preview=resolveStorefrontTemplatePreviewPackage('gaming.loot-vault',2,true);
    expect(preview).toEqual(LOOT_VAULT_V2_TEMPLATE_PACKAGE);

    expect(getStorefrontTemplatePackage('gaming.loot-vault',2)).toBeUndefined();
    expect(getStorefrontTemplatePackage('gaming.loot-vault',1)?.manifest.templateVersion).toBe(1);
  });

  it('makes the template showroom commerce path interactive but fail-closed for order submission',()=>{
    const demo=readFileSync('src/lib/builder/storefront-template-preview-demo.ts','utf8');
    const preview=readFileSync('src/components/builder/storefront-template-preview-runtime.tsx','utf8');
    const page=readFileSync('src/app/storefront-template-preview/page.tsx','utf8');
    const purchase=readFileSync('src/components/builder/storefront-purchase-controls-client.tsx','utf8');
    expect(demo).toContain('selectedVariantId?:string');
    expect(demo).toContain('LOOT_VAULT_PREVIEW_VARIANTS');
    expect(demo).toContain('unitPrice:selected.price');
    expect(page).toContain('StorefrontTemplatePreviewRuntime');
    expect(preview).toContain('useCart');
    expect(preview).toContain('setQuantity');
    expect(preview).toContain('remove(');
    expect(preview).toContain('Szállítási mód');
    expect(preview).toContain('Fizetési mód');
    expect(preview).toContain('Előnézeti módban rendelés nem adható le');
    for(const forbidden of ['/api/checkout/place','place_order','createOrder','submitOrder'])expect(preview).not.toContain(forbidden);
    expect(purchase).toContain("window.location.pathname!=='/storefront-template-preview'");
  });

  it('feeds Loot Vault-specific cart and checkout lines into ordinary template preview proof without requiring acceptance mode',()=>{
    for(const pageType of ['cart','checkout'] as const){
      const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===pageType)!;
      const base=createStorefrontTemplatePreviewBindingContext({template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,page});
      const preview=augmentStorefrontDigitalCommercePreviewContext({template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,page,context:base});
      const lines=((preview.cart as {lines?:Array<{name?:string;image?:string}>}|undefined)?.lines??[]);
      expect(lines.map(line=>line.name)).toEqual([
        'Vault Sentinel prémium figura',
        'Mythic Warden gyűjtői szobor',
        'Neon Controller Collector Edition',
        'Vault Visor sci-fi relikvia',
      ]);
      expect(new Set(lines.map(line=>line.image)).size).toBe(4);
      expect(lines.every(line=>String(line.image??'').startsWith('/storefront-demo/loot-vault-v2/'))).toBe(true);
    }
  });

  it('requires complete shopper navigation in preview, especially on mobile',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const required=['/','/webaruhaz','/blog','/oldal/rolunk','/gyik','/kapcsolat','/szallitas-es-fizetes','/oldal/visszakuldes','/kedvencek','/fiokom','/aszf','/adatvedelem','/impresszum'];
    for(const page of build.package.pages){
      const nodes=walk(page.sections);
      const header=nodes.find(node=>node.componentKey==='system.commerce-header');
      expect(header, page.pageType).toBeTruthy();
      const menu=(header?.config.mobileMenuItems??[]) as {label?:string;href?:string}[];
      expect(menu.map(item=>item.href), page.pageType).toEqual(required);
      const footer=nodes.find(node=>node.componentKey==='editorial.footer');
      const footerRoutes=((footer?.config.columns??[]) as {items?:{href?:string}[]}[]).flatMap(column=>column.items??[]).map(item=>item.href);
      for(const href of ['/webaruhaz','/blog','/oldal/rolunk','/gyik','/kapcsolat','/szallitas-es-fizetes','/oldal/visszakuldes','/fiokom','/aszf','/adatvedelem','/impresszum'])expect(footerRoutes).toContain(href);
    }
  });

  it('keeps Contact functionally complete with real location map plus the shared topic-first wizard',()=>{
    const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='contact');
    expect(page).toBeTruthy();
    const nodes=walk(page!.sections);
    expect(nodes.some(node=>node.componentKey==='support.location-map')).toBe(true);
    expect(nodes.some(node=>node.componentKey==='support.contact-form')).toBe(true);
    const map=nodes.find(node=>node.componentKey==='support.location-map');
    expect(String(map?.config.embedUrl)).toMatch(/^https:\/\/www\.google\.com\/maps/);
    expect(page?.metadata?.contactCompleteness).toEqual({
      companyDetails:true,
      embeddedMap:'shared-support-location-map-v1',
      formWizard:'storefront-form-wizard-v1',
    });
    expect(STOREFRONT_SUPPORT_COMPONENT_DEFINITIONS.map(item=>item.manifest.componentKey)).toContain('support.location-map');
  });

  it('keeps Account capability-complete but compact instead of rendering a long tile directory',()=>{
    const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='account');
    const nodes=walk(page!.sections);
    const nav=nodes.find(node=>node.id==='loot-vault-loot-v2-account-capability-navigation');
    expect((nav?.config.items as unknown[])).toHaveLength(9);
    expect(nodes.some(node=>node.id==='loot-vault-loot-v2-account-capability-cards')).toBe(false);
    expect(JSON.stringify(page)).not.toContain('loot-vault-loot-v2-account-card-');
    expect(page?.metadata?.accountCompleteness).toEqual({
      navigationAuthority:'shared-account-capabilities',
      presentation:'compact-template-owned',
      longTileDirectory:false,
    });
  });

  it('uses the shared tablet navigation disclosure on all 14 Loot Vault pages without creating a template-specific header branch',()=>{
    for(const page of LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages){
      const header=walk(page.sections).find(node=>node.componentKey==='system.commerce-header')!;
      expect(header.config.collapseNavigationAtTablet,page.pageType).toBe(true);
      expect(header.config.presentation,page.pageType).toBe('compact-single-row');
      expect(Array.isArray(header.config.mobileMenuItems)&&header.config.mobileMenuItems.length>=6,page.pageType).toBe(true);
    }
    const renderer=readFileSync('src/components/builder/storefront-commerce-header.tsx','utf8');
    expect(renderer).toContain('collapseNavigationAtTablet');
    expect(renderer).toContain('data-storefront-tablet-menu="true"');
    expect(renderer).not.toContain('gaming.loot-vault');
    const definition=readFileSync('src/lib/builder/storefront-commerce-header.ts','utf8');
    expect(definition).toContain("'collapseNavigationAtTablet'");
  });

  it('anchors universe labels to their cards and keeps mobile header controls touch-safe',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='home')!;
    const nodes=walk(home.sections);
    for(let index=1;index<=6;index++){
      const card=nodes.find(node=>node.id===`loot-vault-loot-v2-universe-${index}`)!;
      expect((card.config.style as any)?.base?.position).toBe('relative');
    }
    const header=nodes.find(node=>node.componentKey==='system.commerce-header')!;
    expect((header.config.styleSlots as any)?.utilityItem?.mobile).toMatchObject({minWidth:'2.75rem',minHeight:'2.75rem'});
    const search=nodes.find(node=>node.componentKey==='system.search')!;
    expect((search.config.style as any)?.base?.height).toBe('2.875rem');
  });

  it('keeps the core Loot Vault commerce assortment visually diverse',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
    const catalog=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog');
    expect(home).toBeTruthy();
    expect(catalog).toBeTruthy();

    const homeNodes=walk(home!.sections);
    const universeImages=homeNodes
      .filter(node=>/^loot-vault-loot-v2-universe-\d+-image$/.test(node.id))
      .map(node=>String(node.config.src??''));
    expect(universeImages).toHaveLength(6);
    expect(new Set(universeImages).size).toBeGreaterThanOrEqual(5);

    const catalogProducts=walk(catalog!.sections).find(node=>node.id==='loot-vault-loot-v2-catalog-products');
    const products=(catalogProducts?.config.products??[]) as Array<Record<string,unknown>>;
    expect(products).toHaveLength(6);
    const productVisuals=products.map(item=>`${String(item.image??'')}|${String(item.imagePosition??'')}|${String(item.imageScale??1)}`);
    expect(new Set(productVisuals).size).toBe(6);
  });

  it('locks the cinematic responsive shell details that define the approved Loot Vault direction',()=>{
    const byType=(pageType:string)=>{
      const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===pageType);
      expect(page,pageType).toBeTruthy();
      return {page:page!,nodes:walk(page!.sections)};
    };

    for(const pageType of ['account','cart','checkout','faq','contact']){
      const {nodes}=byType(pageType);
      const cinematicHeroImage=nodes.find(node=>node.componentKey==='content.image'&&String(node.id).includes(pageType)&&String(node.id).includes('bg'));
      expect(cinematicHeroImage,pageType).toBeTruthy();
      expect(String(cinematicHeroImage?.config.src),pageType).toMatch(/^\/storefront-demo\/loot-vault-v2\//);
    }

    const {nodes:homeNodes}=byType('home');
    const universeGrid=homeNodes.find(node=>node.id==='loot-vault-loot-v2-universe-grid');
    expect((universeGrid?.config.style as Record<string,unknown>)?.mobile).toMatchObject({
      gridAutoFlow:'column',
      scrollSnapType:'x mandatory',
      overflowX:'auto',
    });
    for(let index=1;index<=6;index++){
      const card=homeNodes.find(node=>node.id===`loot-vault-loot-v2-universe-${index}`);
      expect(card?.responsive?.mobile?.gridSpan).toBe(1);
    }

    const {nodes:checkoutNodes}=byType('checkout');
    const checkoutSummary=checkoutNodes.find(node=>node.componentKey==='commerce.checkout-summary');
    expect(checkoutSummary?.config.presentation).toBe('cinematic-commerce');

    for(const page of LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const header=nodes.find(node=>node.id==='loot-vault-shell-header');
      expect(header?.config.presentation,page.pageType).toBe('compact-single-row');
      expect(header?.config.showUtilityLabels,page.pageType).toBe(false);
      const navigation=nodes.find(node=>node.id==='loot-vault-shell-nav');
      const navItems=(navigation?.config.items??[]) as Array<{label?:string;href?:string}>;
      expect(navItems.map(item=>item.label),page.pageType).toEqual(['Játékok','Figurák','Gyűjtői kiadások','Kiegészítők','Ajándékok','Magazin']);
      expect(String(header?.config.logoUrl),page.pageType).toBe('/storefront-demo/loot-vault-v2/brand-mark.svg');

      const footer=nodes.find(node=>node.id==='loot-vault-shell-footer');
      expect(footer?.config.presentation,page.pageType).toBe('flush');
      expect(footer?.config.spacing,page.pageType).toBe('none');
    }
  });

  it('keeps Loot Vault category and product visuals package-owned and physically diverse',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
    expect(home).toBeTruthy();
    const nodes=walk(home!.sections);
    const hash=(src:string)=>createHash('sha256').update(readFileSync(`public${src}`)).digest('hex');

    const universeImages=nodes
      .filter(node=>/^loot-vault-loot-v2-universe-\d+-image$/.test(node.id))
      .map(node=>String(node.config.src??''));
    expect(universeImages).toHaveLength(6);
    expect(universeImages.every(src=>src.startsWith('/storefront-demo/loot-vault-v2/'))).toBe(true);
    expect(new Set(universeImages.map(hash)).size).toBeGreaterThanOrEqual(4);

    const grid=nodes.find(node=>node.id==='loot-vault-loot-v2-product-grid');
    const products=(grid?.config.products??[]) as Array<Record<string,unknown>>;
    const productImages=products.map(item=>String(item.image??''));
    expect(productImages).toHaveLength(4);
    expect(productImages.every(src=>src.startsWith('/storefront-demo/loot-vault-v2/'))).toBe(true);
    expect(new Set(productImages.map(hash)).size).toBe(4);
  });

  it('uses a generic shared cinematic commerce capability and does not fabricate scarcity status in product fallbacks',()=>{
    const packageSource=JSON.stringify(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    expect(packageSource).toContain('cinematic-commerce');
    expect(packageSource).not.toContain('loot-vault-cinematic');

    const productClaims=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.flatMap(page=>walk(page.sections)).flatMap(node=>{
      const products=(node.config.products??[]) as Array<Record<string,unknown>>;
      const bindings=(node.bindings?.products as {fallback?:Array<Record<string,unknown>>}|undefined)?.fallback??[];
      return [...products,...bindings].flatMap(product=>[String(product.badge??''),String(product.stockLabel??'')]);
    }).join('\n');
    expect(productClaims).not.toMatch(/(?:LIMITÁLT|EXKLUZÍV|ELŐRENDELÉS|Előrendelhető)/i);

    const sharedCommerce=readFileSync('src/components/builder/storefront-commerce.tsx','utf8');
    expect(sharedCommerce).toContain('cinematic-commerce');
    expect(sharedCommerce).not.toContain('loot-vault-cinematic');
    const previewCommerce=readFileSync('src/lib/builder/storefront-digital-commerce-preview.ts','utf8');
    expect(previewCommerce).not.toMatch(/(?:Limited Edition|Vault Exclusive|lootVaultAcceptanceCartLines)/);
    const previewDemo=readFileSync('src/lib/builder/storefront-template-preview-demo.ts','utf8');
    expect(previewDemo).not.toMatch(/badge:'(?:LIMITÁLT|EXKLUZÍV)'/);
  });

  it('keeps primary Visual First showcase media free from the legacy archive screenshot asset',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home')!;
    const homeNodes=walk(home.sections);
    for(const id of ['loot-vault-loot-v2-universe-1-image','loot-vault-loot-v2-universe-6-image','loot-vault-loot-v2-editorial-image']){
      expect(String(homeNodes.find(node=>node.id===id)?.config.src??'')).not.toContain('background-archive.webp');
      expect(String(homeNodes.find(node=>node.id===id)?.config.src??'')).not.toContain('category-galaxy.webp');
      expect(String(homeNodes.find(node=>node.id===id)?.config.src??'')).not.toContain('category-retro.webp');
    }

    const blog=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='blog-index')!;
    const blogNodes=walk(blog.sections);
    for(const id of ['loot-vault-loot-v2-blog-image','loot-vault-loot-v2-blog-highlight-1-image','loot-vault-loot-v2-blog-highlight-3-image']){
      expect(String(blogNodes.find(node=>node.id===id)?.config.src??'')).not.toContain('background-archive.webp');
    }
    const article=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='blog-article')!;
    const articleHero=walk(article.sections).find(node=>node.id==='loot-vault-loot-v2-article-story-hero')!;
    expect(String(articleHero.config.image??'')).toBe('/storefront-demo/loot-vault-v2/product-figure.webp');

    const previewContext=createStorefrontTemplatePreviewBindingContext({template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,page:blog});
    const previewJson=JSON.stringify(previewContext);
    expect(previewJson).not.toContain('background-archive.webp');
    expect(previewJson).toContain('editorial-vault-shelf.webp');
    expect(previewJson).toContain('editorial-collector-room.webp');
  });

  it('keeps legacy screenshot media out of compiled surfaces and strictly contains the cropped cinematic source',()=>{
    const serialized=JSON.stringify(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    expect(serialized).not.toContain('background-archive.webp');
    expect(serialized).not.toContain('category-galaxy.webp');
    expect(serialized).not.toContain('category-retro.webp');

    const uses=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.flatMap(page=>walk(page.sections).flatMap(node=>{
      const found:string[]=[];
      const scan=(value:unknown)=>{
        if(typeof value==='string'&&value.includes('hero-cinematic.webp'))found.push(node.id);
        else if(Array.isArray(value))value.forEach(scan);
        else if(value&&typeof value==='object')Object.values(value as Record<string,unknown>).forEach(scan);
      };
      scan(node.config);
      scan(node.bindings);
      return found;
    }));
    expect(new Set(uses)).toEqual(new Set([
      'loot-vault-loot-v2-universe-1-image',
      'loot-vault-loot-v2-product-grid',
      'loot-vault-loot-v2-catalog-products',
      'loot-vault-loot-v2-search-products',
      'loot-vault-loot-v2-product-recommendations',
      'loot-vault-loot-v2-cart-recommendations',
    ]));

    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home')!;
    const nodes=walk(home.sections);
    const croppedCinematic=nodes.find(node=>node.id==='loot-vault-loot-v2-universe-1-image')!;
    expect((croppedCinematic.config.style as any)?.base?.transform).toBe('scale(1.28)');
    expect((croppedCinematic.config.style as any)?.base?.objectPosition).toBe('78% 40%');
    const cleanUniverseSix=nodes.find(node=>node.id==='loot-vault-loot-v2-universe-6-image')!;
    expect(cleanUniverseSix.config.src).toBe('/storefront-demo/loot-vault-v2/product-figure.webp');
    const grid=nodes.find(node=>node.id==='loot-vault-loot-v2-product-grid')!;
    expect((grid.config.styleSlots as any)?.image?.base?.transform).toBe('scale(1.16)');

    const allowedCommerceNodes=new Set([
      'loot-vault-loot-v2-product-grid',
      'loot-vault-loot-v2-catalog-products',
      'loot-vault-loot-v2-search-products',
      'loot-vault-loot-v2-product-recommendations',
      'loot-vault-loot-v2-cart-recommendations',
    ]);
    for(const page of LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages){
      for(const node of walk(page.sections)){
        if(!allowedCommerceNodes.has(node.id))continue;
        const groups=[
          ...(Array.isArray(node.config.products)?[node.config.products as Array<Record<string,unknown>>]:[]),
          ...(Array.isArray((node.bindings?.products as any)?.fallback)?[(node.bindings?.products as any).fallback as Array<Record<string,unknown>>]:[]),
        ];
        for(const product of groups.flat().filter(product=>String(product.image??'').includes('hero-cinematic.webp'))){
          expect(Number(product.imageScale??1)).toBeGreaterThanOrEqual(1.2);
          const x=Number.parseInt(String(product.imagePosition??'0').split('%')[0]??'0',10);
          expect(x).toBeGreaterThanOrEqual(70);
        }
      }
    }
  });

  it('uses the shared bounded imageScale capability to keep repeated source media visually distinct without template-specific renderer branches',()=>{
    const source=readFileSync('src/components/builder/storefront-commerce.tsx','utf8');
    expect(source).toContain('imageScale:number');
    expect(source).toContain('Math.max(1,Math.min(1.4,number(row.imageScale,1)))');
    expect(source).not.toContain('gaming.loot-vault');

    const catalog=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    const grid=walk(catalog.sections).find(node=>node.id==='loot-vault-loot-v2-catalog-products')!;
    const products=(grid.config.products??[]) as Array<Record<string,unknown>>;
    expect(products).toHaveLength(6);
    expect(new Set(products.map(product=>`${String(product.image??'')}|${String(product.imagePosition??'')}|${String(product.imageScale??1)}`)).size).toBe(6);
    expect(products.every(product=>Number(product.imageScale??1)>=1&&Number(product.imageScale??1)<=1.4)).toBe(true);

    const previewDemo=readFileSync('src/lib/builder/storefront-template-preview-demo.ts','utf8');
    expect(previewDemo).not.toContain("LOOT_VAULT_PREVIEW_COLLECTION_IMAGES=Object.freeze([\n  '/storefront-demo/loot-vault-v2/hero-cinematic.webp'");
  });

  it('keeps Home editorial, Search products and Blog highlights visually coherent instead of repeating the same proof image',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home')!;
    const homeNodes=walk(home.sections);
    const hero=homeNodes.find(node=>node.id==='loot-vault-loot-v2-hero-art')!;
    const editorial=homeNodes.find(node=>node.id==='loot-vault-loot-v2-editorial-image')!;
    expect(editorial.config.src).not.toBe(hero.config.src);
    expect(editorial.config.src).toBe('/storefront-demo/loot-vault-v2/editorial-collector-room.webp');

    const search=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='search')!;
    const searchGrid=walk(search.sections).find(node=>node.id==='loot-vault-loot-v2-search-products')!;
    const searchProducts=(searchGrid.config.products??[]) as Array<Record<string,unknown>>;
    expect(searchProducts.map(product=>String(product.image??''))).toEqual([
      '/storefront-demo/loot-vault-v2/product-figure.webp',
      '/storefront-demo/loot-vault-v2/hero-cinematic.webp',
      '/storefront-demo/loot-vault-v2/editorial-collector-room.webp',
      '/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
    ]);
    expect(new Set(searchProducts.map(product=>String(product.image??''))).size).toBe(4);

    const blog=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='blog-index')!;
    const blogNodes=walk(blog.sections);
    const highlightImages=[1,2,3].map(index=>String(blogNodes.find(node=>node.id===`loot-vault-loot-v2-blog-highlight-${index}-image`)?.config.src??''));
    expect(new Set(highlightImages).size).toBe(3);

    const catalog=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    const catalogGrid=walk(catalog.sections).find(node=>node.id==='loot-vault-loot-v2-catalog-products')!;
    const catalogProducts=(catalogGrid.config.products??[]) as Array<Record<string,unknown>>;
    const ranger=catalogProducts.find(product=>product.id==='obsidian-ranger')!;
    const guardian=catalogProducts.find(product=>product.id==='celestial-guardian')!;
    expect(ranger.imagePosition).not.toBe(guardian.imagePosition);
    expect(Number(ranger.imageScale)).toBeGreaterThanOrEqual(1.35);
    expect(Number(guardian.imageScale)).toBe(1.4);
  });

  it('keeps customer-facing demo copy free from internal platform vocabulary',()=>{
    const fixtures=LOOT_VAULT_V2_TEMPLATE_PACKAGE.demoFixtures??[];
    const customerCopy=fixtures.flatMap(item=>{
      const payload=item.payload as Record<string,unknown>;
      return ['title','excerpt','body'].map(key=>String(payload[key]??'')).filter(Boolean);
    }).join('\n');
    expect(customerCopy).not.toMatch(/\b(?:acceptance|preview|canonical|authority|engine|builder|storefront|shoperation|fixture|platformképesség|showroom)\b/i);
  });

  it('keeps legal and information fixture content page-specific instead of title-swapped duplicates',()=>{
    const fixtures=LOOT_VAULT_V2_TEMPLATE_PACKAGE.demoFixtures??[];
    const legalSlugs=['aszf','adatvedelem','impresszum','szallitas','fizetes','visszakuldes'];
    const content=fixtures.filter(item=>item.entityType==='content'&&legalSlugs.includes(String((item.payload as Record<string,unknown>).slug)));
    expect(content).toHaveLength(legalSlugs.length);
    const bodies=content.map(item=>String((item.payload as Record<string,unknown>).body??'').trim());
    expect(bodies.every(body=>body.length>80)).toBe(true);
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it('keeps all 14 pages free from Playroom presentation leakage',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    for(const page of build.package.pages){
      const serialized=JSON.stringify(page);
      expect(serialized).not.toContain('PLAYROOM');
      expect(serialized).not.toContain('Playroom');
    }
  });

  it('fails closed for an unregistered template instead of fabricating a recipe',()=>{
    expect(getStorefrontTemplateFactoryRecipe('gaming.missing')).toBeNull();
    expect(()=>buildRegisteredStorefrontTemplateFactoryCandidate('gaming.missing')).toThrow('TEMPLATE_FACTORY_RECIPE_MISSING:gaming.missing');
  });
});
