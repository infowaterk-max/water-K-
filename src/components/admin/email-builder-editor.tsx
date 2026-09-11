'use client';

import Link from 'next/link';
import { useEffect,useMemo,useRef,useState } from 'react';
import type { EmailBlock,EmailBlockType,EmailConditionRule,EmailDocument,EmailRenderContext,RenderedEmail } from '@/lib/email-builder/types';
import { emailBindingRegistry } from '@/lib/email-builder/bindings';
import { emailPresetLibrary,emailSectionLibrary,type EmailBlockBlueprint,type EmailPresetDefinition,type EmailSectionDefinition } from '@/lib/email-builder/library';
import { SavedBlockLibrary } from './email-builder-saved-block-library';
import styles from './email-builder-editor.module.css';
import libraryStyles from './email-builder-library.module.css';

type TemplateMeta={id:string;name:string;status:string;activeVersionId:string|null;updatedAt:string};
type Tab='content'|'design'|'conditions'|'responsive';
type Device='desktop'|'mobile';
type SaveState='saved'|'dirty'|'saving'|'error';
type HistoryGroup={key:string;recorded:boolean};
type LeftView='blocks'|'sections'|'presets'|'saved'|'dynamic';
type PaletteItem={type:EmailBlockType;description:string;icon:string};
type PaletteGroup={title:string;items:PaletteItem[]};

const blockLabels:Record<EmailBlockType,string>={header:'Fejléc',heading:'Címsor',text:'Szöveg',button:'Gomb',divider:'Elválasztó',spacer:'Térköz','order-items':'Rendelési tételek','order-summary':'Összesítés','payment-info':'Fizetési adatok',address:'Cím',footer:'Lábléc'};
const paletteGroups:PaletteGroup[]=[
  {title:'Tartalom',items:[
    {type:'heading',description:'H1–H3 címsor',icon:'H'},
    {type:'text',description:'Bekezdés vagy rövid üzenet',icon:'≡'},
    {type:'button',description:'CTA hivatkozással',icon:'▭'},
    {type:'divider',description:'Finom elválasztó vonal',icon:'—'},
    {type:'spacer',description:'Függőleges térköz',icon:'↕'},
  ]},
  {title:'Commerce',items:[
    {type:'order-items',description:'Rendelés tételei',icon:'▤'},
    {type:'order-summary',description:'Részösszeg és végösszeg',icon:'∑'},
    {type:'payment-info',description:'Fizetési információk',icon:'¤'},
    {type:'address',description:'Szállítási vagy számlázási cím',icon:'⌂'},
  ]},
  {title:'Rendszer',items:[
    {type:'header',description:'Márkázott e-mail fejléc',icon:'▱'},
    {type:'footer',description:'Lábléc és jogi információk',icon:'▂'},
  ]},
];
const leftNav:{id:LeftView;label:string;icon:string}[]=[
  {id:'blocks',label:'Blokkok',icon:'◇'},
  {id:'sections',label:'Szekciók',icon:'♧'},
  {id:'presets',label:'Presetek',icon:'⬡'},
  {id:'saved',label:'Saját blokkok',icon:'⌘'},
  {id:'dynamic',label:'Dinamikus adatok',icon:'◈'},
];
const conditionOperators:EmailConditionRule['operator'][]=['equals','notEquals','exists','notExists','greaterThan','lessThan','contains','in'];
const operatorLabels:Record<EmailConditionRule['operator'],string>={equals:'egyenlő',notEquals:'nem egyenlő',exists:'létezik',notExists:'nem létezik',greaterThan:'nagyobb mint',lessThan:'kisebb mint',contains:'tartalmazza',in:'egyik ezek közül'};
const numericBindings=new Set(['order.subtotal','order.shipping','order.discount','order.tax','order.total','coupon.discount']);

function newId(type:EmailBlockType){return `${type}-${crypto.randomUUID()}`.slice(0,120);}
function createBlock(type:EmailBlockType):EmailBlock{
  const base={id:newId(type),type,version:1 as const,style:{},responsive:{}};
  if(type==='heading')return{...base,content:{text:'Új címsor',level:'h2',align:'left'}};
  if(type==='text')return{...base,content:{text:'Írd ide a szöveget…',align:'left'}};
  if(type==='button')return{...base,content:{label:'Tovább',href:'https://example.com',align:'left'}};
  if(type==='divider')return{...base,content:{}};
  if(type==='spacer')return{...base,content:{size:'m'}};
  if(type==='order-items')return{...base,content:{title:'A rendelés tartalma'}};
  if(type==='order-summary')return{...base,content:{title:'Összesítés'}};
  if(type==='payment-info')return{...base,content:{title:'Fizetési adatok'}};
  if(type==='address')return{...base,content:{kind:'shipping',title:'Szállítási cím'}};
  if(type==='header')return{...base,content:{showLogo:true}};
  return{...base,content:{text:'{{store.name}} · értesítés'}};
}

