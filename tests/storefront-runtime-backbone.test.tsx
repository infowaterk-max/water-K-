import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  defineStorefrontBuilderComponent,
  defineStorefrontTemplateManifest,
} from '../src/lib/builder/storefront-foundation';
import {
  StorefrontComponentRegistry,
  StorefrontTemplateRegistry,
  applyStorefrontBindings,
  createStorefrontPageSnapshot,
  hasStorefrontRuntimeCapability,
  migrateStorefrontPageDocument,
  resolveStorefrontPageDocument,
  type StorefrontPageDocument,
  validateStorefrontPageDocument,
} from '../src/lib/builder/storefront-runtime';
import {StorefrontRendererRegistry,StorefrontRuntimeRenderer} from '../src/components/builder/storefront-runtime-renderer';

const sectionManifest=defineStorefrontBuilderComponent({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  componentKey:'storefront.section',
  componentVersion:1,
  schemaSlot:'page.sections',
  pageTypes:['home'],
  configurable:['tone'] as const,
  responsiveMode:'container',
  capability:{minPlan:'alap',features:[]},
} as const);

const headingManifest=defineStorefrontBuilderComponent({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  componentKey:'storefront.heading',
  componentVersion:1,
  schemaSlot:'section.children',
  pageTypes:['home'],
  configurable:['text'] as const,
  responsiveMode:'fixed',
  capability:{minPlan:'alap',features:[]},
} as const);

const proManifest=defineStorefrontBuilderComponent({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  componentKey:'storefront.pro-only',
  componentVersion:1,
  schemaSlot:'page.sections',
  pageTypes:['home'],
  configurable:[] as const,
  responsiveMode:'fixed',
  capability:{minPlan:'pro',features:[]},
} as const);

const registry=()=>new StorefrontComponentRegistry()
  .register({manifest:sectionManifest,allowsChildren:true,allowedChildren:['storefront.heading']})
  .register({manifest:headingManifest,bindingSlots:['text']})
  .register({manifest:proManifest});

const page=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'home.main',
  pageType:'home',
  templateKey:'reference.runtime',
  templateVersion:1,
  metadata:{futureMetadata:{kept:true}},
  sections:[{
    id:'hero',componentKey:'storefront.section',componentVersion:1,
    config:{tone:'quiet',futureKey:'preserved'},
    responsive:{desktop:{gridSpan:12},tablet:{gridSpan:8}},
    children:[{
      id:'hero-title',componentKey:'storefront.heading',componentVersion:1,
      config:{text:'Fallback'},
      bindings:{text:{path:'brand.name',fallback:'Store'}},
    }],
  }],
});

describe('Storefront Runtime Backbone Wave 0',()=>{
  it('validates a versioned page tree while preserving unknown config for forward compatibility',()=>{
    const result=validateStorefrontPageDocument(page(),registry(),{plan:'alap',features:[]});
    expect(result.ok).toBe(true);
    expect(result.violations).toContainEqual(expect.objectContaining({code:'UNKNOWN_CONFIG_KEY_PRESERVED',severity:'warning'}));
    expect(page().sections[0].config.futureKey).toBe('preserved');
  });

  it('rejects duplicate ids, unknown bindings and unsatisfied capability requirements fail-closed',()=>{
    const invalid=page();
    invalid.sections[0].children![0].id='hero';
    invalid.sections[0].children![0].bindings={text:{path:'window.location'}};
    invalid.sections.push({id:'pro',componentKey:'storefront.pro-only',componentVersion:1,config:{}});
    const result=validateStorefrontPageDocument(invalid,registry(),{plan:'alap',features:[]});
    expect(result.ok).toBe(false);
    expect(result.violations.map(item=>item.code)).toEqual(expect.arrayContaining(['NODE_ID_DUPLICATE','BINDING_PATH_NOT_ALLOWED','COMPONENT_CAPABILITY_REQUIRED']));
    expect(hasStorefrontRuntimeCapability(proManifest.capability,{plan:'alap',features:[]})).toBe(false);
    expect(hasStorefrontRuntimeCapability(proManifest.capability,{plan:'pro',features:[]})).toBe(true);
  });

  it('resolves bindings and desktop to tablet to mobile responsive inheritance deterministically',()=>{
    const document=page();
    const heading=document.sections[0].children![0];
    expect(applyStorefrontBindings(heading,{brand:{name:'Shoporation Demo'}}).text).toBe('Shoporation Demo');
    const mobile=resolveStorefrontPageDocument(document,'mobile',{brand:{name:'Shoporation Demo'}});
    expect(mobile[0].resolved.gridSpan).toBe(8);
    expect(mobile[0].children[0].config.text).toBe('Shoporation Demo');
  });

  it('registers template packages with strict template/page identity',()=>{
    const manifest=defineStorefrontTemplateManifest({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
      templateKey:'reference.runtime',
      templateVersion:1,
      pageSchemaVersion:1,
      minPlan:'alap',
      requiredFeatures:[],
      pageTypes:['home'],
      responsive:{desktop:true,tablet:true,mobile:true},
      migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
      demoContent:{namespace:'reference-runtime',policy:STOREFRONT_DEMO_CONTENT_POLICY},
    });
    const templates=new StorefrontTemplateRegistry().register({manifest,pages:[page()]});
    expect(templates.get('reference.runtime',1)?.pages[0].pageType).toBe('home');
    expect(()=>templates.register({manifest,pages:[page()]})).toThrow('STOREFRONT_TEMPLATE_DUPLICATE');
  });

  it('allows only explicit forward schema migrations and retains unknown page data',()=>{
    const migrated=migrateStorefrontPageDocument(page(),2,[{
      fromVersion:1,toVersion:2,migrate:document=>({...document,schemaVersion:2,metadata:{...document.metadata,migrated:true}}),
    }]);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.sections[0].config.futureKey).toBe('preserved');
    expect(()=>migrateStorefrontPageDocument(page(),0,[])).toThrow('STOREFRONT_MIGRATION_TARGET_INVALID');
    expect(()=>migrateStorefrontPageDocument({...page(),schemaVersion:2},1,[])).toThrow('STOREFRONT_MIGRATION_BACKWARD_FORBIDDEN');
    expect(()=>migrateStorefrontPageDocument(page(),2,[])).toThrow('STOREFRONT_MIGRATION_STEP_REQUIRED');
  });

  it('creates immutable preview/published snapshot contracts without mutating the working document',()=>{
    const source=page();
    const snapshot=createStorefrontPageSnapshot({snapshotId:'preview-1',kind:'preview',revision:1,createdAt:'2026-09-08T03:30:00.000Z',document:source});
    expect(snapshot.kind).toBe('preview');
    expect(Object.isFrozen(snapshot.document)).toBe(true);
    expect(Object.isFrozen(snapshot.document.sections[0].config)).toBe(true);
    source.sections[0].config.tone='changed';
    expect(snapshot.document.sections[0].config.tone).toBe('quiet');
  });

  it('renders only registered page components through the shared renderer and resolved bindings',()=>{
    const renderers=new StorefrontRendererRegistry()
      .register('storefront.section',1,({node,children})=><section data-span={node.resolved.gridSpan}>{children}</section>)
      .register('storefront.heading',1,({config})=><h1>{String(config.text)}</h1>);
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={page()} viewport="mobile" bindingContext={{brand:{name:'Shoporation Demo'}}} componentRegistry={registry()} rendererRegistry={renderers} capability={{plan:'alap',features:[]}}/>);
    expect(html).toContain('data-span="8"');
    expect(html).toContain('<h1>Shoporation Demo</h1>');
  });
});
