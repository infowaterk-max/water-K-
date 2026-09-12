import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  cloneStorefrontSavedBlockWithFreshIds,
  insertStorefrontSavedBlock,
  parseStorefrontSavedBlockFragment,
} from '@/lib/builder/storefront-saved-blocks';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');
const persistence=read('src/lib/builder/storefront-saved-block-persistence.ts');
const actions=read('src/app/admin/tartalom/builder/actions.ts');
const panel=read('src/components/admin/storefront-saved-blocks-panel.tsx');
const baseMigration=read('supabase/migrations/20260912171600_storefront_saved_blocks_v1.sql').toLowerCase();
const updateMigration=read('supabase/migrations/20260912190000_storefront_saved_blocks_metadata.sql').toLowerCase();

const fragment:StorefrontComponentNode={
  id:'saved-root',
  componentKey:'layout.section',
  componentVersion:1,
  config:{gap:'m'},
  children:[{
    id:'saved-child',
    componentKey:'content.text',
    componentVersion:1,
    config:{text:'Mentett tartalom'},
  }],
};

const page:StorefrontPageDocument={
  schemaVersion:1,
  pageKey:'home',
  pageType:'home',
  templateKey:'test-template',
  templateVersion:1,
  sections:[{
    id:'existing-root',
    componentKey:'layout.section',
    componentVersion:1,
    config:{},
  }],
};

describe('storefront saved blocks',()=>{
  it('parses a canonical fragment without mutating the source',()=>{
    const source=structuredClone(fragment);
    const parsed=parseStorefrontSavedBlockFragment(source);
    expect(parsed).toEqual(fragment);
    parsed.config.gap='xl';
    expect(source.config.gap).toBe('m');
  });

  it('regenerates every node id and avoids ids already present on the page',()=>{
    const ids=['existing-root','fresh-child'];
    let cursor=0;
    const cloned=cloneStorefrontSavedBlockWithFreshIds(fragment,new Set(['existing-root']),()=>ids[cursor++]??`fresh-${cursor}`);
    expect(cloned.id).not.toBe('saved-root');
    expect(cloned.id).toBe('fresh-child');
    expect(cloned.children?.[0]?.id).not.toBe('saved-child');
    expect(fragment.id).toBe('saved-root');
    expect(fragment.children?.[0]?.id).toBe('saved-child');
  });

  it('inserts a cloned top-level fragment without mutating the current working copy',()=>{
    let counter=0;
    const result=insertStorefrontSavedBlock(page,fragment,{index:0,idFactory:()=>`fresh-${++counter}`});
    expect(result.insertedNodeId).toBe('fresh-1');
    expect(result.document.sections).toHaveLength(2);
    expect(result.document.sections[0]?.id).toBe('fresh-1');
    expect(result.document.sections[0]?.children?.[0]?.id).toBe('fresh-2');
    expect(page.sections).toHaveLength(1);
    expect(page.sections[0]?.id).toBe('existing-root');
  });

  it('rejects duplicate ids inside a stored fragment',()=>{
    expect(()=>parseStorefrontSavedBlockFragment({
      ...fragment,
      children:[{...fragment.children![0],id:'saved-root'}],
    })).toThrow('STOREFRONT_SAVED_BLOCK_NODE_ID_INVALID');
  });

  it('fails closed when the id factory cannot produce a unique valid id',()=>{
    expect(()=>cloneStorefrontSavedBlockWithFreshIds(fragment,new Set(['taken']),()=> 'taken')).toThrow('STOREFRONT_SAVED_BLOCK_ID_GENERATION_FAILED');
  });
});

describe('storefront saved blocks persistence contract',()=>{
  it('adds optional metadata and an audited tenant-scoped update RPC without opening direct writes',()=>{
    expect(updateMigration).toContain('add column if not exists description text');
    expect(updateMigration).toContain('add column if not exists category text');
    expect(updateMigration).toContain("check (event_type in ('created','updated','deleted'))");
    expect(updateMigration).toContain('create or replace function public.update_storefront_saved_block_v1');
    expect(updateMigration).toContain('if not public.can_manage_storefront(p_instance_id,p_actor_user_id)');
    expect(updateMigration).toContain('where id=p_block_id and instance_id=p_instance_id for update');
    expect(updateMigration).toContain('where id=p_block_id and instance_id=p_instance_id');
    expect(updateMigration).toContain("'storefront.saved_block_updated'");
    expect(updateMigration).toContain('revoke all on function public.update_storefront_saved_block_v1(uuid,uuid,uuid,text,text,text,text)');
    expect(updateMigration).toContain('grant execute on function public.update_storefront_saved_block_v1(uuid,uuid,uuid,text,text,text,text)');
    expect(baseMigration).toContain('revoke insert,update,delete on public.storefront_saved_blocks from service_role');
  });

  it('completes create/list/update/delete persistence with server-derived tenant scope and store.manage',()=>{
    expect(persistence).toContain('export async function createCurrentStorefrontSavedBlock');
    expect(persistence).toContain('export async function listCurrentStorefrontSavedBlocks');
    expect(persistence).toContain('export async function updateCurrentStorefrontSavedBlock');
    expect(persistence).toContain('export async function deleteCurrentStorefrontSavedBlock');
    expect((persistence.match(/requireCurrentStoreContext\('store\.manage'\)/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect(persistence).toContain(".eq('instance_id',scope.instanceId).eq('id',input.blockId).maybeSingle()");
    expect(persistence).toContain("admin.rpc('update_storefront_saved_block_v1'");
    expect(persistence).not.toContain('tenantId:');
    expect(persistence).not.toContain('instanceId:string');
  });

  it('wires controlled inline rename through the existing Builder server-action boundary',()=>{
    expect(actions).toContain('export async function updateVisualBuilderSavedBlockAction');
    expect(actions).toContain('updateCurrentStorefrontSavedBlock(input)');
    expect(panel).toContain('updateVisualBuilderSavedBlockAction');
    expect(panel).toContain('Mentett blokk új neve');
    expect(panel).toContain('Átnevezés');
    expect(panel).toContain("operationKey('update')");
  });
});
