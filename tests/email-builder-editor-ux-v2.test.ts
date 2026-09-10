import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder target UX v2 shell',()=>{
  it('has the approved left-side tool architecture without pretending unfinished libraries are live',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    for(const label of['Blokkok','Szekciók','Presetek','Saját blokkok','Dinamikus adatok'])expect(editor).toContain(label);
    expect(editor).toContain("type LeftView='blocks'|'sections'|'presets'|'saved'|'dynamic'");
    expect(editor).toContain('LibraryPlaceholder');
    expect(editor).toContain('nem jelenítünk meg ál-funkciókat');
  });

  it('groups the existing real block capabilities into content, commerce and system libraries',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    for(const group of["title:'Tartalom'","title:'Commerce'","title:'Rendszer'"])expect(editor).toContain(group);
    for(const type of["type:'heading'","type:'text'","type:'button'","type:'order-items'","type:'order-summary'","type:'payment-info'","type:'header'","type:'footer'"])expect(editor).toContain(type);
    expect(editor).toContain('onClick={()=>addBlock(item.type)}');
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
    for(const operation of['addBlock','duplicateSelected','deleteSelected','moveSelected','undo','redo'])expect(editor).toContain(`function ${operation}`);
    expect(editor).toContain('async function saveDraft');
    expect(editor).toContain('/verziok`');
    expect(editor).not.toContain('/activate');
    expect(editor).not.toContain('sendTransactionalEmail');
  });
});