import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder mobile binding handoff and confirmation UI',()=>{
  it('turns a targetless mobile dynamic variable selection into a guided field handoff',()=>{
    const shell=read('src/components/admin/email-builder-mobile-shell.tsx');
    const css=read('src/components/admin/email-builder-mobile-shell.module.css');
    expect(shell).toContain("type PendingBinding={key:string;label:string}");
    expect(shell).toContain("libraryView!=='Dinamikus adatok'");
    expect(shell).toContain("setPanel('canvas')");
    expect(shell).toContain('onFocusCapture={captureEditorFocus}');
    expect(shell).toContain('source.click()');
    expect(shell).toContain('Válaszd ki, hová szeretnéd beszúrni:');
    expect(css).toContain('.pendingBinding');
  });

  it('uses Shoperation modal UI for preset confirmation instead of showing the browser dialog',()=>{
    const shell=read('src/components/admin/email-builder-mobile-shell.tsx');
    expect(shell).toContain("buttonText==='Preset alkalmazása'");
    expect(shell).toContain('adminModalBackdrop');
    expect(shell).toContain('role="dialog"');
    expect(shell).toContain('aria-modal="true"');
    expect(shell).toContain('Megerősítés');
    expect(shell).toContain('Preset alkalmazása');
  });

  it('removes the native confirm from saved block deletion and uses the standard Shoperation dialog',()=>{
    const saved=read('src/components/admin/email-builder-saved-block-library.tsx');
    expect(saved).not.toContain('window.confirm');
    expect(saved).toContain('pendingDelete');
    expect(saved).toContain('adminModalBackdrop');
    expect(saved).toContain('role="dialog"');
    expect(saved).toContain('aria-modal="true"');
    expect(saved).toContain('Saját blokk törlése');
    expect(saved).toContain('Törlés megerősítése');
  });
});