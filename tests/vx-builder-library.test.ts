import {describe,expect,it} from 'vitest';
import {createStorefrontBuilderPresetLibrary} from '@/lib/builder/storefront-preset-application';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES} from '@/lib/builder/storefront-template-catalog';
import {
  VX_LIBRARY_PREVIEW_NODE_BUDGET,
  describeVxComponent,
  describeVxPageTemplate,
  describeVxSectionPreset,
  filterVxLibraryItems,
  vxLibraryMatchesSearch,
} from '@/lib/builder/vx-builder-library';

describe('VX Builder Library 2.0 descriptors',()=>{
  it('classifies common component families without granting insertion authority',()=>{
    expect(describeVxComponent('commerce.product-grid','Termékrács').kind).toBe('commerce');
    expect(describeVxComponent('system.navigation','Navigáció').category).toBe('navigation');
    expect(describeVxComponent('content.image','Kép').category).toBe('media');
    expect(describeVxComponent('content.heading','Címsor').kind).toBe('text');
    expect(describeVxComponent('future.unknown-widget','Ismeretlen').kind).toBe('generic');
  });

  it('creates bounded section descriptors from canonical preset fragments',()=>{
    const template=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES[0]!;
    const page=template.pages[0]!;
    const library=createStorefrontBuilderPresetLibrary(template,structuredClone(page));
    const preset=library.sectionPresets[0]!;
    const descriptor=describeVxSectionPreset(preset);
    expect(descriptor.nodeCount).toBeGreaterThan(0);
    expect(descriptor.nodeCount).toBeLessThanOrEqual(VX_LIBRARY_PREVIEW_NODE_BUDGET);
    expect(descriptor.componentKeys.length).toBeGreaterThan(0);
  });

  it('normalizes Hungarian accents for merchant search',()=>{
    const descriptor=describeVxComponent('content.heading','Címsor');
    expect(vxLibraryMatchesSearch(descriptor,'Címsor','cimsor')).toBe(true);
  });

  it('filters only the supplied safe candidate set by category and query',()=>{
    const items=[
      {key:'content.heading',label:'Címsor'},
      {key:'commerce.product-grid',label:'Termékrács'},
    ];
    const filtered=filterVxLibraryItems(items,{describe:item=>describeVxComponent(item.key,item.label),label:item=>item.label,category:'commerce',query:'termek'});
    expect(filtered).toEqual([items[1]]);
  });

  it('maps page templates to semantic previews without materializing pages',()=>{
    const descriptor=describeVxPageTemplate({presetId:'p',label:'Kapcsolat',sourcePageKey:'contact',pageType:'contact',canApplyToCurrent:true,canCreateNew:false});
    expect(descriptor.kind).toBe('form');
    expect(descriptor.nodeCount).toBe(1);
  });
});
