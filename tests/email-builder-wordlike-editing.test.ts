import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder Word-like editing shell',()=>{
  it('wraps the existing editor without replacing the schema or renderer engine',()=>{
    const page=read('src/app/admin/email-sablonok/[id]/szerkesztes/page.tsx');
    expect(page).toContain("import { EmailBuilderWordLikeShellV3 } from '@/components/admin/email-builder-wordlike-shell-v3';");
    expect(page).toContain('const previewContext=demoContext');
    expect(page).toContain('<EmailBuilderWordLikeShellV3 previewContext={previewContext}><EmailBuilderMobileShell><EmailBuilderEditor');
    expect(page).toContain('</EmailBuilderMobileShell></EmailBuilderWordLikeShellV3>');
  });

  it('provides a contextual toolbar attached to the edited content with familiar actions',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v3.tsx');
    expect(shell).toContain("'Félkövér'");
    expect(shell).toContain("'Dőlt'");
    expect(shell).toContain("'Hivatkozás'");
    expect(shell).toContain("'Balra igazítás'");
    expect(shell).toContain("'Középre igazítás'");
    expect(shell).toContain("'Jobbra igazítás'");
    expect(shell).toContain("'Dinamikus adat'");
    expect(shell).toContain('setAlignmentIcon');
    expect(shell).toContain('positionToolbar');
    expect(shell).toContain('position:absolute');
    expect(shell).toContain('shoperation-toolbar-label');
    expect(shell).toContain('shoperation-inline-toolbar');
  });

  it('tokenizes Subject and Preheader bindings instead of exposing raw binding syntax',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v3.tsx');
    const css=read('src/components/admin/email-builder-wordlike-shell.module.css');
    expect(shell).toContain("const documentFieldLabels=new Set(['Tárgy','Preheader'])");
    expect(shell).toContain('documentBindingSpan');
    expect(shell).toContain('documentFieldSource');
    expect(shell).toContain('renderDocumentField');
    expect(shell).toContain("data.wordlikeDocumentField").not;
    expect(shell).toContain("editable.dataset.wordlikeDocumentField='true'");
    expect(shell).toContain("button.textContent='✦'");
    expect(css).toContain('.sourceControl{display:none!important}');
    expect(css).toContain('.documentBindingChip');
    expect(css).toContain('.documentFieldButton');
  });

  it('persists structured edits instead of raw HTML and avoids click-only dirty state',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v3.tsx');
    const editor=read('src/components/admin/email-builder-editor.tsx');
    const rich=read('src/lib/email-builder/rich-text.ts');
    expect(shell).toContain('serializeRichText');
    expect(shell).toContain('snapshotOf');
    expect(shell).toContain('commitIfChanged');
    expect(shell).toContain('before.source===after.source');
    expect(shell).toContain("new CustomEvent('shoperation:email-builder-inline-commit'");
    expect(editor).toContain("window.addEventListener('shoperation:email-builder-inline-commit'");
    expect(editor).toContain('delete content.richText');
    expect(rich).toContain("type:'binding'");
    expect(rich).toContain('emailRichTextSchema');
    expect(rich).not.toContain('dangerouslySetInnerHTML');
  });

  it('keeps dynamic data field-bound and user values visible',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v3.tsx');
    expect(shell).toContain('bindingPreview(context,key)');
    expect(shell).toContain('data-email-binding-key');
    expect(shell).toContain('rangeAtEnd(editable)');
    expect(shell).toContain('A változókönyvtár referencia.');
    expect(shell).toContain('Beszúrás a kurzorhoz');
  });

  it('keeps activation and sending outside the interaction layer',()=>{
    const shell=read('src/components/admin/email-builder-wordlike-shell-v3.tsx');
    expect(shell).not.toContain('/activate');
    expect(shell).not.toContain('sendTransactionalEmail');
    expect(shell).not.toContain('Test e-mail');
  });
});