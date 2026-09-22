import fs from 'node:fs';
import path from 'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('customer direct-write evidence',()=>{
  test('first-touch attribution distinguishes read failure, write evidence and concurrent winner',()=>{
    const route=read('src/app/api/orders/attribution/route.ts');
    expect(route).toContain('error:orderError');
    expect(route).toContain('if(orderError)');
    expect(route).toContain(".select('id,utm_campaign')");
    expect(route).toContain('updated?.utm_campaign===p.attribution.campaign');
    expect(route).toContain('error:confirmError');
    expect(route).toContain('if(current?.utm_campaign)return NextResponse.json({ok:true,unchanged:true})');
    expect(route).toContain('Az attribúció mentésének eredménye nem igazolható.');
  });

  test('wishlist removal cannot silently swallow a database error',()=>{
    const actions=read('src/app/termek/[slug]/actions.ts');
    const start=actions.indexOf('export async function removeWishlistAction');
    const end=actions.indexOf('export async function stockNotificationAction',start);
    const block=actions.slice(start,end);
    expect(block).toContain("from('wishlists').delete()");
    expect(block).toContain('const{error}=await');
    expect(block).toContain('if(error)redirect');
    expect(block).toContain('?wishlist=error');
  });

  test('append-only consent writes fail on insert errors and never mutate existing consent rows',()=>{
    for(const file of [
      'src/app/api/account/marketing-consent/route.ts',
      'src/app/api/marketing/newsletter/route.ts',
      'src/app/api/communication/unsubscribe/route.ts',
    ]){
      const source=read(file);
      expect(source).toContain("from('marketing_consents').insert");
      expect(source).toMatch(/if\(error\).*500/);
      expect(source).not.toContain("from('marketing_consents').update");
      expect(source).not.toContain("from('marketing_consents').delete");
      expect(source).not.toContain("from('marketing_consents').upsert");
    }
  });
});
