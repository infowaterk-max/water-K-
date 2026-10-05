import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
describe('Stage 1 workforce admin entry bridge',()=>{
 const page=read('src/app/fiokom/page.tsx'),middleware=read('src/middleware.ts'),workforce=read('src/app/api/auth/workforce-login/page.tsx');
 it('bridges only explicit safe workforce intent',()=>{expect(page).toContain('normalizeWorkforceReturnTarget(rawNext)');expect(page).toContain("reason==='login'&&safeNext");expect(page).toContain('redirect(workforceLoginHref(safeNext))');expect(workforce).toContain('normalizeWorkforceReturnTarget(rawNext)')});
 it('bridges before storefront instance resolution',()=>{expect(page.indexOf('redirect(workforceLoginHref(safeNext))')).toBeLessThan(page.indexOf('getCurrentWebshopInstance()'))});
 it('preserves shopper auth and middleware responsibility',()=>{expect(page).toContain('<AuthForm instanceId={instance?.id??null}/>');expect(page).not.toContain('getPlatformRole');expect(middleware).not.toContain("target.pathname='/api/auth/workforce-login'")});
});
