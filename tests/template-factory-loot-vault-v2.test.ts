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
import {CANONICAL_ACCOUNT_CAPABILITIES} from '@/lib/account/account-capabilities';

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

  it('keeps semantic header actions and Product Owner journey locators aligned with rewritten preview routes',()=>{
    const header=readFileSync('src/components/builder/storefront-commerce-header.tsx','utf8');
    const handoff=readFileSync('scripts/template-factory-product-owner-handoff.mjs','utf8');
    expect(header).toContain("return kind==='account'?<StorefrontAccountAuthTrigger");
    expect(header).not.toContain("kind==='account'&&item.href==='/fiokom'");
    expect(handoff).toContain("[data-storefront-commerce-card] a[href*=\"page=product\"]");
    expect(handoff).toContain("getByRole('radio',{name:/Csomagpont/}).first()");
    expect(handoff).toContain("visitCandidate('blog-index','engine-e10-index')");
    expect(handoff).toContain("visitCandidate('blog-article','engine-e10-article')");
  });

  it('makes the template showroom commerce path interactive but fail-closed for order submission',()=>{
    const demo=readFileSync('src/lib/builder/storefront-template-preview-demo.ts','utf8');
    const preview=readFileSync('src/components/builder/storefront-template-preview-runtime.tsx','utf8');
    const page=readFileSync('src/app/storefront-template-preview/page.tsx','utf8');
    const qa=readFileSync('src/app/visual-fidelity-qa/page.tsx','utf8');
    const factoryGate=readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    expect(demo).toContain('selectedVariantId?:string');
    expect(demo).toContain('LOOT_VAULT_PREVIEW_VARIANTS');
    expect(demo).toContain('unitPrice:selected.price');
    expect(demo).toContain('restoreStorefrontTemplatePreviewProductCommerceContext');
    expect(page).toContain('restoreStorefrontTemplatePreviewProductCommerceContext');
    expect(qa).toContain('restoreStorefrontTemplatePreviewProductCommerceContext');
    expect(page).toContain('StorefrontTemplatePreviewRuntime');
    expect(qa).toContain("VISUAL_FIDELITY_QA!=='1'");
    expect(qa).toContain("commerceProof=factoryCandidate&&query.commerceProof==='1'");
    expect(qa).toContain('StorefrontTemplatePreviewRuntime');
    expect(qa).toContain('interactionBasePath="/visual-fidelity-qa"');
    expect(qa).not.toContain('requireStorefrontTemplatePreviewAccess');
    expect(factoryGate).toContain("commerceProof:'1'");
    expect(factoryGate).toContain("baseUrl+'/visual-fidelity-qa?'");
    expect(preview).toContain('useCart');
    expect(preview).toContain('<CartView freeShippingThreshold={20000} products={products}/>');
    expect(preview).toContain('<CheckoutForm');
    expect(preview).toContain('data-storefront-commerce="cart-summary"');
    expect(preview).toContain('data-storefront-commerce="checkout-summary"');
    const checkout=readFileSync('src/components/checkout/checkout-form.tsx','utf8');
    expect(checkout).toContain('Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.');
    for(const forbidden of ['/api/checkout/place','place_order','createOrder','submitOrder'])expect(preview).not.toContain(forbidden);
    expect(preview).toContain("url.pathname==='/kosar'");
    expect(preview).toContain('navigatePreview(event,routes.cart)');
    expect(preview).toContain('event.nativeEvent.stopImmediatePropagation()');
    expect(preview).toContain('button[aria-label="Fiókom"]');
    expect(preview).toContain('navigatePreview(event,routes.account)');
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
    const required=['/','/webaruhaz','/blog','/oldal/rolunk','/gyik','/kapcsolat','/szallitas','/fizetes','/oldal/visszakuldes','/kedvencek','/fiokom','/aszf','/adatvedelem','/impresszum'];
    for(const page of build.package.pages){
      const nodes=walk(page.sections);
      const header=nodes.find(node=>node.componentKey==='system.commerce-header');
      expect(header, page.pageType).toBeTruthy();
      const menu=(header?.config.mobileMenuItems??[]) as {label?:string;href?:string}[];
      expect(menu.map(item=>item.href), page.pageType).toEqual(required);
      const footer=nodes.find(node=>node.componentKey==='editorial.footer');
      const footerRoutes=((footer?.config.columns??[]) as {items?:{href?:string}[]}[]).flatMap(column=>column.items??[]).map(item=>item.href);
      for(const href of ['/webaruhaz','/blog','/oldal/rolunk','/gyik','/kapcsolat','/szallitas','/fizetes','/oldal/visszakuldes','/fiokom','/aszf','/adatvedelem','/impresszum'])expect(footerRoutes).toContain(href);
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

  it('keeps Account capability-complete through shared platform IA without a duplicate template-local Fiókom menu',()=>{
    const page=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='account')!;
    const nodes=walk(page.sections);
    expect(nodes.some(node=>node.id==='loot-vault-loot-v2-account-capability-navigation')).toBe(false);
    expect(nodes.some(node=>node.componentKey==='system.navigation'&&node.config.presentation==='account-capability-demo')).toBe(false);
    expect(page.metadata?.accountCompleteness).toEqual({
      navigationAuthority:'shared-account-capabilities',
      presentation:'compact-template-owned',
      longTileDirectory:false,
    });
    expect(CANONICAL_ACCOUNT_CAPABILITIES.map(item=>item.href)).toContain('/fiokom/gyujtemenyem');
    const scaffold=readFileSync('src/lib/builder/template-factory/scaffold.ts','utf8');
    expect(scaffold).toContain("completeness?.navigationAuthority==='shared-account-capabilities'");
    expect(scaffold).toContain('FACTORY_ACCOUNT_CAPABILITY_NAVIGATION_DUPLICATE');
    expect(scaffold).not.toContain("if(node.componentKey!=='system.navigation')return");
  });

  it('keeps Favorites, Account and Cart utility icons canonical and identical across all Loot Vault pages',()=>{
    const expected=[
      {label:'Kedvenceim',href:'/kedvencek',kind:'favorites'},
      {label:'Fiókom',href:'/fiokom',kind:'account'},
      {label:'Kosár',href:'/kosar',kind:'cart'},
    ];
    for(const page of LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages){
      const header=walk(page.sections).find(node=>node.componentKey==='system.commerce-header')!;
      const items=(header.config.utilityItems??[]) as Array<{label?:string;href?:string;kind?:string}>;
      expect(items.map(({label,href,kind})=>({label,href,kind})),page.pageType).toEqual(expected);
    }
    const renderer=readFileSync('src/components/builder/storefront-commerce-header.tsx','utf8');
    expect(renderer).toContain('data-storefront-utility-icon="favorites"');
    expect(renderer).toContain('data-storefront-utility-icon="account"');
    expect(renderer).toContain('data-storefront-utility-icon="cart"');
    expect(renderer).toContain("if(item.kind!=='custom')return item.kind");
    expect(renderer).toContain("return kind==='account'?<StorefrontAccountAuthTrigger");
    expect(renderer).not.toContain("kind==='account'&&item.href==='/fiokom'");
    expect(renderer).toContain("if(item.kind!=='custom')return item.kind");
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
      gridTemplateColumns:'repeat(2,minmax(0,1fr))',
      overflowX:'visible',
    });
    expect((universeGrid?.config.style as any)?.mobile?.gridAutoFlow).not.toBe('column');
    expect((universeGrid?.config.style as any)?.mobile?.scrollSnapType??'').not.toBe('x mandatory');
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
    expect(new Set(universeImages.map(hash)).size).toBe(6);

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
    expect(cleanUniverseSix.config.src).toBe('/storefront-demo/loot-vault-v2/universe-archive-hunt.webp');
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

  it('keeps Returns focused on the actual return journey and a compact support handoff',()=>{
    const fixtureSource=readFileSync('src/lib/builder/storefront-template-route-integrity.ts','utf8');
    for(const phrase of['VISSZAKÜLDÉS LÉPÉSRŐL LÉPÉSRE','SZÁLLÍTÁSI KÖLTSÉG','VISSZATÉRÍTÉS VAGY MÁS MEGOLDÁS','AZ ÜGY KÖVETÉSE'])expect(fixtureSource).toContain(phrase);
    const content=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='content')!;
    const nodes=walk(content.sections);
    const cta=nodes.find(node=>node.id==='loot-vault-loot-v2-content-contact-cta')!;
    expect(cta.componentKey).toBe('content.button');
    expect(cta.config.href).toBe('/kapcsolat');
    expect(cta.config.label).toBe('Kapcsolat / ügyintézés');
    expect(JSON.stringify(content)).not.toContain('Hasznos oldalak');
  });

  it('implements the accepted mobile PO content cleanup without repeating generic filler',()=>{
    const page=(type:string)=>LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===type)!;
    const content=JSON.stringify(page('content'));
    expect(content).not.toContain('Valódi termékadat');
    expect(content).not.toContain('Történetközpontú bemutatás');
    expect(content).not.toContain('Egységes vásárlási folyamat');
    const faq=JSON.stringify(page('faq'));
    expect(faq).toContain('content.accordion');
    expect(faq).toContain('Mi van, ha nem találom a választ?');
    const contact=JSON.stringify(page('contact'));
    expect(contact).not.toContain('Követhető ügyfélszolgálati ügy');
    expect(contact).toContain('support.contact-form');
    const legal=JSON.stringify(page('legal'));
    expect(legal).toContain('content.page.body');
    expect(legal).not.toContain('loot-vault-loot-v2-legal-links');
  });

  it('keeps mobile catalog headings inside the viewport and exposes shopper CTAs on Home and Catalog cards',()=>{
    const catalog=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='catalog')!;
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='home')!;
    const catalogTitle=walk(catalog.sections).find(node=>node.id==='loot-vault-loot-v2-catalog-title')!;
    const catalogTitleStyle=catalogTitle.config.style as any;
    const effectiveMobile={...(catalogTitleStyle?.base??{}),...(catalogTitleStyle?.mobile??{})};
    expect(effectiveMobile.maxWidth).toBe('100%');
    expect(effectiveMobile.lineHeight).toBeGreaterThanOrEqual(1);
    expect(effectiveMobile.whiteSpace??'normal').not.toBe('nowrap');
    expect(effectiveMobile.wordBreak??'normal').toBe('normal');
    expect(effectiveMobile.overflowWrap??'normal').toBe('normal');
    const catalogGrid=walk(catalog.sections).find(node=>node.id==='loot-vault-loot-v2-catalog-products')!;
    const homeGrid=walk(home.sections).find(node=>node.id==='loot-vault-loot-v2-product-grid')!;
    expect(catalogGrid.config.showCta).toBe(true);
    expect(homeGrid.config.showCta).toBe(true);
    const universe=walk(home.sections).find(node=>node.id==='loot-vault-loot-v2-universe-grid')!;
    expect((universe.config.style as any).mobile.gridTemplateColumns).toBe('repeat(2,minmax(0,1fr))');
    expect((universe.config.style as any).mobile.overflowX).toBe('visible');
  });
  it('opts Collection into the shared account capability authority through canonical metadata',()=>{
    const home=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='home')!;
    const account=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(item=>item.pageType==='account')!;
    expect(home.metadata?.collectionTracker).toBe('shared-account-capability-v1');
    expect(account.metadata?.collectionTracker).toBe('shared-account-capability-v1');
    expect(account.metadata?.accountCapabilities).toEqual(['collection']);
    expect((account.metadata?.accountCompleteness as any)?.navigationAuthority).toBe('shared-account-capabilities');
    expect(JSON.stringify(account)).not.toContain('account.capability-navigation');
  });

  it('keeps the approved Commerce Shell contracts shared and template-safe',()=>{
    const shared=readFileSync('src/components/builder/storefront-commerce.tsx','utf8');
    const preview=readFileSync('src/components/builder/storefront-template-preview-runtime.tsx','utf8');
    const checkout=readFileSync('src/components/checkout/checkout-form.tsx','utf8');
    expect(shared).toContain('data-gallery-authority="single-main-with-thumbnails"');
    expect(shared).toContain("thumbnailPosition=text(config.thumbnailPosition,'left')");
    expect(shared).toContain("if(thumbnailPosition==='left')");
    expect(shared).toContain('data-thumbnail-position="left"');
    expect(shared).toContain('data-thumbnail-position={thumbnailPosition}');
    expect(shared).not.toContain("templateKey==='gaming.loot-vault'");
    expect(preview).toContain('<CartView freeShippingThreshold={20000} products={products}/>');
    expect(preview).toContain('<CheckoutForm');
    expect(preview).not.toContain('function PreviewCartSummary');
    expect(preview).not.toContain('function PreviewCheckoutSummary');
    expect(checkout).toContain("setError('Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.')");
    const refreshQuote=checkout.slice(checkout.indexOf('async function refreshQuote'),checkout.indexOf('useEffect(()=>{const t=setTimeout'));
    expect(refreshQuote).toContain("fetch('/api/checkout/quote'");
    expect(refreshQuote).not.toContain('if(acceptancePreview)');
    expect(checkout.indexOf("if(acceptancePreview)")).toBeLessThan(checkout.indexOf("fetch('/api/orders'"));
  });

  it('keeps Loot Vault CTA geometry consistent while filter chips remain a separate family',()=>{
    const buttons=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.flatMap(page=>walk(page.sections)).filter(node=>node.componentKey==='content.button');
    const normal=buttons.filter(node=>!node.id.includes('catalog-universe-chip'));
    expect(normal.length).toBeGreaterThan(0);
    expect(normal.every(node=>{
      const style=node.config.style as any;
      return String(style?.base?.borderRadius??style?.borderRadius)==='10px';
    })).toBe(true);
    const commerceCss=readFileSync('src/components/checkout/checkout-guided.module.css','utf8');
    expect(commerceCss).toContain('--checkout-button-radius:var(--shoporation-commerce-button-radius,10px)');
  });

  it('keeps Shipping and Payment separate and removes the combined route from shopper navigation',()=>{
    const serialized=JSON.stringify(LOOT_VAULT_V2_TEMPLATE_PACKAGE);
    expect(serialized).toContain('/szallitas');
    expect(serialized).toContain('/fizetes');
    expect(serialized).not.toContain('/szallitas-es-fizetes');
    const slugs=(LOOT_VAULT_V2_TEMPLATE_PACKAGE.demoFixtures??[]).filter(item=>item.entityType==='content').map(item=>String((item.payload as Record<string,unknown>).slug??''));
    expect(slugs).toContain('szallitas');
    expect(slugs).toContain('fizetes');
    expect(slugs).not.toContain('szallitas-es-fizetes');
    const handoff=readFileSync('scripts/template-factory-product-owner-handoff.mjs','utf8');
    expect(handoff).toContain("name:'Szállítás',exact:true");
    expect(handoff).toContain("name:'Fizetés',exact:true");
    expect(handoff).not.toContain("name:'Szállítás és fizetés',exact:true");
  });

});
