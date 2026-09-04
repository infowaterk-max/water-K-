import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('pilot acceptance guest access',()=>{
  it('uses a signed, short-lived, server-only tenant session',()=>{
    const source=read('src/lib/storefront/pilot-access.ts');
    expect(source).toContain("import 'server-only'");
    expect(source).toContain("createHmac('sha256'");
    expect(source).toContain('timingSafeEqual');
    expect(source).toContain('PILOT_ACCEPTANCE_MAX_AGE_SECONDS=2*60*60');
    expect(source).toContain('SUPABASE_SECRET_KEY');
    expect(source).not.toContain('NEXT_PUBLIC_');
  });

  it('lets only an authorized merchant mint a pilot acceptance session',()=>{
    const start=read('src/app/api/pilot-access/start/route.ts');
    expect(start).toContain("getAdminRequestUser('store.read')");
    expect(start).toContain("instance.status!=='pilot'");
    expect(start).toContain("sameSite:'lax'");
    expect(start).toContain('httpOnly:true');
    expect(start).toContain("secure:process.env.NODE_ENV==='production'");
    expect(start).toContain("origin===new URL(request.url).origin");
  });

  it('binds anonymous tenant resolution and storefront access to the signed pilot instance',()=>{
    const instanceAccess=read('src/lib/instances/access.ts');
    const storefrontAccess=read('src/lib/storefront/access.ts');
    expect(instanceAccess).toContain('getPilotAcceptanceInstanceId');
    expect(instanceAccess).toContain(".eq('id',pilotAcceptanceInstanceId).eq('status','pilot')");
    expect(storefrontAccess).toContain("instance?.status==='pilot'&&await getPilotAcceptanceInstanceId()===instance.id");
    expect(storefrontAccess).not.toContain("searchParams.get('pilot')");
  });

  it('provides explicit merchant start and end controls without activating the webshop',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    expect(page).toContain('/api/pilot-access/start');
    expect(page).toContain('/api/pilot-access/end');
    expect(page).toContain("instance?.status==='pilot'");
    expect(page).not.toContain("status:'active'");
  });
});
