import {describe,expect,it} from 'vitest';
import {resolveEntitledMerchantNavigation} from '@/lib/navigation/entitlement-navigation';
import type {StorePermission} from '@/lib/auth/store-rbac';

const contentSection=(sections:ReturnType<typeof resolveEntitledMerchantNavigation>)=>sections.find(section=>section.id==='content-appearance');

describe('temporary Visual Builder admin navigation placement',()=>{
  it('places Webshop szerkesztő first under Tartalom & Megjelenés when entitled',()=>{
    const sections=resolveEntitledMerchantNavigation(()=>true,()=>true,'active');
    const content=contentSection(sections);
    expect(content?.items[0]).toMatchObject({
      id:'visual-builder',
      href:'/admin/tartalom/builder',
      label:'Webshop szerkesztő',
    });
  });

  it('keeps the temporary entry behind the Builder feature and store.manage permission',()=>{
    const noFeature=resolveEntitledMerchantNavigation(feature=>feature!=='contentMarketing',()=>true,'active');
    expect(contentSection(noFeature)?.items.some(item=>item.id==='visual-builder')).toBe(false);

    const noManage=resolveEntitledMerchantNavigation(()=>true,(permission?:StorePermission)=>permission!=='store.manage','active');
    expect(contentSection(noManage)?.items.some(item=>item.id==='visual-builder')).toBe(false);
  });
});
