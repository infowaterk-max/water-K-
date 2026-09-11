import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder Word-like editing shell',()=>{
  it('wraps the existing editor without replacing the schema or renderer engine',()=>{
    const page=read('src/app/admin/email-sablonok/[id]/szerkesztes/page.tsx');
    expect(page).toContain("import { EmailBuilderWordLikeShellV2 } from '@/components/admin/email-builder-wordlike-shell-v2';");
    expect(page).toContain('const previewContext=demoContext');
    expect(page).toContain('<EmailBuilderWordLikeShellV2 previewContext={previewContext}><EmailBuilderMobileShell><EmailBuilderEditor');
    expect(page).toContain('</EmailBuilderMobileShell></EmailBuilderWordLikeShellV2>');
  });

  it('keeps dynamic preview values visible while direct canvas editing is active',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v2.tsx');
    expect(shell).toContain("import { emailBindingRegistry,getEmailBinding,resolveEmailString }");
    expect(shell).toContain('bindingPreview(context,key)');
    expect(shell).toContain("chip.textContent=bindingPreview(context,key)");
    expect(shell).toContain('restoreResolved(editable,raw,previewContext)');
    expect(shell).toContain("editable.contentEditable='true'");
    expect(shell).toContain('shoperation-binding-chip');
  });

  it('opens dynamic data from the edited field and keeps the old variable library reference-only',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v2.tsx');
    expect(shell).toContain('supportedFieldLabels');
    expect(shell).toContain('openForControl');
    expect(shell).toContain('A változókönyvtár referencia.');
    expect(shell).toContain('Beszúrás a kurzorhoz');
    expect(shell).toContain('setNativeValue(control,next)');
    expect(shell).toContain('placeCaretAtRawOffset');
  });

  it('keeps editor controls out of the email geometry and activation outside the interaction layer',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v2.tsx');
    expect(shell).toContain("#shoperation-inline-toolbar{position:fixed;top:8px;right:8px");
    expect(shell).not.toContain('/activate');
    expect(shell).not.toContain('sendTransactionalEmail');
    expect(shell).not.toContain('Test e-mail');
  });
});
