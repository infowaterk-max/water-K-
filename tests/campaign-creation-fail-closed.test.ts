import fs from 'node:fs';
import path from 'node:path';
import{describe,expect,test}from'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('campaign creation fail-closed contract',()=>{
  test('lifecycle campaign is not created when source audience data cannot be read',()=>{
    const route=read('src/app/api/admin/campaigns/route.ts');
    const sourceGuard=route.indexOf('ordersError||consentsError||suppressionsError');
    const lifecycleInsert=route.indexOf("const{data:campaign,error}=await a.from('marketing_campaigns').insert(campaignPayload)");
    expect(sourceGuard).toBeGreaterThan(0);
    expect(lifecycleInsert).toBeGreaterThan(sourceGuard);
    expect(route).toContain('Kampány nem jött létre.');
  });

  test('partial recipient snapshot rolls back the just-created campaign',()=>{
    const route=read('src/app/api/admin/campaigns/route.ts');
    expect(route).toContain("from('marketing_campaigns').delete().eq('id',campaign.id).eq('instance_id',store.instanceId)");
    expect(route).toContain('a célcsoport-pillanatkép nem menthető, ezért a kampány létrehozását visszavontuk'.replace('a ','A '));
  });

  test('campaign creation requires marketing management and is audited',()=>{
    const route=read('src/app/api/admin/campaigns/route.ts');
    expect(route).toContain("getAdminRequestUser('marketing.manage')");
    expect(route).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(route.match(/recordAdminAudit/g)?.length).toBeGreaterThanOrEqual(3);
    expect(route).toContain("action:'campaign.created'");
  });
});
