import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
describe('Shoperation platform auth portal',()=>{
 it('delegates existing workforce login and separates activation',()=>{const page=read('src/app/platform/page.tsx'),activation=read('src/lib/auth/platform-activation-form.tsx');expect(page).toContain("workforceLoginHref('/admin/platform')");expect(page).toContain('<PlatformActivationForm/>');expect(page).not.toContain('PlatformAuthForm');expect(activation).toContain('Első platformtulajdonosi aktiválás');expect(activation).not.toContain('signInWithPassword')});
 it('checks server-side owner claim before signup',()=>{const activation=read('src/lib/auth/platform-activation-form.tsx'),route=read('src/app/api/platform/activation/route.ts');expect(activation).toContain("fetch('/api/platform/activation'");expect(route).toContain("rpc('platform_owner_claim_available'")});
 it('stays out of search indexing',()=>{expect(read('src/app/platform/page.tsx')).toContain('robots:{index:false,follow:false}')});
});
