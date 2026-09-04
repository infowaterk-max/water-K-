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

  it('binds platform invitations to the production-safe resolver and fails closed without a public URL',()=>{
    const action=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(action).toContain("import { getServerPublicSiteUrl } from '@/lib/runtime/public-site-url'");
    expect(action).toContain('const site=getServerPublicSiteUrl()');
    expect(action).toContain("if(!site){console.error('platform webshop invite failed: public site URL unavailable')");
    expect(action).toContain('redirectTo:`${site}/fiokom?next=/admin`');
    expect(action).not.toContain("const site=(process.env.NEXT_PUBLIC_SITE_URL??'')");
  });
});
