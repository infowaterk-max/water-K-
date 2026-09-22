import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder workspace scroll ownership',()=>{
  it('wraps the editor in a route-scoped workspace shell',()=>{
    const page=read('src/app/admin/email-sablonok/[id]/szerkesztes/page.tsx');
    expect(page).toContain("import styles from './email-builder-workspace-page.module.css';");
    expect(page).toContain('className={styles.workspacePage}');
  });

  it('keeps the desktop command bar in document flow instead of floating over the canvas',()=>{
    const css=read('src/app/admin/email-sablonok/[id]/szerkesztes/email-builder-workspace-page.module.css');
    expect(css).toContain('@media(min-width:1121px)');
    expect(css).toContain('position:static!important');
    expect(css).toContain('top:auto!important');
    expect(css).not.toContain('position:fixed');
  });

  it('gives the four-column desktop workspace independent vertical scrolling',()=>{
    const css=read('src/app/admin/email-sablonok/[id]/szerkesztes/email-builder-workspace-page.module.css');
    expect(css).toContain('height:calc(100dvh - 203px)!important');
    expect(css).toContain('overflow:hidden!important');
    expect(css).toContain('overflow-y:auto!important');
    expect(css).toContain('overscroll-behavior:contain');
    expect(css).toContain('scrollbar-gutter:stable');
  });

  it('leaves the existing stacked responsive flow untouched below desktop width',()=>{
    const css=read('src/app/admin/email-sablonok/[id]/szerkesztes/email-builder-workspace-page.module.css');
    expect(css).toContain('@media(max-width:1120px)');
    expect(css).toContain('.workspacePage{overflow:visible}');
  });
});
