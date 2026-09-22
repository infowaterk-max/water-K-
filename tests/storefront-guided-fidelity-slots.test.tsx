import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontGuidedFinderRendererRegistry} from '@/components/builder/storefront-guided-finder';
import {createStorefrontGuidedFinderComponentRegistry} from '@/lib/builder/storefront-guided-finder';
import {PLANS} from '@/lib/plans/catalog';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const page:StorefrontPageDocument={schemaVersion:1,pageKey:'finder-fidelity.home',pageType:'home',templateKey:'reference.finder-fidelity',templateVersion:1,sections:[{id:'section',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'none',width:'full'},children:[{id:'finder',componentKey:'guided.finder',componentVersion:1,config:{presentation:'editorial-choice-grid',title:'Formula Finder',copy:'Válassz célt.',columns:3,options:[{id:'a',label:'Fényesség',href:'#a',selected:true},{id:'b',label:'Hidratálás',href:'#b'}],actionLabel:'Mutasd',actionHref:'#results',styleSlots:{root:{base:{backgroundColor:'#fffafd'}},title:{base:{fontSize:'3.25rem',letterSpacing:'-0.05em'}},optionActive:{base:{backgroundColor:'#e6dbff'}},action:{base:{borderRadius:'0px'}}}}}]}]};
const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Guided Finder fidelity style slots',()=>{
  it('styles named internal parts through the shared renderer without template branches',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={page} viewport="desktop" bindingContext={{}} componentRegistry={createStorefrontGuidedFinderComponentRegistry()} rendererRegistry={createStorefrontGuidedFinderRendererRegistry()} capability={capability}/>);
    expect(html).toContain('background-color:#fffafd');
    expect(html).toContain('font-size:3.25rem');
    expect(html).toContain('background-color:#e6dbff');
    expect(html).toContain('border-radius:0px');
  });
});
