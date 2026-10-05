import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {normalizeWorkforceReturnTarget,workforceLoginHref} from '@/lib/auth/workforce-return-target';
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
function filesUnder(dir:string):string[]{const out:string[]=[];for(const name of readdirSync(dir)){const path=join(dir,name),stat=statSync(path);if(stat.isDirectory())out.push(...filesUnder(path));else if(/\.(ts|tsx)$/.test(name))out.push(path)}return out}
describe('MR1 workforce entrypoint convergence',()=>{
 it('allowlists only admin and exact preview return targets',()=>{expect(normalizeWorkforceReturnTarget('/admin')).toBe('/admin');expect(normalizeWorkforceReturnTarget('/admin/rendelesek?status=open')).toBe('/admin/rendelesek?status=open');expect(normalizeWorkforceReturnTarget('/storefront-template-preview?template=x')).toBe('/storefront-template-preview?template=x');for(const value of['/fiokom','/storefront-template-preview-login?next=/admin','//evil.example','https://evil.example'])expect(normalizeWorkforceReturnTarget(value)).toBeNull();expect(workforceLoginHref('//evil.example')).toBe('/api/auth/workforce-login?next=%2Fadmin')});
 it('removes legacy PlatformAuthForm from active App Router modules',()=>{const refs=filesUnder(resolve(process.cwd(),'src/app')).filter(path=>readFileSync(path,'utf8').includes('PlatformAuthForm'));expect(refs).toEqual([]);expect(read('src/components/auth/platform-auth-form.tsx')).toContain('signInWithPassword')});
 it('keeps customer auth isolated',()=>{expect(read('src/components/auth/auth-form.tsx')).not.toContain('WorkforceAuthForm');expect(read('src/app/storefront-template-preview-login/page.tsx')).not.toContain('AuthForm');expect(read('src/lib/auth/workforce-credential-form.tsx')).not.toContain("from '@/components/auth/auth-form'")});
 it('keeps parked AAL2 enforcement inactive',()=>{expect(read('src/lib/auth/require-admin.ts')).not.toContain('workforceAssuranceSatisfied');expect(read('src/middleware.ts')).not.toContain('workforceAssuranceSatisfied')});
});
