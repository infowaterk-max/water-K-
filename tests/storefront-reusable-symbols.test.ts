import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  detachStorefrontReusableSymbol,
  findStorefrontLinkedSymbolInstance,
  insertStorefrontReusableSymbol,
  mapStorefrontSymbolSourceToInstance,
  materializeStorefrontGlobalSymbols,
  rebaseStorefrontReusableSymbolInstances,
  type StorefrontReusableSymbol,
} from '@/lib/builder/storefront-linked-symbols';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');
const persistence=read('src/lib/builder/storefront-reusable-symbol-persistence.ts');
const actions=read('src/app/admin/tartalom/builder/actions.ts');
const panel=read('src/components/admin/storefront-saved-blocks-panel.tsx');
const runtimeSource=read('src/lib/builder/storefront-runtime-source.ts');
const migration=read('supabase/migrations/20260912235500_storefront_reusable_symbols.sql').toLowerCase();

const section=(text='Forrás'):StorefrontComponentNode=>({
  id:'source-root',componentKey:'layout.section',componentVersion:1,config:{tone:'surface'},children:[
    {id:'source-text',componentKey:'content.text',componentVersion:1,config:{text,align:'left'}},
    {id:'source-button',componentKey:'content.button',componentVersion:1,config:{label:'CTA',href:'/'}},
  ],
});
const page:StorefrontPageDocument={schemaVersion:1,pageKey:'home',pageType:'home',templateKey:'test-template',templateVersion:1,sections:[]};
const symbol=(fragment=section(),revision=1):StorefrontReusableSymbol=>({
  id:'11111111-1111-4111-8111-111111111111',name:'Shared section',componentKey:fragment.componentKey,componentVersion:fragment.componentVersion,fragment,revision,globalSlot:null,createdAt:'2026-09-12T10:00:00.000Z',updatedAt:'2026-09-12T10:00:00.000Z',
});

describe('linked reusable symbols',()=>{
  it('maps descendant ids deterministically without depending on sibling order',()=>{
    const source=section();
    const first=mapStorefrontSymbolSourceToInstance(source,'instance-root');
    const reordered={...source,children:[source.children![1]!,source.children![0]!]} as StorefrontComponentNode;
    const second=mapStorefrontSymbolSourceToInstance(reordered,'instance-root');
    const firstIds=new Map(first.children!.map(node=>[node.componentKey,node.id]));
    const secondIds=new Map(second.children!.map(node=>[node.componentKey,node.id]));
    expect(first.id).toBe('instance-root');
    expect(firstIds.get('content.text')).toBe(secondIds.get('content.text'));
    expect(firstIds.get('content.button')).toBe(secondIds.get('content.button'));
  });

  it('rebases untouched values from source while preserving a local override',()=>{
    const inserted=insertStorefrontReusableSymbol(page,symbol(), 'instance-root').document;
    const local=structuredClone(inserted);
    local.sections[0]!.config.tone='primary';
    const remote=section('Új forrásszöveg');
    remote.config.tone='muted';
    const rebased=rebaseStorefrontReusableSymbolInstances(local,[symbol(remote,2)]);
    expect(rebased.sections[0]!.config.tone).toBe('primary');
    expect(rebased.sections[0]!.children?.[0]?.config.text).toBe('Új forrásszöveg');
    expect(findStorefrontLinkedSymbolInstance(rebased,'instance-root')?.baseVersion).toBe(2);
  });

  it('keeps stable existing child ids when the source adds a sibling',()=>{
    const inserted=insertStorefrontReusableSymbol(page,symbol(),'instance-root').document;
    const before=inserted.sections[0]!.children!.find(node=>node.componentKey==='content.text')!.id;
    const remote=section();
    remote.children=[{id:'source-badge',componentKey:'content.text',componentVersion:1,config:{text:'Új'}},...remote.children!];
    const rebased=rebaseStorefrontReusableSymbolInstances(inserted,[symbol(remote,2)]);
    const after=rebased.sections[0]!.children!.find(node=>node.componentKey==='content.text'&&node.config.text==='Forrás')!.id;
    expect(after).toBe(before);
    expect(rebased.sections[0]!.children).toHaveLength(3);
  });

  it('detaches the relationship but preserves the effective canonical subtree',()=>{
    const inserted=insertStorefrontReusableSymbol(page,symbol(),'instance-root').document;
    const detached=detachStorefrontReusableSymbol(inserted,'instance-root',[symbol(section('Friss'),2)]);
    expect(findStorefrontLinkedSymbolInstance(detached,'instance-root')).toBeNull();
    expect(detached.sections[0]!.children?.[0]?.config.text).toBe('Friss');
  });

  it('materializes one global header and footer without a second renderer',()=>{
    const header:StorefrontComponentNode={id:'header-source',componentKey:'system.header',componentVersion:1,config:{brandLabel:'Global',brandHref:'/',tone:'surface',sticky:false},children:[{id:'nav-source',componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:[],layout:'horizontal'}}]};
    const footer=section('Lábléc');
    const document:StorefrontPageDocument={...page,sections:[{...header,id:'local-header'},footer]};
    const result=materializeStorefrontGlobalSymbols(document,[{...symbol(header),id:'22222222-2222-4222-8222-222222222222',componentKey:'system.header',globalSlot:'header'},{...symbol(footer),id:'33333333-3333-4333-8333-333333333333',globalSlot:'footer'}]);
    expect(result.sections.filter(node=>node.componentKey==='system.header')).toHaveLength(1);
    expect(result.sections.filter(node=>node.id==='source-root')).toHaveLength(1);
    expect(result.sections.at(-1)?.componentKey).toBe('layout.section');
  });
});

