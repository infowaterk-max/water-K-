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
  setStorefrontLayerViewportGeometry,
  setStorefrontNodeStyleSlot,
  setStorefrontNodeTypography,
  setStorefrontNodeViewportStyle,
  setStorefrontResponsiveChildOrder,
  setStorefrontResponsiveSectionOrder,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {resolveStorefrontTypography} from '@/lib/builder/storefront-fidelity-typography';
import {resolveStorefrontStyleSlot} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

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
const layeredPage=():StorefrontPageDocument=>({
  schemaVersion:1,pageKey:'ops.layers',pageType:'home',templateKey:'reference.ops',templateVersion:1,
  sections:[{id:'hero',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'none'},children:[
    {id:'canvas',componentKey:'visual.layered-canvas',componentVersion:1,config:{height:'hero',tone:'background',radius:'none'},children:[
      {id:'layer',componentKey:'visual.layer',componentVersion:1,config:{position:'center',width:'medium',style:{mobile:{backgroundColor:'#fff'}}},children:[
        {id:'layer-copy',componentKey:'content.text',componentVersion:1,config:{text:'Layer',as:'p',align:'left',tone:'text'}},
      ]},
    ]},
  ]}],
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

  it('writes sanitized viewport typography through one canonical node operation',()=>{
    const document=setStorefrontNodeTypography(page(),'copy','mobile',{fontToken:'display',fontSizeRem:2.25,fontWeight:725,lineHeight:1.05,letterSpacingEm:-.04,maxWidthCh:19});
    const copy=document.sections[0].children?.[0];
    expect(resolveStorefrontTypography(copy?.config.typography,'mobile')).toMatchObject({
      fontFamily:'var(--shoporation-display-font, var(--shoporation-heading-font, Georgia, serif))',
      fontSize:'2.25rem',fontWeight:750,lineHeight:1.05,letterSpacing:'-0.04em',maxWidth:'19ch',
    });
  });

  it('writes responsive root styles and named style slots without unsafe properties',()=>{
    let document=setStorefrontNodeViewportStyle(page(),'hero','tablet',{paddingBlock:'1rem',position:'fixed',color:'#111'} as never);
    document=setStorefrontNodeStyleSlot(document,'hero','inner','mobile',{gap:'.5rem',backgroundImage:'url(https://bad.example/x)' as never} as never);
    const hero=document.sections[0];
    expect(resolveStorefrontVisualStyle(hero.config.style,'tablet')).toMatchObject({paddingBlock:'1rem',color:'#111'});
    expect(resolveStorefrontVisualStyle(hero.config.style,'tablet')).not.toHaveProperty('position');
    expect(resolveStorefrontStyleSlot(hero.config.styleSlots,'inner','mobile')).toEqual({gap:'.5rem'});
  });

  it('positions layers only inside the shared layered canvas and preserves unrelated viewport style',()=>{
    let document=setStorefrontLayerViewportGeometry(layeredPage(),'layer','mobile',{anchor:'center-right',offsetXPercent:6,offsetYPercent:-8,widthPercent:42,heightPercent:65,zIndex:8,opacity:.9});
    let layer=document.sections[0].children?.[0].children?.[0];
    expect(resolveStorefrontVisualStyle(layer?.config.style,'mobile')).toMatchObject({
      position:'absolute',right:'6%',top:'calc(50% + -8%)',transform:'translateY(-50%)',width:'42%',height:'65%',zIndex:8,opacity:.9,backgroundColor:'#fff',
    });
    document=setStorefrontLayerViewportGeometry(document,'layer','mobile',{anchor:'top-left',offsetXPercent:4,offsetYPercent:3});
    layer=document.sections[0].children?.[0].children?.[0];
    expect(resolveStorefrontVisualStyle(layer?.config.style,'mobile')).toMatchObject({position:'absolute',left:'4%',top:'3%',transform:'none',width:'42%',height:'65%',backgroundColor:'#fff'});
    document=setStorefrontLayerViewportGeometry(document,'layer','mobile',null);
    layer=document.sections[0].children?.[0].children?.[0];
    expect(resolveStorefrontVisualStyle(layer?.config.style,'mobile')).toEqual({backgroundColor:'#fff'});
    expect(()=>setStorefrontLayerViewportGeometry(page(),'copy','mobile',{anchor:'center'})).toThrow('FIDELITY_LAYER_REQUIRED');
  });

  it('resets visual composition to a preset without replacing content fields',()=>{
    const source=page();source.sections[0].config.title='Merchant title';source.sections[0].config.spacing='2xl';
    const reset=resetStorefrontFidelityComposition(source,preset);
    expect(reset.sections[0].config.title).toBe('Merchant title');
    expect(reset.sections[0].config.spacing).toBe('none');
    expect(materializeStorefrontFidelityPage(reset,'mobile').sections.map(section=>section.id)).toEqual(['hero','products','trust']);
  });
});
