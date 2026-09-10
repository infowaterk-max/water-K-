import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder D2 editor',()=>{
  it('loads the draft only inside the active tenant and marketing authority',()=>{
    const page=read('src/app/admin/email-sablonok/[id]/szerkesztes/page.tsx');
    expect(page).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(page).toContain(".eq('instance_id',scope.instanceId).eq('id',id).maybeSingle()");
    expect(page).toContain('emailDocumentSchema.safeParse(template.draft_document)');
    expect(page).toContain('<EmailBuilderEditor');
  });

  it('provides the draft editor shell with real renderer preview and no direct activation path',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain('leftRail');
    expect(editor).toContain('leftPanel');
    expect(editor).toContain('canvasPanel');
    expect(editor).toContain('rightPanel');
    expect(editor).toContain("fetch('/api/admin/email-builder/preview'");
    expect(editor).toContain("method:'PATCH'");
    expect(editor).toContain("saveState==='saving'?'Mentés…':'Mentés'");
    expect(editor).toContain('Piszkozat mód');
    expect(editor).toContain('A mentés nem aktiválja az e-mailt.');
    expect(editor).not.toContain('/activate');
    expect(editor).not.toContain('sendTransactionalEmail');
    expect(editor).not.toContain('tesztküld');
    expect(editor).not.toContain('D2');
  });

  it('supports the first block editing operations and desktop/mobile preview',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    for(const token of['addBlock','duplicateSelected','deleteSelected','moveSelected','undo','redo'])expect(editor).toContain(`function ${token}`);
    expect(editor).toContain("setDevice('desktop')");
    expect(editor).toContain("setDevice('mobile')");
    expect(editor).toContain("styles.activeTab");
    expect(editor).toContain("'content','design','conditions','responsive'");
    expect(editor).toContain('emailBindingRegistry');
  });

  it('makes rendered blocks selectable and applies responsive hide rules in output HTML',()=>{
    const renderer=read('src/lib/email-builder/render/render-email.ts');
    expect(renderer).toContain('data-email-block-id');
    expect(renderer).toContain('email-hide-desktop');
    expect(renderer).toContain('email-hide-mobile');
    expect(renderer).toContain('decorateBlockHtml');
  });

  it('links an existing Essential draft into the visual editor from the template library without internal phase labels',()=>{
    const page=read('src/app/admin/email-sablonok/page.tsx');
    expect(page).toContain('<span className="eyebrow">E-mail Builder</span>');
    expect(page).toContain('/szerkesztes`}>Szerkesztés');
    expect(page).toContain("ready?'Szerkeszthető':'Előkészítve'");
    expect(page).not.toContain('D2');
  });

  it('keeps the dedicated preview user-facing and phase-neutral',()=>{
    const preview=read('src/app/admin/email-sablonok/[id]/elonezet/page.tsx');
    expect(preview).toContain('Biztonságos piszkozat');
    expect(preview).toContain('Az aktív e-mail sablon változatlan marad.');
    expect(preview).not.toContain('D1 biztonsági korlát');
  });
});