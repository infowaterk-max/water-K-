import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('Stage 1 workforce profile dropdown and logout',()=>{
  const roadmap=read('quality/knowledge/living-roadmap.v2.json');
  const layout=read('src/app/admin/layout.tsx');
  const menu=read('src/components/admin/admin-profile-menu.tsx');
  const customerLogout=read('src/components/auth/logout-button.tsx');
  const css=read('src/app/admin/admin-shell.css');

  it('implements the canonical MR1 profile dropdown logout requirement in the existing admin shell',()=>{
    expect(roadmap).toContain('"profile dropdown logout"');
    expect(layout).toContain("import { AdminProfileMenu } from '@/components/admin/admin-profile-menu';");
    expect(layout).toMatch(/<AdminProfileMenu email=\{user\.email\} roleLabel=\{accountRoleLabel\}\/>/);
    expect(menu).toContain('<details className="adminProfileMenu">');
    expect(menu).toContain('Profil és kijelentkezés');
    expect(css).toContain('.adminProfileMenu');
  });

  it('keeps role display derived from the server-owned platform and store role authorities',()=>{
    expect(layout).toContain('getPlatformRole()');
    expect(layout).toContain('getActiveStoreRoles(instance.id)');
    expect(layout).toContain('const accountRoleLabel=isPlatform?platformLabel');
    expect(menu).not.toMatch(/user_metadata|app_metadata|platform_operators|role_bindings/);
  });

  it('delegates logout to Supabase and redirects only after successful sign-out',()=>{
    const signOut=menu.indexOf('await supabase.auth.signOut()');
    const errorGuard=menu.indexOf('if(signOutError)');
    const redirect=menu.indexOf('window.location.replace(WORKFORCE_LOGIN_URL)');
    expect(signOut).toBeGreaterThan(-1);
    expect(errorGuard).toBeGreaterThan(signOut);
    expect(redirect).toBeGreaterThan(errorGuard);
    expect(menu).toContain("const WORKFORCE_LOGIN_URL='/api/auth/workforce-login?next=%2Fadmin';");
    expect(menu).toContain("setError('A kijelentkezés nem sikerült. Próbáld újra.')");
    expect(menu).toContain('if(busy)return;');
  });

  it('does not reuse or mutate the customer logout contract',()=>{
    expect(customerLogout).toContain("router.push('/')");
    expect(menu).not.toContain("router.push('/')");
    expect(menu).not.toContain('/fiokom');
    expect(layout).not.toContain('LogoutButton');
  });

  it('keeps the profile control in normal shell flow for desktop and mobile',()=>{
    expect(css).toContain('.adminProfileMenu{');
    expect(css).not.toMatch(/\.adminProfileMenu\{[^}]*position:(fixed|absolute)/);
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('.adminProfileMenu{margin-top:8px}');
  });
});
