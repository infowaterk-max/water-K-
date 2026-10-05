import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {getServerPublicSiteUrl} from '../src/lib/runtime/public-site-url';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
describe('platform merchant invite production redirect',()=>{
 it('uses production-safe host resolution',()=>{expect(getServerPublicSiteUrl({VERCEL_ENV:'production',VERCEL_PROJECT_PRODUCTION_URL:'water-k-native.vercel.app',VERCEL_URL:'water-k-native-random.vercel.app',NEXT_PUBLIC_SITE_URL:'http://localhost:3000'})).toBe('https://water-k-native.vercel.app')});
 it('preserves valid configured production domain',()=>{expect(getServerPublicSiteUrl({VERCEL_ENV:'production',VERCEL_PROJECT_PRODUCTION_URL:'water-k-native.vercel.app',VERCEL_URL:undefined,NEXT_PUBLIC_SITE_URL:'https://shop.example.hu/'})).toBe('https://shop.example.hu')});
 it('sends workforce invitations to workforce-owned credential completion',()=>{const action=read('src/app/admin/platform/webaruhazak/actions.ts');expect(action).toContain('/api/auth/workforce-credential?flow=invite&next=%2Fadmin');expect(action).not.toContain('/fiokom?auth_flow=invite')});
 it('returns credential completion to canonical workforce login',()=>{const form=read('src/lib/auth/workforce-credential-form.tsx');expect(form).toContain("type Flow='invite'|'recovery'");expect(form).toContain('supabase.auth.updateUser({password})');expect(form).toContain('window.location.replace(workforceLoginHref(target))');expect(form).not.toContain("from '@/components/auth/auth-form'")});
});
