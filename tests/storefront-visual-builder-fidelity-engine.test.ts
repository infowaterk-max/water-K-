import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_FIDELITY_ENGINE_VERSION,
  applyStorefrontFidelityPreset,
  evaluateStorefrontDesignGuard,
  evaluateStorefrontFidelityDrift,
  materializeStorefrontFidelityPage,
  readStorefrontFidelityMetadata,
  reorderStorefrontSections,
  resolveStorefrontChildOrder,
  resolveStorefrontImageArtDirection,
  resolveStorefrontSectionOrder,
  resolveStorefrontStyleSlot,
  sanitizeStorefrontStyleSlots,
  writeStorefrontFidelityMetadata,
  type StorefrontFidelityPreset,
} from '@/lib/builder/storefront-fidelity-engine';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'fidelity.home',
  pageType:'home',
  templateKey:'reference.fidelity',
  templateVersion:1,
  sections:[
    {id:'hero',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'xl',style:{base:{paddingBlock:'4rem'}}},children:[
      {id:'hero-copy',componentKey:'content.text',componentVersion:1,config:{text:'Hero copy',as:'p',align:'left',tone:'text'}},
      {id:'hero-image',componentKey:'content.image',componentVersion:1,config:{src:'/desktop.jpg',alt:'Hero',width:1200,height:800,fit:'cover',loading:'eager',radius:'none',objectPosition:'50% 50%',artDirection:{mobile:{src:'/mobile.jpg',objectPosition:'72% center',aspectRatio:'4 / 5'}}}},
    ]},
    {id:'trust',componentKey:'layout.section',componentVersion:1,config:{tone:'surface',spacing:'s'}},
    {id:'featured',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'l'}},
    {id:'finder',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'l'}},
  ],
});

const preset:StorefrontFidelityPreset={
  presetId:'beauty.reference.home',
  version:2,
  label:'Beauty reference Home',
  pageType:'home',
  sectionOrder:{desktop:['hero','trust','finder','featured'],mobile:['hero','trust','featured','finder']},
  nodeOrder:{hero:{desktop:['hero-copy','hero-image'],mobile:['hero-image','hero-copy']}},
  protectedNodeIds:['hero','trust'],
  nodes:{
    hero:{config:{spacing:'none',style:{base:{paddingBlock:0},mobile:{minHeight:'24rem'}},styleSlots:{title:{base:{fontSize:'5rem'},mobile:{fontSize:'2.75rem'}}}}},
    featured:{config:{spacing:'s'}},
  },
};

