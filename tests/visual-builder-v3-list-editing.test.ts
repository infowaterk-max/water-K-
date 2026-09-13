import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {applyStorefrontBuilderMutation} from '@/lib/builder/storefront-visual-builder';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const alap={plan:'alap' as const,features:[...PLANS.alap.features]};
const fresh=()=>structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
const find=(page:StorefrontPageDocument,id:string)=>{
  let found:any;
  const walk=(nodes:any[])=>nodes.forEach(node=>{if(node.id===id)found=node;walk(node.children??[])});
  walk(page.sections);
  return found;
};

describe('Visual Builder v3 editable merchant lists',()=>{
  it('allows empty and non-empty list resizing through the canonical config mutation authority',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    let page=fresh();

    page=applyStorefrontBuilderMutation({
      document:page,
      registry,
      capability:alap,
      mutation:{type:'config',nodeId:'reference-header',key:'utilityItems',value:[]},
    });
    expect(find(page,'reference-header').config.utilityItems).toEqual([]);

    page=applyStorefrontBuilderMutation({
      document:page,
      registry,
      capability:alap,
      mutation:{type:'config',nodeId:'reference-header',key:'utilityItems',value:[{label:'Keresés',href:'/kereses',symbol:'⌕'}]},
    });
    expect(find(page,'reference-header').config.utilityItems).toHaveLength(1);

    page=applyStorefrontBuilderMutation({
      document:page,
      registry,
      capability:alap,
      mutation:{type:'config',nodeId:'reference-header',key:'utilityItems',value:[
        {label:'Keresés',href:'/kereses',symbol:'⌕'},
        {label:'Fiók',href:'/fiokom',symbol:'○'},
      ]},
    });
    expect(find(page,'reference-header').config.utilityItems).toHaveLength(2);

    page=applyStorefrontBuilderMutation({
      document:page,
      registry,
      capability:alap,
      mutation:{type:'config',nodeId:'reference-header',key:'utilityItems',value:[{label:'Fiók',href:'/fiokom',symbol:'○'}]},
    });
    expect(find(page,'reference-header').config.utilityItems).toEqual([{label:'Fiók',href:'/fiokom',symbol:'○'}]);
  });

  it('still rejects incompatible list item shapes',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    let page=fresh();
    page=applyStorefrontBuilderMutation({
      document:page,
      registry,
      capability:alap,
      mutation:{type:'config',nodeId:'reference-header',key:'utilityItems',value:[{label:'Keresés',href:'/kereses',symbol:'⌕'}]},
    });
    expect(()=>applyStorefrontBuilderMutation({
      document:page,
      registry,
      capability:alap,
      mutation:{type:'config',nodeId:'reference-header',key:'utilityItems',value:[{unexpected:true}]},
    })).toThrow('BUILDER_CONFIG_SHAPE_CHANGE_FORBIDDEN');
  });
});
