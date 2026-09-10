import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontStoryVisualRendererRegistry} from '@/components/builder/storefront-story-visual';
import {createStorefrontStoryVisualComponentRegistry} from '@/lib/builder/storefront-story-visual';
import {PLANS} from '@/lib/plans/catalog';
import {RITUAL_HOUSE_ENGINE_CONTRACT,RITUAL_HOUSE_HOME_PAGE,RITUAL_HOUSE_HOME_SECTION_ORDER,RITUAL_HOUSE_MARKETING_LAYER_CONTRACT,RITUAL_HOUSE_PRODUCT_PAGE,RITUAL_HOUSE_TEMPLATE_KEY,RITUAL_HOUSE_TEMPLATE_PACKAGE,RITUAL_HOUSE_TEMPLATE_VERSION,RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const componentRegistry=()=>createStorefrontStoryVisualComponentRegistry();
const rendererRegistry=()=>createStorefrontStoryVisualRendererRegistry();

describe('Scale-out Ritual House template',()=>{
  it('locks the warm dark sensory identity and shared engine boundary',()=>{
    expect(RITUAL_HOUSE_TEMPLATE_KEY).toBe('beauty.ritual-house');
    expect(RITUAL_HOUSE_TEMPLATE_VERSION).toBe(1);
    expect(RITUAL_HOUSE_VISUAL_DNA.character).toBe('warm-dark-sensory-home-wellness-beauty-ritual-commerce');
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).toBe('mood-to-ritual-to-format-to-scent-or-ingredient-to-product');
    expect(RITUAL_HOUSE_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['clinical-skincare','medical-aromatherapy','health-outcome-claims','pure-home-decor-store','cold-white-lab','black-box-wellness-score']));
    expect(RITUAL_HOUSE_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
  });

  it('ships 14 Alap-compatible presets through the shared Story + Visual registry',()=>{
    const registry=componentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:RITUAL_HOUSE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(x=>x.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.map(x=>x.pageType)).size).toBe(14);
    for(const page of RITUAL_HOUSE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('locks the accepted Home journey and independent hero layers',()=>{
    expect(RITUAL_HOUSE_HOME_PAGE.metadata?.sectionOrder).toEqual(RITUAL_HOUSE_HOME_SECTION_ORDER);
    expect(RITUAL_HOUSE_HOME_SECTION_ORDER).toEqual(['Atmosphere Hero','Ritual by Mood','Bath & Body','Home Fragrance','Evening Ritual Story','Featured Ritual Sets','Scent & Ingredient Notes','Reviews','Journal','Footer']);
    expect(RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','eyebrow','heading','copy','primary-cta','secondary-cta']);
    const source=JSON.stringify(RITUAL_HOUSE_HOME_PAGE);
    for(const id of ['ritual-hero-image-layer','ritual-hero-overlay-layer','ritual-hero-decoration-layer','ritual-hero-eyebrow-layer','ritual-hero-heading-layer','ritual-hero-copy-layer','ritual-hero-primary-cta-layer','ritual-hero-secondary-cta-layer'])expect(source).toContain(id);
  });

  it('renders a layered cocooning hero with body care, home fragrance and journal surfaces',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={RITUAL_HOUSE_HOME_PAGE} viewport="desktop" bindingContext={{brand:{name:'House Nocturne',homeHref:'/',copyright:'© House Nocturne'},navigation:{primary:[],footer:[]},content:{atmosphereHero:{eyebrow:'HOUSE RITUALS',title:'Esti fények, puha textúrák',copy:'Saját ritmus, saját tér.',primaryLabel:'Rituálék',primaryHref:'#ritual-by-mood',secondaryLabel:'Journal',secondaryHref:'#ritual-journal'},ritualBathBody:{title:'Fürdő & test'},ritualHomeFragrance:{title:'Otthoni illatok'},eveningRitual:{title:'Saját esti rituálé'},ritualFeaturedSets:{title:'Rituálé szettek'}},collection:{ritualMoods:[{id:'cocoon',label:'Bekuckózás',href:'/webaruhaz?mood=cocoon'}]},catalog:{bathBody:[{id:'oil',name:'Amber Body Oil',href:'/termek/amber-body-oil',price:'9 990 Ft'},{id:'cream',name:'Soft Body Cream',href:'/termek/soft-body-cream',price:'8 490 Ft'}],homeFragrance:[{id:'candle',name:'Cedar Candle',href:'/termek/cedar-candle',price:'7 990 Ft'},{id:'diffuser',name:'Quiet Reed Diffuser',href:'/termek/quiet-diffuser',price:'10 990 Ft'}],ritualSets:[],scentAndIngredientNotes:[{specKey:'cedar',label:'Cédrus',displayValue:'fás illatjegy'},{specKey:'almond-oil',label:'Mandulaolaj',displayValue:'összetevő'}]},reviews:{rating:4.8,count:104,summary:'Vásárlói tapasztalatok',href:'#reviews'},story:{journal:{items:[{id:'evening',storyType:'journal',title:'Az esti rituálé',href:'/blog/esti-rituale',excerpt:'Fény, illat és textúra.'}]}}}} componentRegistry={componentRegistry()} rendererRegistry={rendererRegistry()} capability={capability}/>);
    expect(html).toContain('data-storefront-visual="layered-canvas"');
    expect(html.match(/data-storefront-visual="layer"/g)?.length).toBeGreaterThanOrEqual(8);
    expect(html).toContain('Esti fények, puha textúrák');
    expect(html).toContain('Saját ritmus, saját tér.');
    expect(html).toContain('HOUSE RITUALS');
    expect(html).toContain('Amber Body Oil');
    expect(html).toContain('Soft Body Cream');
    expect(html).toContain('Cedar Candle');
    expect(html).toContain('Quiet Reed Diffuser');
    expect(html).toContain('Bekuckózás');
    expect(html).toContain('data-storefront-story="index"');
    expect(html).toContain('House Nocturne');
  });

  it('renders the PDP as 7/12 + 5/12 with supplied E7 ritual and scent/ingredient evidence',()=>{
    const context={brand:{name:'House Nocturne',homeHref:'/'},navigation:{primary:[],footer:[]},product:{name:'Amber Body Oil',description:'Testolaj esti rituálékhoz.',gallery:[{src:'https://example.com/oil.jpg',alt:'Amber Body Oil'}],badges:['New'],keySpecs:[{specKey:'format',label:'Formátum',displayValue:'Testolaj'},{specKey:'scent-family',label:'Illatcsalád',displayValue:'Meleg-fás'}],specGroups:[{groupKey:'scent',label:'Illatjegyek',rows:[{specKey:'cedar',label:'Cédrus',displayValue:'fás'},{specKey:'amber',label:'Borostyán',displayValue:'meleg'}]},{groupKey:'ingredients',label:'Összetevők',rows:[{specKey:'almond-oil',label:'Mandulaolaj',displayValue:'igen'}]}]},pricing:{displayPrice:'9 990 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},variant:{optionLabel:'Méret',optionOptions:[{id:'100ml',label:'100 ml',href:'#100ml',available:true}]},commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},content:{productRitualStory:{title:'Helye az esti rituáléban'}},recommendations:{products:[]}};
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={RITUAL_HOUSE_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={componentRegistry()} rendererRegistry={rendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={RITUAL_HOUSE_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={componentRegistry()} rendererRegistry={rendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('Rituálé profil');
    expect(desktop).toContain('Illat, összetevők és használati adatok');
    expect(desktop).toContain('Cédrus');
    expect(desktop).toContain('Mandulaolaj');
    expect(desktop).toContain('Helye az esti rituáléban');
  });

  it('keeps demo content claim-safe and installation draft-only',()=>{
    for(const fixture of RITUAL_HOUSE_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/diagnos|cure|treat|gyógyít|betegség|terápia|insomnia|anxiety|stress relief|pain relief/i);
    const plan=planStorefrontTemplateInstallation({template:RITUAL_HOUSE_TEMPLATE_PACKAGE,componentRegistry:componentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(x=>x.namespace==='beauty-ritual-house')).toBe(true);
  });

  it('keeps template fallbacks non-authoritative and E13 checkout provider-neutral',()=>{
    const source=JSON.stringify(RITUAL_HOUSE_TEMPLATE_PACKAGE);
    const review=RITUAL_HOUSE_HOME_PAGE.sections.flatMap(x=>x.children??[]).flatMap(x=>x.children??[]).find(x=>x.id==='ritual-review-summary');
    expect(review?.bindings?.rating?.fallback).toBeNull();
    expect(review?.bindings?.count?.fallback).toBeNull();
    expect(source).not.toMatch(/stresszcsökkent|alvást javít|gyógyít|terápiás hatás|diagnózis/i);
    const checkout=RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.find(x=>x.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
