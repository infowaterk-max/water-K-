import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {defineStorefrontBuilderComponent,STOREFRONT_BUILDER_FOUNDATION_VERSION} from '@/lib/builder/storefront-foundation';
import {StorefrontComponentRegistry,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  applyStorefrontBuilderMutation,
  createStorefrontBuilderHistory,
  listStorefrontBuilderInsertableComponents,
  pushStorefrontBuilderHistory,
  redoStorefrontBuilderHistory,
  undoStorefrontBuilderHistory,
  validateStorefrontBuilderWorkingCopy,
} from '@/lib/builder/storefront-visual-builder';

const alap={plan:'alap' as const,features:[...PLANS.alap.features]};
const pro={plan:'pro' as const,features:[...PLANS.pro.features]};
const fresh=()=>structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
const find=(page:StorefrontPageDocument,id:string)=>{
  let found:any;
  const walk=(nodes:any[])=>nodes.forEach(node=>{if(node.id===id)found=node;walk(node.children??[])});
  walk(page.sections);return found;
};

describe('Roadmap Block 22 Visual Builder contract',()=>{
  it('edits only manifest-configurable properties and keeps Page Schema identity',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const before=fresh();
    const after=applyStorefrontBuilderMutation({document:before,registry,capability:alap,mutation:{type:'config',nodeId:'reference-title',key:'text',value:'Builder módosítás'}});
    expect(find(after,'reference-title').config.text).toBe('Builder módosítás');
    expect(after.pageKey).toBe(before.pageKey);
    expect(after.templateKey).toBe(before.templateKey);
    expect(()=>applyStorefrontBuilderMutation({document:before,registry,capability:alap,mutation:{type:'config',nodeId:'reference-title',key:'rawHtml',value:'<script>alert(1)</script>'}})).toThrow('BUILDER_CONFIG_KEY_NOT_EDITABLE');
  });

  it('supports add, duplicate, remove and deterministic reorder without arbitrary component injection',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    let page=fresh();
    page=applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'add',parentId:'reference-hero-stack',componentKey:'content.text',componentVersion:1,nodeId:'block22-copy'}});
    expect(find(page,'block22-copy')).toBeTruthy();
    page=applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'duplicate',nodeId:'block22-copy',newNodeId:'block22-copy-duplicate'}});
    expect(find(page,'block22-copy-duplicate')).toBeTruthy();
    page=applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'move',nodeId:'block22-copy-duplicate',parentId:'reference-hero-stack',index:0}});
    expect(find(page,'reference-hero-stack').children[0].id).toBe('block22-copy-duplicate');
    page=applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'remove',nodeId:'block22-copy'}});
    expect(find(page,'block22-copy')).toBeFalsy();
    expect(()=>applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'add',parentId:'reference-hero-stack',componentKey:'unsafe.arbitrary',componentVersion:1}})).toThrow('BUILDER_COMPONENT_NOT_REGISTERED');
  });

  it('keeps protected system components fail-closed',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const page=fresh();
    expect(()=>applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'remove',nodeId:'reference-header'}})).toThrow('BUILDER_PROTECTED_COMPONENT_REMOVE_FORBIDDEN');
    expect(()=>applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'move',nodeId:'reference-navigation',parentId:'reference-hero',index:0}})).toThrow('BUILDER_PROTECTED_COMPONENT_MOVE_FORBIDDEN');
  });

  it('edits one document across Desktop/Tablet/Mobile responsive overrides',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    let page=fresh();
    page=applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'responsive',nodeId:'reference-grid-left',viewport:'tablet',gridSpan:8}});
    page=applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'responsive',nodeId:'reference-grid-left',viewport:'mobile',hidden:true}});
    expect(find(page,'reference-grid-left').responsive.tablet.gridSpan).toBe(8);
    expect(find(page,'reference-grid-left').responsive.mobile.hidden).toBe(true);
    expect(page.pageKey).toBe('reference.home');
    expect(()=>applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'responsive',nodeId:'reference-title',viewport:'mobile',gridSpan:6}})).toThrow('BUILDER_GRID_SPAN_NOT_SUPPORTED');
  });

  it('derives insertable components from manifest page/parent/capability metadata',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const page=fresh();
    const root=listStorefrontBuilderInsertableComponents({document:page,registry,capability:alap,parentId:null});
    expect(root.map(item=>item.componentKey)).toContain('layout.section');
    expect(root.map(item=>item.componentKey)).not.toContain('content.text');
    const children=listStorefrontBuilderInsertableComponents({document:page,registry,capability:alap,parentId:'reference-hero-stack'});
    expect(children.map(item=>item.componentKey)).toContain('content.text');
    expect(children.map(item=>item.componentKey)).not.toContain('system.navigation');
  });

  it('enforces Alap/Pro capability metadata on mutation, not only in UI',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    registry.register({manifest:defineStorefrontBuilderComponent({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      componentKey:'content.pro-callout',componentVersion:1,schemaSlot:'children',pageTypes:['home'],configurable:['text'],responsiveMode:'fixed',
      capability:{minPlan:'pro',features:['advancedAnalytics']},
    })});
    const page=fresh();
    expect(()=>applyStorefrontBuilderMutation({document:page,registry,capability:alap,mutation:{type:'add',parentId:'reference-hero-stack',componentKey:'content.pro-callout',componentVersion:1}})).toThrow('BUILDER_COMPONENT_CAPABILITY_REQUIRED');
    expect(()=>applyStorefrontBuilderMutation({document:page,registry,capability:pro,mutation:{type:'add',parentId:'reference-hero-stack',componentKey:'content.pro-callout',componentVersion:1,nodeId:'pro-callout'}})).not.toThrow();
  });

  it('server working-copy validation rejects identity, protected and unknown-config tampering',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const before=fresh();
    const valid=applyStorefrontBuilderMutation({document:before,registry,capability:alap,mutation:{type:'config',nodeId:'reference-title',key:'text',value:'Mentett cím'}});
    expect(validateStorefrontBuilderWorkingCopy({previous:before,next:valid,registry,capability:alap})).toBe(true);
    const identity=structuredClone(valid);identity.pageKey='other.home';
    expect(()=>validateStorefrontBuilderWorkingCopy({previous:before,next:identity,registry,capability:alap})).toThrow('BUILDER_DOCUMENT_IDENTITY_IMMUTABLE');
    const protectedRemoval=structuredClone(valid);protectedRemoval.sections=protectedRemoval.sections.filter(node=>node.id!=='reference-header');
    expect(()=>validateStorefrontBuilderWorkingCopy({previous:before,next:protectedRemoval,registry,capability:alap})).toThrow('BUILDER_PROTECTED_COMPONENT_REMOVE_FORBIDDEN');
    const unknown=structuredClone(valid);find(unknown,'reference-title').config.rawHtml='<b>no</b>';
    expect(()=>validateStorefrontBuilderWorkingCopy({previous:before,next:unknown,registry,capability:alap})).toThrow('BUILDER_UNKNOWN_CONFIG_MUTATION_FORBIDDEN');
  });

  it('undo/redo is a bounded client working-copy history, not publication state',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const base=fresh();
    const changed=applyStorefrontBuilderMutation({document:base,registry,capability:alap,mutation:{type:'config',nodeId:'reference-title',key:'text',value:'Második állapot'}});
    const history=pushStorefrontBuilderHistory(createStorefrontBuilderHistory(base),changed);
    const undone=undoStorefrontBuilderHistory(history);
    expect(find(undone.present,'reference-title').config.text).toBe('Semleges storefront referencia');
    const redone=redoStorefrontBuilderHistory(undone);
    expect(find(redone.present,'reference-title').config.text).toBe('Második állapot');
  });

  it('does not expose a generic JSON/SQL/RPC mutation surface',()=>{
    const registry=new StorefrontComponentRegistry();
    expect(Object.keys(registry)).not.toContain('sql');
    expect(Object.keys(registry)).not.toContain('rpc');
  });
});