describe('reusable symbol persistence and Builder contract',()=>{
  it('uses tenant-scoped store.manage authority and idempotent audited RPC mutations',()=>{
    expect((persistence.match(/requireCurrentStoreContext\('store\.manage'\)/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect(persistence).toContain(".eq('instance_id',scope.instanceId).eq('id',symbolId).maybeSingle()");
    expect(persistence).toContain("admin.rpc('create_storefront_reusable_symbol_v1'");
    expect(persistence).toContain("admin.rpc('update_storefront_reusable_symbol_v1'");
    expect(persistence).toContain("admin.rpc('set_storefront_reusable_symbol_global_slot_v1'");
    expect(persistence).toContain("admin.rpc('delete_storefront_reusable_symbol_v1'");
    expect(persistence).not.toContain('tenantId:');
  });

  it('creates append-only symbol audit evidence and one global slot per tenant',()=>{
    expect(migration).toContain('create table if not exists public.storefront_reusable_symbols');
    expect(migration).toContain('create table if not exists public.storefront_reusable_symbol_events');
    expect(migration).toContain('unique(instance_id,operation_key)');
    expect(migration).toContain('storefront_reusable_symbols_global_slot_uidx');
    expect(migration).toContain('where global_slot is not null');
    expect(migration).toContain('if not public.can_manage_storefront(p_instance_id,p_actor_user_id)');
    expect(migration).toContain('revoke insert,update,delete on public.storefront_reusable_symbols from service_role');
    expect(migration).toContain('before update or delete on public.storefront_reusable_symbol_events');
  });

  it('keeps insert/detach inside the current Builder document and rebases again on save',()=>{
    expect(panel).toContain('insertStorefrontReusableSymbol(document,symbol)');
    expect(panel).toContain('detachStorefrontReusableSymbol(document,selectedNode.id,symbols)');
    expect(panel).toContain('onApply(inserted.document,inserted.insertedNodeId');
    expect(actions).toContain('rebaseStorefrontReusableSymbolInstances(input.document,symbols)');
    expect(actions).toContain('saveCurrentStorefrontPageDraft({...input,document})');
  });

  it('materializes current linked/global authority before the published runtime renderer boundary',()=>{
    expect(runtimeSource).toContain('listStorefrontReusableSymbolsForInstance(instance.id)');
    expect(runtimeSource).toContain('materializeStorefrontReusableSymbols(page,symbols)');
    expect(runtimeSource).not.toContain('StorefrontRuntimeRenderer');
  });
});
