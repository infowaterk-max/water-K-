import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder target UX v2 shell',()=>{
  it('has the approved left-side tool architecture with real sections and presets',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    for(const label of['Blokkok','Szekciók','Presetek','Saját blokkok','Dinamikus adatok'])expect(editor).toContain(label);
    expect(editor).toContain("type LeftView='blocks'|'sections'|'presets'|'saved'|'dynamic'");
    expect(editor).toContain('SectionLibrary');
    expect(editor).toContain('PresetLibrary');
    expect(editor).toContain('LibraryPlaceholder');
    expect(editor).toContain('nem jelenítünk meg ál-funkciókat');
  });

  it('groups the existing real block capabilities into content, commerce and system libraries',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    for(const group of["title:'Tartalom'","title:'Commerce'","title:'Rendszer'"])expect(editor).toContain(group);
    for(const type of["type:'heading'","type:'text'","type:'button'","type:'order-items'","type:'order-summary'","type:'payment-info'","type:'header'","type:'footer'"])expect(editor).toContain(type);
    expect(editor).toContain('onClick={()=>addBlock(item.type)}');
  });

  it('makes sections and presets operate on the real document history',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    const library=read('src/lib/email-builder/library.ts');
    expect(editor).toContain('function addSection(section:EmailSectionDefinition)');
    expect(editor).toContain('function applyPreset(preset:EmailPresetDefinition)');
    expect(editor).toContain('blocks.splice(index,0,...inserted)');
    expect(editor).toContain('window.confirm');
    expect(editor).toContain('subject:preset.subject');
    expect(editor).toContain('design:structuredClone(preset.design)');
    for(const id of['essential-intro','essential-order','essential-payment','essential-addresses','essential-actions','essential-closing'])expect(library).toContain(`id:'${id}'`);
    for(const id of['essential-balanced','essential-compact','essential-premium'])expect(library).toContain(`id:'${id}'`);
  });

  it('keeps bank transfer sections conditional instead of always rendering them',()=>{
    const library=read('src/lib/email-builder/library.ts');
    expect(library).toContain("field:'payment.method',operator:'equals',value:'bank_transfer'");
    expect(library).toContain('conditions:bankTransferCondition');
  });

  it('makes the existing dynamic binding registry usable from the new library',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain('function DynamicLibrary');
    expect(editor).toContain('navigator.clipboard.writeText');
    expect(editor).toContain('emailBindingRegistry.filter');
    expect(editor).toContain("copiedBinding===binding.key?'Másolva'");
  });

  it('retains editor operations and publication separation',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    for(const operation of['addBlock','addSection','applyPreset','duplicateSelected','deleteSelected','moveSelected','undo','redo'])expect(editor).toContain(`function ${operation}`);
    expect(editor).toContain('async function saveDraft');
    expect(editor).toContain('/verziok`');
    expect(editor).not.toContain('/activate');
    expect(editor).not.toContain('sendTransactionalEmail');
  });
});