import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder native mobile shell',()=>{
  it('wraps the real editor without replacing its document or renderer logic',()=>{
    const page=read('src/app/admin/email-sablonok/[id]/szerkesztes/page.tsx');
    expect(page).toContain("import { EmailBuilderMobileShell } from '@/components/admin/email-builder-mobile-shell';");
    expect(page).toContain('<EmailBuilderMobileShell><EmailBuilderEditor');
    expect(page).toContain('</EmailBuilderMobileShell>');
  });

  it('offers canvas, library and inspector mobile work modes',()=>{
    const shell=read('src/components/admin/email-builder-mobile-shell.tsx');
    for(const label of['Canvas','Hozzáadás','Szerkesztés'])expect(shell).toContain(label);
    for(const library of['Blokkok','Szekciók','Presetek','Saját blokkok','Dinamikus adatok'])expect(shell).toContain(library);
    expect(shell).toContain("type MobilePanel='canvas'|'library'|'inspector'");
    expect(shell).toContain('nav[aria-label="E-mail Builder eszközök"]');
    expect(shell).toContain("button?.click()");
  });

  it('forces mobile dynamic variable choices through a fresh target handoff',()=>{
    const shell=read('src/components/admin/email-builder-mobile-shell.tsx');
    const clickHandler=shell.slice(shell.indexOf('function captureEditorClick'),shell.indexOf('function captureEditorFocus'));
    expect(clickHandler).toContain("libraryView!=='Dinamikus adatok'");
    expect(clickHandler).toContain('pendingBindingRef.current=binding');
    expect(clickHandler).toContain("setPanel('canvas')");
    expect(clickHandler).not.toContain('hasTarget');
  });

  it('keeps desktop untouched and turns mobile library and inspector into overlay drawers',()=>{
    const css=read('src/components/admin/email-builder-mobile-shell.module.css');
    expect(css).toContain('@media(max-width:760px)');
    expect(css).toContain('.backdrop,.drawerChrome,.mobileDock{display:none}');
    expect(css).toContain('data-mobile-panel="library"');
    expect(css).toContain('data-mobile-panel="inspector"');
    expect(css).toContain('position:fixed');
    expect(css).toContain('overflow-y:auto!important');
    expect(css).toContain('grid-column:1/-1!important');
  });

  it('keeps the mobile canvas compact and gives the preview one dominant scroll surface',()=>{
    const css=read('src/components/admin/email-builder-mobile-shell.module.css');
    expect(css).toContain('height:calc(100dvh - 205px)');
    expect(css).toContain('overflow:hidden!important');
    expect(css).toContain('height:100%!important');
    expect(css).toContain('calc(70px + env(safe-area-inset-bottom))');
    expect(css).toContain('min-height:48px');
    expect(css).toContain('align-items:baseline;gap:5px');
    expect(css).toContain('main > p:last-child){display:none}');
  });

  it('does not introduce activation or sending into the mobile shell',()=>{
    const shell=read('src/components/admin/email-builder-mobile-shell.tsx');
    expect(shell).not.toContain('/activate');
    expect(shell).not.toContain('sendTransactionalEmail');
    expect(shell).not.toContain('fetch(');
  });
});