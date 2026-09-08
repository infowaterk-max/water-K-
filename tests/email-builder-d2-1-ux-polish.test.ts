import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder D2.1 UX polish',()=>{
  it('gives wide desktop editors materially larger working panels and canvas',()=>{
    const css=read('src/components/admin/email-builder-editor.module.css');
    expect(css).toContain('grid-template-columns:280px minmax(600px,1fr) 360px');
    expect(css).toContain('@media(min-width:1600px)');
    expect(css).toContain('grid-template-columns:320px minmax(760px,1fr) 400px');
    expect(css).toContain('min-height:1040px');
    expect(css).toContain('overflow-y:visible');
  });

  it('keeps toolbar and settings controls readable without removing adaptive breakpoints',()=>{
    const css=read('src/components/admin/email-builder-editor.module.css');
    expect(css).toContain('min-height:42px');
    expect(css).toContain('.palette button span{font-weight:850;font-size:14px}');
    expect(css).toContain('@media(max-width:1320px)');
    expect(css).toContain('@media(max-width:1040px)');
    expect(css).toContain('@media(max-width:720px)');
  });

  it('does not add activation or delivery controls to the interactive editor',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain('Piszkozat mentése');
    expect(editor).toContain('Nincs aktiválás');
    expect(editor).not.toContain('activate_email_template_v1');
    expect(editor).not.toContain('sendTransactionalEmail');
    expect(editor).not.toContain('Tesztküldés');
  });
});
