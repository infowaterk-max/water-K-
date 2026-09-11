import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder Word-like editing shell',()=>{
  it('wraps the existing editor without replacing the schema or renderer engine',()=>{
    const page=read('src/app/admin/email-sablonok/[id]/szerkesztes/page.tsx');
    expect(page).toContain("import { EmailBuilderWordLikeShell } from '@/components/admin/email-builder-wordlike-shell';");
    expect(page).toContain('<EmailBuilderWordLikeShell><EmailBuilderMobileShell><EmailBuilderEditor');
    expect(page).toContain('</EmailBuilderMobileShell></EmailBuilderWordLikeShell>');
  });

  it('supports direct canvas editing and visual dynamic-data chips',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell.tsx');
    expect(shell).toContain("editable.contentEditable='true'");
    expect(shell).toContain('dataset.emailBindingKey');
    expect(shell).toContain('shoperation-binding-chip');
    expect(shell).toContain("button.textContent='{ } Dinamikus adat'");
    expect(shell).toContain('serializeEditable');
    expect(shell).toContain('selectionOffsets');
  });

  it('opens dynamic data from the edited field instead of the rejected variable-first workflow',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell.tsx');
    expect(shell).toContain('supportedFieldLabels');
    expect(shell).toContain('openForControl');
    expect(shell).toContain('A változókönyvtár referencia.');
    expect(shell).toContain('Beszúrás a kurzorhoz');
    expect(shell).toContain('setNativeValue(control,next)');
  });

  it('keeps activation and sending outside the interaction layer',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell.tsx');
    expect(shell).not.toContain('/activate');
    expect(shell).not.toContain('sendTransactionalEmail');
    expect(shell).not.toContain('Test e-mail');
  });
});
