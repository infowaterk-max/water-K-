import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Stage 1 workforce admin entry bridge',()=>{
  const page=read('src/app/fiokom/page.tsx');
  const middleware=read('src/middleware.ts');
  const workforce=read('src/app/api/auth/workforce-login/page.tsx');

  it('bridges only an explicit safe admin login intent to the dedicated workforce route',()=>{
    expect(page).toContain("normalizeStorefrontReturnTarget(rawNext)");
    expect(page).toContain("workforceNext=normalizeWorkforceReturnTarget(safeNext)");
    expect(page).toContain("reason==='login'&&workforceNext");
    expect(page).toContain("redirect(workforceLoginHref(workforceNext))");
    expect(workforce).toContain("normalizeWorkforceReturnTarget(normalized)");
  });

  it('evaluates the workforce bridge before storefront instance resolution',()=>{
    const query=page.indexOf("const query=searchParams?await searchParams:{}");
    const bridge=page.indexOf("redirect(workforceLoginHref(workforceNext))");
    const instance=page.indexOf('getCurrentWebshopInstance()');
    expect(query).toBeGreaterThan(-1);
    expect(bridge).toBeGreaterThan(query);
    expect(instance).toBeGreaterThan(bridge);
  });

  it('preserves ordinary shopper account authentication and keeps middleware read-only',()=>{
    expect(page).toContain('<AuthForm instanceId={instance?.id??null}/>');
    expect(page).toContain("if(!user)return <main");
    expect(page).not.toContain('getPlatformRole');
    expect(page).not.toContain('workforce-assurance');
    expect(middleware).toContain("target.pathname='/fiokom'");
    expect(middleware).toContain("target.searchParams.set('reason',reason)");
    expect(middleware).not.toContain("target.pathname='/api/auth/workforce-login'");
  });

  it('does not bridge missing, external or non-admin return intent by fallback',()=>{
    expect(page).toContain("safeNext=normalizeStorefrontReturnTarget(rawNext)");
    expect(page).toContain("reason==='login'&&workforceNext");
    expect(page).not.toContain("safeNext??'/admin'");
    expect(page).not.toContain("reason==='login')redirect");
  });
});