describe('Visual Builder Fidelity Engine foundation',()=>{
  it('stores versioned fidelity metadata without replacing unrelated page metadata',()=>{
    const source={...page(),metadata:{owner:'merchant'}};
    const next=writeStorefrontFidelityMetadata(source,{editMode:'advanced',sectionOrder:{mobile:['hero','trust','featured','finder']}});
    expect(next.metadata?.owner).toBe('merchant');
    expect(readStorefrontFidelityMetadata(next)).toMatchObject({engineVersion:STOREFRONT_FIDELITY_ENGINE_VERSION,editMode:'advanced'});
  });

  it('resolves independent responsive section composition with inheritance and appends unspecified sections safely',()=>{
    const configured=writeStorefrontFidelityMetadata(page(),{sectionOrder:{desktop:['hero','trust','finder'],mobile:['hero','trust','featured']}});
    expect(resolveStorefrontSectionOrder(configured,'desktop')).toEqual(['hero','trust','finder','featured']);
    expect(resolveStorefrontSectionOrder(configured,'tablet')).toEqual(['hero','trust','finder','featured']);
    expect(resolveStorefrontSectionOrder(configured,'mobile')).toEqual(['hero','trust','featured','finder']);
    expect(reorderStorefrontSections(configured,'mobile').map(section=>section.id)).toEqual(['hero','trust','featured','finder']);
  });

  it('resolves child order independently per viewport',()=>{
    const configured=writeStorefrontFidelityMetadata(page(),{nodeOrder:{hero:{desktop:['hero-copy','hero-image'],mobile:['hero-image','hero-copy']}}});
    const hero=configured.sections[0];
    expect(resolveStorefrontChildOrder(configured,hero,'tablet')).toEqual(['hero-copy','hero-image']);
    expect(resolveStorefrontChildOrder(configured,hero,'mobile')).toEqual(['hero-image','hero-copy']);
  });

  it('supports responsive image art direction instead of forcing one desktop crop everywhere',()=>{
    const art={
      base:{src:'https://images.example.test/desktop.jpg',objectFit:'cover' as const,objectPosition:'50% 40%'},
      tablet:{objectPosition:'60% 50%'},
      mobile:{src:'/mobile.jpg',objectPosition:'72% center',aspectRatio:'4 / 5'},
    };
    expect(resolveStorefrontImageArtDirection(art,'desktop')).toMatchObject({src:'https://images.example.test/desktop.jpg',objectPosition:'50% 40%',objectFit:'cover'});
    expect(resolveStorefrontImageArtDirection(art,'tablet')).toMatchObject({src:'https://images.example.test/desktop.jpg',objectPosition:'60% 50%'});
    expect(resolveStorefrontImageArtDirection(art,'mobile')).toMatchObject({src:'/mobile.jpg',objectPosition:'72% center',aspectRatio:'4 / 5'});
  });

  it('materializes section order, child order and image art direction into the existing Page Schema tree',()=>{
    const configured=writeStorefrontFidelityMetadata(page(),{sectionOrder:preset.sectionOrder,nodeOrder:preset.nodeOrder});
    const mobile=materializeStorefrontFidelityPage(configured,'mobile');
    expect(mobile.sections.map(section=>section.id)).toEqual(['hero','trust','featured','finder']);
    expect(mobile.sections[0].children?.map(child=>child.id)).toEqual(['hero-image','hero-copy']);
    expect(mobile.sections[0].children?.[0].config).toMatchObject({src:'/mobile.jpg',objectPosition:'72% center'});
    expect(mobile.sections[0].children?.[0].config.style).toMatchObject({base:{aspectRatio:'4 / 5'}});
  });

  it('sanitizes named component style slots and resolves them by viewport',()=>{
    const slots=sanitizeStorefrontStyleSlots({
      title:{base:{fontSize:'4rem',color:'#111111'},mobile:{fontSize:'2.5rem'}},
      media:{base:{borderRadius:0,objectFit:'cover'}},
      'bad slot':{base:{position:'fixed'}},
    });
    expect(Object.keys(slots)).toEqual(['title','media']);
    expect(resolveStorefrontStyleSlot(slots,'title','mobile')).toMatchObject({fontSize:'2.5rem',color:'#111111'});
  });

  it('applies only visual preset keys while preserving merchant content',()=>{
    const source=page();
    source.sections[0].config={...source.sections[0].config,text:'Merchant hero copy',href:'/merchant-link'};
    const next=applyStorefrontFidelityPreset(source,preset);
    expect(next.sections[0].config.text).toBe('Merchant hero copy');
    expect(next.sections[0].config.href).toBe('/merchant-link');
    expect(next.sections[0].config.spacing).toBe('none');
    expect(next.sections[0].config.styleSlots).toBeTruthy();
    expect(readStorefrontFidelityMetadata(next)?.designGuard).toMatchObject({presetId:'beauty.reference.home',baselineVersion:2});
  });

  it('detects visual drift without treating normal merchant copy edits as design drift',()=>{
    const baseline=applyStorefrontFidelityPreset(page(),preset);
    const copyOnly=structuredClone(baseline);
    copyOnly.sections[0].config.text='Updated merchant copy';
    expect(evaluateStorefrontFidelityDrift(copyOnly,preset).score).toBe(0);
    const changed=structuredClone(baseline);
    changed.sections[0].config.spacing='2xl';
    const report=evaluateStorefrontFidelityDrift(changed,preset);
    expect(report.changedNodeIds).toContain('hero');
    expect(report.score).toBeGreaterThan(0);
  });

  it('supports warn and enforce design-guard decisions',()=>{
    let guarded=applyStorefrontFidelityPreset(page(),preset);
    const current=readStorefrontFidelityMetadata(guarded)!;
    guarded=writeStorefrontFidelityMetadata(guarded,{editMode:current.editMode,sectionOrder:current.sectionOrder,nodeOrder:current.nodeOrder,designGuard:{mode:'warn',presetId:preset.presetId,baselineVersion:preset.version,protectedNodeIds:preset.protectedNodeIds}});
    guarded.sections[0].config.spacing='2xl';
    expect(evaluateStorefrontDesignGuard(guarded,preset)).toMatchObject({mode:'warn',allowed:true,warning:true});
    const warned=readStorefrontFidelityMetadata(guarded)!;
    const enforced=writeStorefrontFidelityMetadata(guarded,{editMode:warned.editMode,sectionOrder:warned.sectionOrder,nodeOrder:warned.nodeOrder,designGuard:{mode:'enforce',presetId:preset.presetId,baselineVersion:preset.version,protectedNodeIds:preset.protectedNodeIds}});
    expect(evaluateStorefrontDesignGuard(enforced,preset).allowed).toBe(false);
  });
});
