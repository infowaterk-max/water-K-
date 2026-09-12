import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {writeStorefrontFidelityMetadata} from '@/lib/builder/storefront-fidelity-engine';
import {assertSafeStorefrontFidelityDocument} from '@/lib/builder/storefront-fidelity-security';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'security.home',
  pageType:'home',
  templateKey:'reference.security',
  templateVersion:1,
  sections:[
    {id:'hero',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'l'},children:[
      {id:'copy',componentKey:'content.text',componentVersion:1,config:{text:'Hello',as:'p',align:'left',tone:'text'}},
      {id:'image',componentKey:'content.image',componentVersion:1,config:{src:'/hero.jpg',alt:'Hero',width:1200,height:800,fit:'cover',loading:'eager',radius:'none'}},
    ]},
    {id:'featured',componentKey:'layout.section',componentVersion:1,config:{tone:'surface',spacing:'m'}},
  ],
});

describe('Visual Builder fidelity security contract',()=>{
  it('accepts valid versioned metadata and responsive composition',()=>{
    const source=writeStorefrontFidelityMetadata(page(),{
      editMode:'advanced',
      sectionOrder:{desktop:['hero','featured'],mobile:['featured','hero']},
      nodeOrder:{hero:{mobile:['image','copy']}},
      designGuard:{mode:'warn',presetId:'beauty.reference.home',baselineVersion:2,protectedNodeIds:['hero']},
    });
    expect(()=>assertSafeStorefrontFidelityDocument(source)).not.toThrow();
  });

  it('rejects unknown or duplicated responsive node references',()=>{
    const unknown=writeStorefrontFidelityMetadata(page(),{sectionOrder:{mobile:['hero','missing']}});
    expect(()=>assertSafeStorefrontFidelityDocument(unknown)).toThrow('FIDELITY_SECURITY_SECTION_NODE_INVALID');
    const duplicate=writeStorefrontFidelityMetadata(page(),{sectionOrder:{mobile:['hero','hero']}});
    expect(()=>assertSafeStorefrontFidelityDocument(duplicate)).toThrow('FIDELITY_SECURITY_SECTION_NODE_DUPLICATE');
  });

  it('rejects malformed expert metadata instead of persisting arbitrary values',()=>{
    const source=page();
    source.metadata={fidelity:{engineVersion:'shoporation.visual-builder-fidelity-engine.v1',editMode:'root',designGuard:{mode:'bypass'}}};
    expect(()=>assertSafeStorefrontFidelityDocument(source)).toThrow('FIDELITY_SECURITY_EDIT_MODE_INVALID');
  });

  it('requires protected design-guard nodes to exist in the actual Page Schema',()=>{
    const source=writeStorefrontFidelityMetadata(page(),{designGuard:{mode:'enforce',presetId:'reference.home',baselineVersion:1,protectedNodeIds:['missing']}});
    expect(()=>assertSafeStorefrontFidelityDocument(source)).toThrow('FIDELITY_SECURITY_PROTECTED_NODE_INVALID');
  });
});
