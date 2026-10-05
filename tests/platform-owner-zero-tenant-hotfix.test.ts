import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
describe('platform owner zero-tenant hotfix',()=>{
 it('keeps platform login and activation tenant-independent',()=>{const portal=read('src/app/platform/page.tsx'),activation=read('src/lib/auth/platform-activation-form.tsx'),page=read('src/app/admin/platform/page.tsx'),ia=read('src/lib/navigation/admin-ia.ts');expect(portal).toContain("workforceLoginHref('/admin/platform')");expect(portal).not.toContain('PlatformAuthForm');expect(activation).toContain('window.location.replace(workforceLoginHref(PLATFORM_TARGET))');expect(ia).toContain("href:'/admin/platform',label:'Platform irányítóközpont'");expect(page).toContain('requirePlatformOperator');expect(page).not.toContain('requireCurrentStoreContext')});
 it('keeps platform action center tenant-independent',()=>{const page=read('src/app/admin/intezkedesek/page.tsx');expect(page).toContain('if(platformRole&&!currentInstance)');expect(page).toContain('requirePlatformOperator')});
 it('preserves owner activation trigger authority',()=>{const migration=read('supabase/migrations/20260903064500_platform_owner_zero_tenant_hotfix.sql');expect(migration).toContain('private.platform_owner_claims');expect(migration).toContain('public.platform_operators');expect(migration).toContain("values(new.id,'owner')")});
});
