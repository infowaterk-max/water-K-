import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {materializeStorefrontFidelityPage,readStorefrontFidelityMetadata,type StorefrontFidelityPreset} from '@/lib/builder/storefront-fidelity-engine';
import {
  clearStorefrontResponsiveOrder,
  moveStorefrontChildAtViewport,
  moveStorefrontSectionAtViewport,
  resetStorefrontFidelityComposition,
  setStorefrontDesignGuardMode,
  setStorefrontFidelityEditMode,
  setStorefrontImageArtDirection,
  setStorefrontResponsiveChildOrder,
  setStorefrontResponsiveSectionOrder,
} from '@/lib/builder/storefront-fidelity-builder-operations';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,pageKey:'ops.home',pageType:'home',templateKey:'reference.ops',templateVersion:1,
  sections:[
    {id:'hero',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'xl'},children:[
      {id:'copy',componentKey:'content.text',componentVersion:1,config:{text:'Copy',as:'p',align:'left',tone:'text'}},
      {id:'media',componentKey:'content.image',componentVersion:1,config:{src:'/desktop.jpg',alt:'Hero',width:1200,height:800,fit:'cover',loading:'eager',radius:'none'}},
    ]},
    {id:'trust',componentKey:'layout.section',componentVersion:1,config:{tone:'surface',spacing:'s'}},
    {id:'products',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'l'}},
  ],
});
const preset:StorefrontFidelityPreset={presetId:'reference.ops',version:1,label:'Ops',pageType:'home',sectionOrder:{desktop:['hero','trust','products'],mobile:['hero','products','trust']},nodeOrder:{hero:{mobile:['media','copy']}},nodes:{hero:{config:{spacing:'none'}}}};

describe('Visual Builder fidelity operations',()=>{
  it('persists explicit Normal/Advanced/Expert mode and Design Guard mode',()=>{
    let document=setStorefrontFidelityEditMode(page(),'expert');
    document=setStorefrontDesignGuardMode(document,'warn');
    expect(readStorefrontFidelityMetadata(document)).toMatchObject({editMode:'expert',designGuard:{mode:'warn'}});
  });

  it('moves sections independently per viewport without changing canonical source order',()=>{
    let document=setStorefrontResponsiveSectionOrder(page(),'desktop',['hero','trust','products']);
    document=moveStorefrontSectionAtViewport(document,'mobile','products',1);
    expect(document.sections.map(section=>section.id)).toEqual(['hero','trust','products']);
    expect(materializeStorefrontFidelityPage(document,'desktop').sections.map(section=>section.id)).toEqual(['hero','trust','products']);
    expect(materializeStorefrontFidelityPage(document,'mobile').sections.map(section=>section.id)).toEqual(['hero','products','trust']);
  });

  it('moves children independently per viewport and can clear an override back to inherited order',()=>{
    let document=setStorefrontResponsiveChildOrder(page(),'hero','desktop',['copy','media']);
    document=moveStorefrontChildAtViewport(document,'hero','mobile','media',0);
    expect(materializeStorefrontFidelityPage(document,'mobile').sections[0].children?.map(child=>child.id)).toEqual(['media','copy']);
    document=clearStorefrontResponsiveOrder(document,{parentId:'hero',viewport:'mobile'});
    expect(materializeStorefrontFidelityPage(document,'mobile').sections[0].children?.map(child=>child.id)).toEqual(['copy','media']);
  });

  it('edits responsive image art direction on a real image node',()=>{
    const document=setStorefrontImageArtDirection(page(),'media',{desktop:{objectPosition:'50% 40%'},mobile:{src:'/mobile.jpg',objectPosition:'75% center'}});
    const mobile=materializeStorefrontFidelityPage(document,'mobile');
    expect(mobile.sections[0].children?.[1].config).toMatchObject({src:'/mobile.jpg',objectPosition:'75% center'});
  });

  it('resets visual composition to a preset without replacing content fields',()=>{
    const source=page();source.sections[0].config.title='Merchant title';source.sections[0].config.spacing='2xl';
    const reset=resetStorefrontFidelityComposition(source,preset);
    expect(reset.sections[0].config.title).toBe('Merchant title');
    expect(reset.sections[0].config.spacing).toBe('none');
    expect(materializeStorefrontFidelityPage(reset,'mobile').sections.map(section=>section.id)).toEqual(['hero','products','trust']);
  });
});
