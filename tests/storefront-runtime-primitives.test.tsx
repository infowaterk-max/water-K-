import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontPrimitiveRendererRegistry} from '@/components/builder/storefront-primitives';
import {
  STOREFRONT_NEUTRAL_REFERENCE_PAGE,
  STOREFRONT_PRIMITIVE_DEFINITIONS,
  createNeutralStorefrontTemplateRegistry,
  createStorefrontPrimitiveComponentRegistry,
} from '@/lib/builder/storefront-primitives';
import {validateStorefrontPageDocument,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

describe('storefront runtime shared primitives',()=>{
  it('registers the Wave 0C primitive set with protected header/navigation contracts',()=>{
    const registry=createStorefrontPrimitiveComponentRegistry();
    expect(registry.list()).toHaveLength(STOREFRONT_PRIMITIVE_DEFINITIONS.length);
    expect(registry.get('layout.section',1)?.allowsChildren).toBe(true);
    expect(registry.get('system.header',1)?.protectedSystem).toBe(true);
    expect(registry.get('system.navigation',1)?.protectedSystem).toBe(true);
    expect(registry.get('system.header',1)?.allowedChildren).toEqual(['system.navigation']);
  });

  it('validates and registers the neutral reference package without template-specific renderer branches',()=>{
    const components=createStorefrontPrimitiveComponentRegistry();
    const validation=validateStorefrontPageDocument(STOREFRONT_NEUTRAL_REFERENCE_PAGE,components,{plan:'alap',features:[]});
    expect(validation.ok).toBe(true);
    expect(validation.violations.filter(item=>item.severity==='error')).toEqual([]);

    const templates=createNeutralStorefrontTemplateRegistry();
    expect(templates.get('reference.neutral',1)?.pages[0]?.pageKey).toBe('reference.home');
  });

  it('renders the neutral desktop reference page through the registry-driven runtime',()=>{
    const html=renderToStaticMarkup(
      <StorefrontRuntimeRenderer
        page={STOREFRONT_NEUTRAL_REFERENCE_PAGE}
        viewport="desktop"
        bindingContext={{
          brand:{name:'Acme Merchant'},
          navigation:{primary:[{label:'Termékek',href:'/webaruhaz'},{label:'Kapcsolat',href:'/kapcsolat'}]},
        }}
        componentRegistry={createStorefrontPrimitiveComponentRegistry()}
        rendererRegistry={createStorefrontPrimitiveRendererRegistry()}
        capability={{plan:'alap',features:[]}}
      />,
    );

    expect(html).toContain('data-storefront-protected-system="header"');
    expect(html).toContain('data-storefront-protected-system="navigation"');
    expect(html).toContain('Acme Merchant');
    expect(html).toContain('Termékek');
    expect(html).toContain('Semleges storefront referencia');
    expect(html).toContain('href="/webaruhaz"');
    expect(html).toContain('span 7 / span 7');
  });

  it('applies mobile responsive reflow from the same Page Schema',()=>{
    const html=renderToStaticMarkup(
      <StorefrontRuntimeRenderer
        page={STOREFRONT_NEUTRAL_REFERENCE_PAGE}
        viewport="mobile"
        bindingContext={{brand:{name:'Mobile Merchant'},navigation:{primary:[]}}}
        componentRegistry={createStorefrontPrimitiveComponentRegistry()}
        rendererRegistry={createStorefrontPrimitiveRendererRegistry()}
        capability={{plan:'alap',features:[]}}
      />,
    );
    expect(html).toContain('Mobile Merchant');
    expect(html).toContain('span 12 / span 12');
  });

  it('fails closed when a protected header is given an unapproved child type',()=>{
    const invalid:StorefrontPageDocument=structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    invalid.sections[0].children=[{
      id:'illegal-header-heading',
      componentKey:'content.heading',
      componentVersion:1,
      config:{text:'Nem engedélyezett',level:2,align:'left',tone:'text'},
    }];
    const validation=validateStorefrontPageDocument(invalid,createStorefrontPrimitiveComponentRegistry(),{plan:'alap',features:[]});
    expect(validation.ok).toBe(false);
    expect(validation.violations.some(item=>item.code==='COMPONENT_CHILD_NOT_ALLOWED')).toBe(true);
  });

  it('sanitizes unsupported button protocols instead of rendering executable javascript URLs',()=>{
    const invalidHref:StorefrontPageDocument=structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
    const heroStack=invalidHref.sections[1].children?.[0]?.children?.[0];
    const button=heroStack?.children?.find(child=>child.componentKey==='content.button');
    if(!button)throw new Error('REFERENCE_BUTTON_MISSING');
    button.config.href='javascript:alert(1)';

    const html=renderToStaticMarkup(
      <StorefrontRuntimeRenderer
        page={invalidHref}
        viewport="desktop"
        bindingContext={{brand:{name:'Safe Merchant'},navigation:{primary:[]}}}
        componentRegistry={createStorefrontPrimitiveComponentRegistry()}
        rendererRegistry={createStorefrontPrimitiveRendererRegistry()}
      />,
    );
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });
});
