import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getServerPublicSiteUrl } from '../src/lib/runtime/public-site-url';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('platform merchant invite production redirect',()=>{
  it('rejects a localhost configured URL in production and uses the Vercel production host',()=>{
    expect(getServerPublicSiteUrl({
      VERCEL_ENV:'production',
      VERCEL_PROJECT_PRODUCTION_URL:'water-k-native.vercel.app',
      VERCEL_URL:'water-k-native-random.vercel.app',
      NEXT_PUBLIC_SITE_URL:'http://localhost:3000',
    })).toBe('https://water-k-native.vercel.app');
  });

  it('keeps a valid explicitly configured production domain',()=>{
    expect(getServerPublicSiteUrl({
      VERCEL_ENV:'production',
      VERCEL_PROJECT_PRODUCTION_URL:'water-k-native.vercel.app',
      VERCEL_URL:undefined,
      NEXT_PUBLIC_SITE_URL:'https://shop.example.hu/',
    })).toBe('https://shop.example.hu');
  });

  it('binds platform invitations to the production-safe resolver and preserves invite intent',()=>{
    const action=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(action).toContain("import { getServerPublicSiteUrl } from '@/lib/runtime/public-site-url'");
    expect(action).toContain('const site=getServerPublicSiteUrl()');
    expect(action).toContain("if(!site){console.error('platform webshop invite failed: public site URL unavailable')");
    expect(action).toContain('redirectTo:`${site}/fiokom?auth_flow=invite&next=/admin`');
    expect(action).not.toContain("const site=(process.env.NEXT_PUBLIC_SITE_URL??'')");
  });

  it('lets invite and password-recovery sessions set a durable password before continuing',()=>{
    const form=read('src/components/auth/auth-form.tsx');
    expect(form).toContain("type AuthFlow='invite'|'recovery'");
    expect(form).toContain("queryFlow=search.get('auth_flow')");
    expect(form).toContain("hashFlow=hash.get('type')");
    expect(form).toContain("errorCode=hash.get('error_code')??search.get('error_code')");
    expect(form).toContain("event==='PASSWORD_RECOVERY'");
    expect(form).toContain("redirectTo=`${window.location.origin}/fiokom?auth_flow=recovery`");
    expect(form).toContain("supabase.auth.updateUser({password})");
    expect(form).toContain("authFlow==='invite'?'Meghívás befejezése':'Új jelszó beállítása'");
    expect(form).toContain("requestedNext?.startsWith('/admin')");
    expect(form.indexOf("const requestedNext=new URLSearchParams(window.location.search).get('next')")).toBeLessThan(form.indexOf("window.history.replaceState(null,'','/fiokom')"));
    expect(form).toContain("errorCode==='otp_expired'");
  });
});
