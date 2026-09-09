import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email Builder grouped undo history',()=>{
  it('records one history snapshot per focused text-edit session',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain("type HistoryGroup={key:string;recorded:boolean}");
    expect(editor).toContain('const historyGroupRef=useRef<HistoryGroup|null>(null)');
    expect(editor).toContain('function beginHistoryGroup(key:string)');
    expect(editor).toContain('function endHistoryGroup(key:string)');
    expect(editor).toContain('if(!group||!group.recorded)');
    expect(editor).toContain('if(group)group.recorded=true');
  });

  it('groups subject, preheader and editable block text by focus session',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain("onFocus={()=>beginHistoryGroup('document:subject')}");
    expect(editor).toContain("onBlur={()=>endHistoryGroup('document:subject')}");
    expect(editor).toContain("onFocus={()=>beginHistoryGroup('document:preheader')}");
    expect(editor).toContain("const groupKey=(field:string)=>`block:${block.id}:content:${field}`");
    expect(editor).toContain("onChange={e=>onChange('text',e.target.value,groupKey('text'))}");
  });

  it('groups condition value typing into one undo step',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain('function setConditionRule(index:number,patch:Partial<EmailConditionRule>,groupKey?:string)');
    expect(editor).toContain('onFocus={()=>beginHistoryGroup(`block:${selected.id}:condition:${index}:value`)}');
    expect(editor).toContain('onBlur={()=>endHistoryGroup(`block:${selected.id}:condition:${index}:value`)}');
    expect(editor).toContain('`block:${selected.id}:condition:${index}:value`)');
  });

  it('keeps structural actions discrete and preserves draft-only safety',()=>{
    const editor=read('src/components/admin/email-builder-editor.tsx');
    expect(editor).toContain('commit({...document,blocks})');
    expect(editor).toContain('Piszkozat mentése');
    expect(editor).toContain('Nincs aktiválás');
    expect(editor).not.toContain('activate_email_template_v1');
    expect(editor).not.toContain('Tesztküldés');
  });
});
