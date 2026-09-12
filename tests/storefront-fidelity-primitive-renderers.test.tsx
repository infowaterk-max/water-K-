import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import {createStorefrontPrimitiveComponentRegistry} from '@/lib/builder/storefront-primitives';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const page:StorefrontPageDocument={
  schemaVersion:1,
  pageKey:'fidelity-primitive.home',
  pageType:'home',
  templateKey:'reference.fidelity-primitive',
  templateVersion:1,
  sections:[{
    id:'section',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'none',width:'full',styleSlots:{root:{base:{backgroundColor:'#faf7ff'}},inner:{base:{maxWidth:'70rem'}}}},children:[
      {id:'title',componentKey:'content.heading',componentVersion:1,config:{text:'YOUR SKIN.\nYOUR FORMULA.',level:1,align:'left',tone:'text',typography:{base:{fontToken:'display',fluidSize:{minRem:3,maxRem:6,preferredVw:7},fontWeight:800,lineHeight:.88,letterSpacingEm:-.04,maxWidthCh:13,preserveLineBreaks:true},mobile:{fluidSize:{minRem:2.4,maxRem:3.1,preferredVw:10}}},styleSlots:{root:{base:{color:'#7c5aa6'}}}}},
    ],
  }],
};

const render=(viewport:'desktop'|'mobile')=>renderToStaticMarkup(<StorefrontRuntimeRenderer page={page} viewport={viewport} bindingContext={{}} componentRegistry={createStorefrontPrimitiveComponentRegistry()} rendererRegistry={createStorefrontPrimitiveRendererRegistry()}/>);

describe('Fidelity primitive renderer controls',()=>{
  it('applies safe named style slots without adding template-local renderers',()=>{
    const html=render('desktop');
    expect(html).toContain('background-color:#faf7ff');
    expect(html).toContain('max-width:70rem');
    expect(html).toContain('color:#7c5aa6');
  });

  it('renders responsive typography and deliberate line breaks through the shared heading primitive',()=>{
    const desktop=render('desktop');
    const mobile=render('mobile');
    expect(desktop).toContain('font-size:clamp(3rem, 7vw, 6rem)');
    expect(desktop).toContain('font-weight:800');
    expect(desktop).toContain('white-space:pre-line');
    expect(desktop).toContain('YOUR SKIN.\nYOUR FORMULA.');
    expect(mobile).toContain('font-size:clamp(2.4rem, 10vw, 3.1rem)');
  });
});
