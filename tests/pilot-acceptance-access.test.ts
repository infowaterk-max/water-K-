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
    expect(source).toContain('resolveSupabaseServerKey');
    expect(source).toContain('PILOT_STOREFRONT_SECRET');
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

  it('supports a preview-only explicit tenant entry through the non-admin API path',()=>{
    const start=read('src/app/api/pilot-access/start/route.ts');
    expect(start).toContain("export async function GET(request:Request)");
    expect(start).toContain("process.env.VERCEL_ENV!=='preview'");
    expect(start).toContain("instanceId=(url.searchParams.get('instanceId')");
    expect(start).toContain("'b2b-rfq':'/fiokom/ajanlatkeresek'");
    expect(start).toContain("'catalog-new':'/webaruhaz?sort=new&pilot=acceptance'");
    expect(start).toContain("sales:'/admin/ertekesites'");
    expect(start).toContain("returns:'/admin/visszaru'");
    expect(start).toContain("binding.role_code==='owner'||binding.role_code==='admin'");
    expect(start).toContain('createPilotAcceptanceToken(instanceId)');
  });

  it('binds anonymous tenant resolution and storefront access to the signed pilot instance',()=>{
    const instanceAccess=read('src/lib/instances/access.ts');
    const storefrontAccess=read('src/lib/storefront/access.ts');
    expect(instanceAccess).toContain('getPilotAcceptanceInstanceId');
    expect(instanceAccess).toContain(".eq('id',pilotAcceptanceInstanceId).eq('status','pilot')");
    expect(storefrontAccess).toContain("instance?.status==='pilot'&&await getPilotAcceptanceInstanceId()===instance.id");
    expect(storefrontAccess).not.toContain("searchParams.get('pilot')");
  });

  it('resolves the signed pilot tenant before preview auth fallback when the configured slug is absent from staging',()=>{
    const source=read('src/lib/instances/access.ts');
    const previewGuard=source.indexOf("if(process.env.VERCEL_ENV!=='preview')return null;");
    const acceptanceResolver=source.indexOf('const previewPilotAcceptanceInstanceId=await getPilotAcceptanceInstanceId();');
    const previewAuth=source.indexOf('const previewSupabase=await createClient();');
    expect(previewGuard).toBeGreaterThan(-1);
    expect(acceptanceResolver).toBeGreaterThan(previewGuard);
    expect(previewAuth).toBeGreaterThan(acceptanceResolver);
    expect(source).toContain(".eq('id',previewPilotAcceptanceInstanceId).eq('status','pilot')");
  });

  it('provides explicit merchant start and end controls without activating the webshop',()=>{
    const page=read('src/app/admin/pilot-acceptance/page.tsx');
    expect(page).toContain('/api/pilot-access/start');
    expect(page).toContain('/api/pilot-access/end');
    expect(page).toContain("instance?.status==='pilot'");
    expect(page).not.toContain("status:'active'");
  });
});
