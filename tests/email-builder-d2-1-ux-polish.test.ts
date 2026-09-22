import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder UX shell',()=>{
  it('uses a dedicated tool rail, library panel, large canvas and inspector on wide desktop',()=>{
    const css=read('src/components/admin/email-builder-editor.module.css');
    expect(css).toContain('grid-template-columns:86px 330px minmax(620px,1fr) 380px');
    expect(css).toContain('@media(min-width:1700px)');
    expect(css).toContain('grid-template-columns:90px 350px minmax(760px,1fr) 410px');
    expect(css).toContain('min-height:1080px');
    expect(css).toContain('overflow-y:visible');
  });

  it('keeps the working surface adaptive across laptop, tablet and mobile breakpoints',()=>{
    const css=read('src/components/admin/email-builder-editor.module.css');
    expect(css).toContain('@media(max-width:1450px)');
    expect(css).toContain('@media(max-width:1120px)');
    expect(css).toContain('@media(max-width:760px)');
    expect(css).toContain('.paletteGrid');
    expect(css).toContain('.leftRail');
  });

  it('keeps the interactive editor draft-safe',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain('Piszkozat mód');
    expect(editor).toContain('A mentés nem aktiválja az e-mailt.');
    expect(editor).not.toContain('activate_email_template_v1');
    expect(editor).not.toContain('sendTransactionalEmail');
    expect(editor).not.toContain('Tesztküldés');
  });
});