function materializeBlueprint(blueprint:EmailBlockBlueprint,sourceId:string):EmailBlock{
  const base=createBlock(blueprint.type);
  return{
    ...base,
    content:{...base.content,...structuredClone(blueprint.content??{})},
    style:structuredClone(blueprint.style??{}),
    responsive:structuredClone(blueprint.responsive??{}),
    ...(blueprint.conditions?{conditions:structuredClone(blueprint.conditions)}:{}),
    presetId:sourceId,
  };
}

function parseRuleValue(field:string,operator:EmailConditionRule['operator'],raw:string):unknown{
  if(operator==='exists'||operator==='notExists')return undefined;
  if(operator==='in')return raw.split(',').map(item=>item.trim()).filter(Boolean);
  if(numericBindings.has(field))return Number.isFinite(Number(raw))?Number(raw):0;
  return raw;
}
function ruleValueText(rule:EmailConditionRule){
  if(rule.operator==='exists'||rule.operator==='notExists')return'';
  if(Array.isArray(rule.value))return rule.value.join(', ');
  return rule.value===undefined||rule.value===null?'':String(rule.value);
}

export function EmailBuilderEditor({template,initialDocument,previewContext}:{template:TemplateMeta;initialDocument:EmailDocument;previewContext:EmailRenderContext}){
  const[document,setDocument]=useState<EmailDocument>(initialDocument);
  const[selectedId,setSelectedId]=useState(initialDocument.blocks[0]?.id??'');
  const[tab,setTab]=useState<Tab>('content');
  const[device,setDevice]=useState<Device>('desktop');
  const[leftView,setLeftView]=useState<LeftView>('blocks');
  const[copiedBinding,setCopiedBinding]=useState('');
  const[saveState,setSaveState]=useState<SaveState>('saved');
  const[saveMessage,setSaveMessage]=useState('Piszkozat betöltve');
  const[preview,setPreview]=useState<RenderedEmail|null>(null);
  const[previewError,setPreviewError]=useState('');
  const[history,setHistory]=useState<EmailDocument[]>([]);
  const[future,setFuture]=useState<EmailDocument[]>([]);
  const iframeRef=useRef<HTMLIFrameElement>(null);
  const previewSequence=useRef(0);
  const historyGroupRef=useRef<HistoryGroup|null>(null);

  const selected=useMemo(()=>document.blocks.find(block=>block.id===selectedId)??document.blocks[0]??null,[document.blocks,selectedId]);
  const selectedIndex=selected?document.blocks.findIndex(block=>block.id===selected.id):-1;
  const familyPresets=useMemo(()=>emailPresetLibrary.filter(item=>item.id.startsWith(`${document.family}-`)),[document.family]);

  function beginHistoryGroup(key:string){historyGroupRef.current={key,recorded:false};}
  function endHistoryGroup(key:string){if(historyGroupRef.current?.key===key)historyGroupRef.current=null;}
  function commit(next:EmailDocument,groupKey?:string){
    const group=groupKey&&historyGroupRef.current?.key===groupKey?historyGroupRef.current:null;
    if(!group||!group.recorded){
      setHistory(items=>[...items.slice(-39),document]);
      if(group)group.recorded=true;
      else if(groupKey)historyGroupRef.current={key:groupKey,recorded:true};
    }
    if(!groupKey)historyGroupRef.current=null;
    setFuture([]);
    setDocument(next);
    setSaveState('dirty');
    setSaveMessage('Nem mentett módosítás');
  }
  function undo(){const previous=history.at(-1);if(!previous)return;historyGroupRef.current=null;setFuture(items=>[document,...items.slice(0,39)]);setHistory(items=>items.slice(0,-1));setDocument(previous);setSelectedId(previous.blocks[0]?.id??'');setSaveState('dirty');setSaveMessage('Visszavont módosítás');}
  function redo(){const next=future[0];if(!next)return;historyGroupRef.current=null;setHistory(items=>[...items.slice(-39),document]);setFuture(items=>items.slice(1));setDocument(next);setSelectedId(next.blocks[0]?.id??'');setSaveState('dirty');setSaveMessage('Újra alkalmazott módosítás');}

  function updateDocument(patch:Partial<EmailDocument>,groupKey?:string){commit({...document,...patch},groupKey);}
  function updateSelected(patch:Partial<EmailBlock>,groupKey?:string){if(!selected)return;commit({...document,blocks:document.blocks.map(block=>block.id===selected.id?{...block,...patch}:block)},groupKey);}
  function updateContent(key:string,value:unknown,groupKey?:string){if(!selected)return;updateSelected({content:{...selected.content,[key]:value}},groupKey);}
  function addBlock(type:EmailBlockType){const block=createBlock(type),index=selectedIndex>=0?selectedIndex+1:document.blocks.length;const blocks=[...document.blocks];blocks.splice(index,0,block);commit({...document,blocks});setSelectedId(block.id);setTab('content');}
  function addSection(section:EmailSectionDefinition){
    const inserted=section.blocks.map(block=>materializeBlueprint(block,section.id));
    const index=selectedIndex>=0?selectedIndex+1:document.blocks.length;
    const blocks=[...document.blocks];
    blocks.splice(index,0,...inserted);
    commit({...document,blocks});
    setSelectedId(inserted[0]?.id??selectedId);
    setTab('content');
  }
  function applyPreset(preset:EmailPresetDefinition){
    if(!window.confirm(`A(z) „${preset.name}” preset lecseréli a jelenlegi piszkozat teljes elrendezését. A művelet egyetlen Visszavonás lépéssel visszaállítható. Folytatod?`))return;
    const blocks=preset.blocks.map(block=>materializeBlueprint(block,preset.id));
    commit({
      ...document,
      subject:preset.subject,
      preheader:preset.preheader,
      design:structuredClone(preset.design),
      blocks,
      metadata:{...document.metadata,libraryPresetId:preset.id},
    });
    setSelectedId(blocks[0]?.id??'');
    setTab('content');
  }
  function duplicateSelected(){if(!selected)return;const copy:{[K in keyof EmailBlock]:EmailBlock[K]}={...structuredClone(selected),id:newId(selected.type)};const blocks=[...document.blocks];blocks.splice(selectedIndex+1,0,copy);commit({...document,blocks});setSelectedId(copy.id);}
  function deleteSelected(){if(!selected||document.blocks.length<=1)return;const blocks=document.blocks.filter(block=>block.id!==selected.id);const fallback=blocks[Math.min(selectedIndex,blocks.length-1)];commit({...document,blocks});setSelectedId(fallback?.id??'');}
  function moveSelected(delta:-1|1){if(!selected)return;const target=selectedIndex+delta;if(target<0||target>=document.blocks.length)return;const blocks=[...document.blocks];[blocks[selectedIndex],blocks[target]]=[blocks[target],blocks[selectedIndex]];commit({...document,blocks});}
  function insertSavedBlock(source:EmailBlock,savedBlockId:string){const block:EmailBlock={...structuredClone(source),id:newId(source.type),presetId:`saved:${savedBlockId}`.slice(0,120)};const index=selectedIndex>=0?selectedIndex+1:document.blocks.length;const blocks=[...document.blocks];blocks.splice(index,0,block);commit({...document,blocks});setSelectedId(block.id);setTab('content');}

  async function copyBinding(key:string){
    try{
      await navigator.clipboard.writeText(`{{${key}}}`);
      setCopiedBinding(key);
      window.setTimeout(()=>setCopiedBinding(current=>current===key?'':current),1200);
    }catch{setCopiedBinding('');}
  }

  async function saveDraft(){
    setSaveState('saving');setSaveMessage('Mentés…');
    try{
      const response=await fetch(`/api/admin/email-builder/templates/${template.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({document})});
      const data=await response.json().catch(()=>null) as {error?:string;template?:{updated_at?:string};warnings?:string[]}|null;
      if(!response.ok)throw new Error(data?.error||'A piszkozat nem menthető.');
      setSaveState('saved');setSaveMessage(data?.warnings?.length?`Mentve · ${data.warnings.join(' · ')}`:'Piszkozat mentve');
    }catch(error){setSaveState('error');setSaveMessage(error instanceof Error?error.message:'A piszkozat nem menthető.');}
  }

  useEffect(()=>{
    const sequence=++previewSequence.current;
    const timer=window.setTimeout(async()=>{
      try{
        const response=await fetch('/api/admin/email-builder/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({document,context:previewContext})});
        const data=await response.json().catch(()=>null) as RenderedEmail&{error?:string};
        if(sequence!==previewSequence.current)return;
        if(!response.ok)throw new Error(data?.error||'Az előnézet nem renderelhető.');
        setPreview(data);setPreviewError('');
      }catch(error){if(sequence===previewSequence.current){setPreview(null);setPreviewError(error instanceof Error?error.message:'Az előnézet nem renderelhető.');}}
    },260);
    return()=>window.clearTimeout(timer);
  },[document,previewContext]);

  function wireIframe(){
    const root=iframeRef.current?.contentDocument;if(!root)return;
    root.querySelectorAll<HTMLElement>('[data-email-block-id]').forEach(node=>{
      const id=node.dataset.emailBlockId||'';
      node.style.cursor='pointer';
      node.style.outline=id===selectedId?'2px solid #159b7b':'2px solid transparent';
      node.style.outlineOffset='3px';
      node.onclick=event=>{event.preventDefault();event.stopPropagation();if(id)setSelectedId(id);};
    });
  }
  useEffect(()=>{wireIframe();},[selectedId,preview?.html]);

  function setConditionRule(index:number,patch:Partial<EmailConditionRule>,groupKey?:string){if(!selected?.conditions)return;const rules=selected.conditions.rules.map((rule,i)=>i===index?{...rule,...patch}:rule);updateSelected({conditions:{...selected.conditions,rules}},groupKey);}
  function addCondition(){if(!selected)return;const rule:EmailConditionRule={field:'payment.method',operator:'equals',value:'bank_transfer'};updateSelected({conditions:selected.conditions?{...selected.conditions,rules:[...selected.conditions.rules,rule]}:{mode:'all',rules:[rule]}});}
  function removeCondition(index:number){if(!selected?.conditions)return;const rules=selected.conditions.rules.filter((_,i)=>i!==index);updateSelected({conditions:rules.length?{...selected.conditions,rules}:undefined});}

  const statusClass=saveState==='error'?styles.saveError:saveState==='dirty'?styles.saveDirty:styles.saveOk;
  return <section className={styles.editorShell}>
    <header className={styles.topbar}>
      <div className={styles.titleArea}>
        <div className={styles.brandLockup}><span className={styles.brandMark}>◇</span><div><strong>Shoperation</strong><small>Email Builder</small></div></div>
        <div className={styles.breadcrumbs}><Link href="/admin/email-sablonok">E-mail sablonok</Link><span>›</span><strong>{template.name}</strong><span className={`${styles.saveState} ${statusClass}`}>{saveMessage}</span></div>
      </div>
      <div className={styles.toolbar}>
        <button type="button" onClick={undo} disabled={!history.length} title="Visszavonás">↶</button><button type="button" onClick={redo} disabled={!future.length} title="Újra">↷</button>
        <div className={styles.deviceSwitch}><button type="button" className={device==='desktop'?styles.active:''} onClick={()=>setDevice('desktop')}>▣ Asztali</button><button type="button" className={device==='mobile'?styles.active:''} onClick={()=>setDevice('mobile')}>▯ Mobil</button></div>
        <Link href={`/admin/email-sablonok/${template.id}/elonezet`} className={styles.secondaryAction}>◉ Előnézet</Link>
        <Link href={`/admin/email-sablonok/${template.id}/verziok`} className={styles.secondaryAction}>Verziók</Link>
        <button type="button" className={styles.saveButton} onClick={saveDraft} disabled={saveState==='saving'||saveState==='saved'}>{saveState==='saving'?'Mentés…':'Mentés'}</button>
      </div>
    </header>

    <div className={styles.documentBar}>
      <label><span>Tárgy</span><input value={document.subject} onFocus={()=>beginHistoryGroup('document:subject')} onBlur={()=>endHistoryGroup('document:subject')} onChange={event=>updateDocument({subject:event.target.value},'document:subject')}/></label>
      <label><span>Preheader</span><input value={document.preheader} onFocus={()=>beginHistoryGroup('document:preheader')} onBlur={()=>endHistoryGroup('document:preheader')} onChange={event=>updateDocument({preheader:event.target.value},'document:preheader')}/></label>
      <div className={styles.safety}><strong>Piszkozat mód</strong><span>A mentés nem aktiválja az e-mailt. Az aktív verzió külön kezelhető.</span></div>
    </div>

    <div className={styles.workspace}>
      <nav className={styles.leftRail} aria-label="E-mail Builder eszközök">
        {leftNav.map(item=><button type="button" key={item.id} className={leftView===item.id?styles.railActive:''} onClick={()=>setLeftView(item.id)} title={item.label}><span>{item.icon}</span><small>{item.label}</small></button>)}
      </nav>

      <aside className={styles.leftPanel}>
        {leftView==='blocks'&&<>
          <div className={styles.panelHead}><div><span className={styles.kicker}>Blokktár</span><strong>Hozzáadás</strong></div><span className={styles.libraryCount}>{paletteGroups.reduce((sum,group)=>sum+group.items.length,0)}</span></div>
          <div className={styles.paletteGroups}>{paletteGroups.map(group=><section key={group.title} className={styles.paletteGroup}><h3>{group.title}</h3><div className={styles.paletteGrid}>{group.items.map(item=><button type="button" key={item.type} onClick={()=>addBlock(item.type)}><b>{item.icon}</b><span>{blockLabels[item.type]}</span><small>{item.description}</small></button>)}</div></section>)}</div>
          <div className={styles.structureHead}><span className={styles.kicker}>Szerkezet</span><strong>{document.blocks.length} blokk</strong></div>
          <div className={styles.structure}>{document.blocks.map((block,index)=><button type="button" key={block.id} className={block.id===selectedId?styles.selectedBlock:''} onClick={()=>setSelectedId(block.id)}><span>{index+1}</span><div><strong>{blockLabels[block.type]}</strong><small>{block.id}</small></div></button>)}</div>
        </>}
        {leftView==='sections'&&<SectionLibrary sections={emailSectionLibrary} onInsert={addSection}/>}        
        {leftView==='presets'&&<PresetLibrary presets={familyPresets} onApply={applyPreset}/>}        
        {leftView==='dynamic'&&<DynamicLibrary copiedBinding={copiedBinding} onCopy={copyBinding}/>}        
        {leftView==='saved'&&<SavedBlockLibrary selected={selected} onInsert={insertSavedBlock}/>}        
      </aside>

      <main className={styles.canvasPanel}>
        <div className={styles.canvasToolbar}><div><span className={styles.kicker}>Élő canvas</span><strong>{device==='desktop'?'Desktop':'Mobil'}</strong></div><span>{preview?'Renderer: kész':'Renderer: frissítés…'}</span></div>
        <div className={styles.canvasStage}>
          {previewError?<div className={styles.previewError}><strong>Az előnézet most nem renderelhető.</strong><span>{previewError}</span></div>:preview?<iframe ref={iframeRef} title="E-mail Builder élő előnézet" sandbox="allow-same-origin" srcDoc={preview.html} onLoad={wireIframe} className={styles.previewFrame} style={{width:device==='mobile'?390:720}}/>:<div className={styles.previewLoading}>Előnézet készítése…</div>}
        </div>
        <p className={styles.canvasHint}>Kattints egy blokkra az e-mailben vagy a szerkezetlistában a szerkesztéshez.</p>
      </main>

      <aside className={styles.rightPanel}>
        <div className={styles.panelHead}><div><span className={styles.kicker}>Kijelölt elem</span><strong>{selected?blockLabels[selected.type]:'Nincs kijelölés'}</strong></div></div>
        {selected&&<>
          <div className={styles.blockActions}><button type="button" onClick={()=>moveSelected(-1)} disabled={selectedIndex<=0}>↑</button><button type="button" onClick={()=>moveSelected(1)} disabled={selectedIndex>=document.blocks.length-1}>↓</button><button type="button" onClick={duplicateSelected}>Duplikálás</button><button type="button" className={styles.danger} onClick={deleteSelected} disabled={document.blocks.length<=1}>Törlés</button></div>
          <div className={styles.tabs}>{(['content','design','conditions','responsive'] as Tab[]).map(item=><button type="button" key={item} className={tab===item?styles.activeTab:''} onClick={()=>setTab(item)}>{item==='content'?'Tartalom':item==='design'?'Design':item==='conditions'?'Feltételek':'Reszponzív'}</button>)}</div>
          <div className={styles.settings}>
            {tab==='content'&&<ContentSettings block={selected} onChange={updateContent} onEditStart={beginHistoryGroup} onEditEnd={endHistoryGroup}/>}            
            {tab==='design'&&<DesignSettings document={document} onChange={updateDocument}/>}            
            {tab==='conditions'&&<div className={styles.settingGroup}><div className={styles.settingIntro}>A blokk csak akkor jelenik meg, ha a szabályok teljesülnek.</div>{selected.conditions&&<label><span>Logika</span><select value={selected.conditions.mode} onChange={event=>updateSelected({conditions:{...selected.conditions!,mode:event.target.value as 'all'|'any'}})}><option value="all">Minden feltétel</option><option value="any">Bármelyik feltétel</option></select></label>}{selected.conditions?.rules.map((rule,index)=><div className={styles.ruleCard} key={`${rule.field}-${index}`}><label><span>Mező</span><select value={rule.field} onChange={event=>setConditionRule(index,{field:event.target.value,value:numericBindings.has(event.target.value)?0:''})}>{emailBindingRegistry.map(binding=><option value={binding.key} key={binding.key}>{binding.label}</option>)}</select></label><label><span>Operátor</span><select value={rule.operator} onChange={event=>{const operator=event.target.value as EmailConditionRule['operator'];setConditionRule(index,{operator,value:parseRuleValue(rule.field,operator,ruleValueText(rule))});}}>{conditionOperators.map(operator=><option value={operator} key={operator}>{operatorLabels[operator]}</option>)}</select></label>{rule.operator!=='exists'&&rule.operator!=='notExists'&&<label><span>Érték</span><input value={ruleValueText(rule)} onFocus={()=>beginHistoryGroup(`block:${selected.id}:condition:${index}:value`)} onBlur={()=>endHistoryGroup(`block:${selected.id}:condition:${index}:value`)} onChange={event=>setConditionRule(index,{value:parseRuleValue(rule.field,rule.operator,event.target.value)},`block:${selected.id}:condition:${index}:value`)}/></label>}<button type="button" className={styles.removeRule} onClick={()=>removeCondition(index)}>Feltétel törlése</button></div>)}<button type="button" className={styles.addRule} onClick={addCondition}>＋ Feltétel hozzáadása</button></div>}
            {tab==='responsive'&&<div className={styles.settingGroup}><div className={styles.settingIntro}>Kliensbiztos megjelenítési szabályok a blokkhoz.</div><Toggle label="Elrejtés asztali nézetben" checked={Boolean(selected.responsive.hideOnDesktop)} onChange={value=>updateSelected({responsive:{...selected.responsive,hideOnDesktop:value}})}/><Toggle label="Elrejtés mobil nézetben" checked={Boolean(selected.responsive.hideOnMobile)} onChange={value=>updateSelected({responsive:{...selected.responsive,hideOnMobile:value}})}/><Toggle label="Mobilon egymás alá rendezés" checked={Boolean(selected.responsive.stackOnMobile)} onChange={value=>updateSelected({responsive:{...selected.responsive,stackOnMobile:value}})}/></div>}
          </div>
        </>}
      </aside>
    </div>
  </section>;
}

function SectionLibrary({sections,onInsert}:{sections:EmailSectionDefinition[];onInsert:(section:EmailSectionDefinition)=>void}){
  const groups=Array.from(new Set(sections.map(item=>item.category)));
  return <div className={styles.libraryPane}><div className={styles.panelHead}><div><span className={styles.kicker}>Szekciótár</span><strong>Kész összeállítások</strong></div><span className={styles.libraryCount}>{sections.length}</span></div><p className={styles.libraryIntro}>Egy szekció több valódi blokkot szúr be egyszerre a kijelölt blokk után. Egyetlen Visszavonás lépéssel eltávolítható.</p>{groups.map(group=><section key={group}><div className={libraryStyles.librarySummary}><strong>{group}</strong><span>{sections.filter(item=>item.category===group).length} szekció</span></div><div className={libraryStyles.libraryCards}>{sections.filter(item=>item.category===group).map(section=><article className={libraryStyles.libraryCard} key={section.id}><div className={libraryStyles.libraryCardTop}><span className={libraryStyles.libraryIcon}>{section.icon}</span><div className={libraryStyles.libraryMeta}><strong>{section.name}</strong><span>{section.blocks.length} blokk</span><p>{section.description}</p></div></div><button type="button" className={libraryStyles.libraryAction} onClick={()=>onInsert(section)}>＋ Szekció beszúrása</button></article>)}</div></section>)}</div>;
}

function PresetLibrary({presets,onApply}:{presets:EmailPresetDefinition[];onApply:(preset:EmailPresetDefinition)=>void}){
  return <div className={styles.libraryPane}><div className={styles.panelHead}><div><span className={styles.kicker}>Presetek</span><strong>Teljes e-mail elrendezések</strong></div><span className={styles.libraryCount}>{presets.length}</span></div><p className={styles.libraryIntro}>A preset a teljes piszkozat tárgyát, preheaderét, design tokenjeit és blokkszerkezetét beállítja. A sablon identitását nem módosítja.</p><div className={libraryStyles.presetWarning}>A preset alkalmazása nem ment és nem aktivál automatikusan. A teljes művelet egyetlen Visszavonás lépéssel visszaállítható.</div><div className={libraryStyles.libraryCards}>{presets.map(preset=><article className={`${libraryStyles.libraryCard} ${libraryStyles.presetCard}`} key={preset.id}><span className={libraryStyles.presetBadge}>{preset.badge}</span><div className={libraryStyles.libraryCardTop}><span className={libraryStyles.libraryIcon}>✦</span><div className={libraryStyles.libraryMeta}><strong>{preset.name}</strong><span>{preset.blocks.length} blokk</span><p>{preset.description}</p></div></div><button type="button" className={libraryStyles.libraryAction} onClick={()=>onApply(preset)}>Preset alkalmazása</button></article>)}</div>{!presets.length&&<div className={styles.emptyLibrary}><span>◇</span><strong>Nincs preset ehhez a családhoz</strong><p>A család-specifikus presetek későbbi bővítéssel kerülnek ide.</p></div>}</div>;
}

function DynamicLibrary({copiedBinding,onCopy}:{copiedBinding:string;onCopy:(key:string)=>void}){
  const groups=useMemo(()=>Array.from(new Set(emailBindingRegistry.map(item=>item.requiredContext))),[]);
  return <div className={styles.libraryPane}><div className={styles.panelHead}><div><span className={styles.kicker}>Dinamikus adatok</span><strong>Változók</strong></div></div><p className={styles.libraryIntro}>Kattints egy változóra a vágólapra másoláshoz, majd illeszd be egy támogatott szövegmezőbe.</p>{groups.map(group=><section className={styles.bindingGroup} key={group}><h3>{bindingGroupLabel(group)}</h3><div>{emailBindingRegistry.filter(item=>item.requiredContext===group).map(binding=><button type="button" key={binding.key} onClick={()=>onCopy(binding.key)}><span>{binding.label}</span><code>{copiedBinding===binding.key?'Másolva':`{{${binding.key}}}`}</code></button>)}</div></section>)}</div>;
}

function bindingGroupLabel(group:string){return group==='store'?'Webshop':group==='customer'?'Vásárló':group==='order'?'Rendelés':group==='payment'?'Fizetés':group==='shipping'?'Szállítás':group==='billing'?'Számlázás':'Kupon';}

function LibraryPlaceholder(){
  return <div className={styles.libraryPane}><div className={styles.panelHead}><div><span className={styles.kicker}>Könyvtár</span><strong>Saját blokkok</strong></div></div><div className={styles.emptyLibrary}><span>◇</span><strong>Saját blokkok</strong><p>Ide kerülnek a kereskedő által elmentett és újrahasznosítható saját blokkok.</p><small>A menthető saját blokkok következő külön capability-ként készülnek el; addig nem jelenítünk meg ál-funkciókat.</small></div></div>;
}

function ContentSettings({block,onChange,onEditStart,onEditEnd}:{block:EmailBlock;onChange:(key:string,value:unknown,groupKey?:string)=>void;onEditStart:(key:string)=>void;onEditEnd:(key:string)=>void}){
  const c=block.content as Record<string,unknown>;
  const groupKey=(field:string)=>`block:${block.id}:content:${field}`;
  const editProps=(field:string)=>({onFocus:()=>onEditStart(groupKey(field)),onBlur:()=>onEditEnd(groupKey(field))});
  if(block.type==='heading')return <div className={styles.settingGroup}><label><span>Szöveg</span><textarea {...editProps('text')} value={String(c.text??'')} onChange={e=>onChange('text',e.target.value,groupKey('text'))}/></label><label><span>Szint</span><select value={String(c.level??'h2')} onChange={e=>onChange('level',e.target.value)}><option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option></select></label><Align value={String(c.align??'left')} onChange={value=>onChange('align',value)}/></div>;
  if(block.type==='text')return <div className={styles.settingGroup}><label><span>Szöveg</span><textarea {...editProps('text')} rows={7} value={String(c.text??'')} onChange={e=>onChange('text',e.target.value,groupKey('text'))}/></label><Align value={String(c.align??'left')} onChange={value=>onChange('align',value)}/><BindingHelp/></div>;
  if(block.type==='button')return <div className={styles.settingGroup}><label><span>Gomb felirata</span><input {...editProps('label')} value={String(c.label??'')} onChange={e=>onChange('label',e.target.value,groupKey('label'))}/></label><label><span>Hivatkozás</span><input {...editProps('href')} value={String(c.href??'')} onChange={e=>onChange('href',e.target.value,groupKey('href'))}/></label><Align value={String(c.align??'left')} onChange={value=>onChange('align',value)}/><BindingHelp/></div>;
  if(block.type==='spacer')return <div className={styles.settingGroup}><label><span>Méret</span><select value={String(c.size??'m')} onChange={e=>onChange('size',e.target.value)}><option value="s">Kicsi</option><option value="m">Normál</option><option value="l">Nagy</option><option value="xl">Extra nagy</option></select></label></div>;
  if(block.type==='address')return <div className={styles.settingGroup}><label><span>Cím típusa</span><select value={String(c.kind??'shipping')} onChange={e=>onChange('kind',e.target.value)}><option value="shipping">Szállítási</option><option value="billing">Számlázási</option></select></label><label><span>Blokk címe</span><input {...editProps('title')} value={String(c.title??'')} onChange={e=>onChange('title',e.target.value,groupKey('title'))}/></label></div>;
  if(block.type==='header')return <div className={styles.settingGroup}><Toggle label="Logó megjelenítése" checked={c.showLogo!==false} onChange={value=>onChange('showLogo',value)}/><label><span>Szöveges márkanév felülírás</span><input {...editProps('brandText')} value={String(c.brandText??'')} onChange={e=>onChange('brandText',e.target.value,groupKey('brandText'))}/></label></div>;
  if(block.type==='footer')return <div className={styles.settingGroup}><label><span>Lábléc szövege</span><textarea {...editProps('text')} value={String(c.text??'')} onChange={e=>onChange('text',e.target.value,groupKey('text'))}/></label><BindingHelp/></div>;
  if(block.type==='divider')return <div className={styles.settingIntro}>Az elválasztó a sablon globális design-tokenjeit használja.</div>;
  return <div className={styles.settingGroup}><label><span>Blokk címe</span><input {...editProps('title')} value={String(c.title??'')} onChange={e=>onChange('title',e.target.value,groupKey('title'))}/></label></div>;
}

function DesignSettings({document,onChange}:{document:EmailDocument;onChange:(patch:Partial<EmailDocument>)=>void}){
  const colors=document.design.colors??{},radius=document.design.radius??{};
  function color(key:'background'|'surface'|'primary'|'text',value:string){onChange({design:{...document.design,colors:{...colors,[key]:value}}});}
  return <div className={styles.settingGroup}><div className={styles.settingIntro}>A design tokenek sablonszinten érvényesülnek, így az egész e-mail konzisztens marad.</div><label><span>Elsődleges szín</span><div className={styles.colorRow}><input type="color" value={colors.primary??'#159b7b'} onChange={e=>color('primary',e.target.value)}/><input value={colors.primary??'#159b7b'} onChange={e=>color('primary',e.target.value)}/></div></label><label><span>Háttér</span><div className={styles.colorRow}><input type="color" value={colors.background??'#f4f6f4'} onChange={e=>color('background',e.target.value)}/><input value={colors.background??'#f4f6f4'} onChange={e=>color('background',e.target.value)}/></div></label><label><span>Kártya háttér</span><div className={styles.colorRow}><input type="color" value={colors.surface??'#ffffff'} onChange={e=>color('surface',e.target.value)}/><input value={colors.surface??'#ffffff'} onChange={e=>color('surface',e.target.value)}/></div></label><label><span>Szövegszín</span><div className={styles.colorRow}><input type="color" value={colors.text??'#17231a'} onChange={e=>color('text',e.target.value)}/><input value={colors.text??'#17231a'} onChange={e=>color('text',e.target.value)}/></div></label><label><span>Kártya lekerekítés: {radius.card??16}px</span><input type="range" min="0" max="32" value={radius.card??16} onChange={e=>onChange({design:{...document.design,radius:{...radius,card:Number(e.target.value)}}})}/></label></div>;
}

function Align({value,onChange}:{value:string;onChange:(value:string)=>void}){return <label><span>Igazítás</span><div className={styles.segmented}>{['left','center','right'].map(item=><button type="button" key={item} className={value===item?styles.active:''} onClick={()=>onChange(item)}>{item==='left'?'Bal':item==='center'?'Közép':'Jobb'}</button>)}</div></label>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}){return <label className={styles.toggle}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span>{label}</span></label>}
function BindingHelp(){return <details className={styles.bindings}><summary>Dinamikus adatok</summary><div>{emailBindingRegistry.slice(0,12).map(binding=><code key={binding.key}>{`{{${binding.key}}}`}</code>)}</div></details>}
