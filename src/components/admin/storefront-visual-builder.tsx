'use client';

import Link from 'next/link';
import {useState,useTransition,type DragEvent,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {StorefrontFidelitySettings} from '@/components/admin/storefront-fidelity-settings';
import {StorefrontSavedBlocksPanel} from '@/components/admin/storefront-saved-blocks-panel';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  applyStorefrontBuilderMutation,
  createStorefrontBuilderHistory,
  listStorefrontBuilderInsertableComponents,
  pushStorefrontBuilderHistory,
  redoStorefrontBuilderHistory,
  undoStorefrontBuilderHistory,
  type StorefrontBuilderHistory,
  type StorefrontBuilderMutation,
} from '@/lib/builder/storefront-visual-builder';
import {
  hasStorefrontRuntimeCapability,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
  type StorefrontRuntimeCapabilityContext,
  type StorefrontResolvedComponentNode,
} from '@/lib/builder/storefront-runtime';
import type {StorefrontSavedBlockSummary} from '@/lib/builder/storefront-saved-block-persistence';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {FeatureCode} from '@/lib/plans/catalog';
import type {StorefrontBuilderPageListItem,StorefrontBuilderRevisionListItem} from '@/lib/builder/storefront-builder-server';
import {
  createVisualBuilderPreviewAction,
  installVisualBuilderTemplateAction,
  publishVisualBuilderPageAction,
  rollbackVisualBuilderPageAction,
  saveVisualBuilderDraftAction,
} from '@/app/admin/tartalom/builder/actions';
import styles from './storefront-visual-builder.module.css';

type TemplateEntry={
  templateKey:string;
  templateVersion:number;
  category:string;
  minPlan:'alap'|'pro';
  requiredFeatures:readonly string[];
  pageTypes:readonly string[];
};

type Props={
  pages:StorefrontBuilderPageListItem[];
  document:StorefrontPageDocument|null;
  pageId:string|null;
  draftRevision:number|null;
  publishedRevision:number|null;
  revisions:StorefrontBuilderRevisionListItem[];
  capability:StorefrontRuntimeCapabilityContext;
  bindingContext:Record<string,unknown>;
  templates:TemplateEntry[];
  savedBlocks:StorefrontSavedBlockSummary[];
};

type FlatNode={node:StorefrontComponentNode;parentId:string|null;index:number;depth:number};
type PanelMode='pages'|'add'|'structure'|'settings';
type EditorTab='content'|'appearance'|'advanced';

const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
const VIEWPORTS:readonly {key:StorefrontViewport;label:string;width:number;icon:string}[]=[
  {key:'desktop',label:'Desktop',width:1200,icon:'▣'},
  {key:'tablet',label:'Tablet',width:768,icon:'▯'},
  {key:'mobile',label:'Mobil',width:390,icon:'▯'},
];
const TOKEN_OPTIONS:Record<string,readonly string[]>={
  gap:['none','xs','s','m','l','xl','2xl'],
  spacing:['none','xs','s','m','l','xl','2xl'],
  align:['start','center','end','stretch','left','right'],
  justify:['start','center','end','between'],
  width:['full','content','narrow'],
  tone:['background','surface','muted','primary','text'],
  direction:['vertical','horizontal'],
  fit:['cover','contain'],
  loading:['lazy','eager'],
  radius:['none','s','m','l','pill'],
  variant:['primary','secondary','ghost'],
  size:['s','m','l'],
};
const APPEARANCE_KEYS=new Set(['gap','spacing','align','justify','width','tone','direction','fit','radius','variant','size','background','backgroundColor','color','textColor','overlay','padding']);
const isAppearanceKey=(key:string)=>APPEARANCE_KEYS.has(key)||key==='style'||key.endsWith('Style');
const operationKey=(kind:string)=>`builder:${kind}:${crypto.randomUUID()}`;
const humanize=(value:string)=>value
  .replace(/([a-z0-9])([A-Z])/g,'$1 $2')
  .replace(/[._:-]+/g,' ')
  .replace(/\b\w/g,letter=>letter.toUpperCase());
const pageLabel=(page:Pick<StorefrontBuilderPageListItem,'pageKey'|'pageType'>)=>humanize(page.pageType||page.pageKey);
const componentLabel=(key:string)=>humanize(key.split('.').at(-1)??key);
const componentIcon=(key:string)=>{
  const value=key.toLowerCase();
  if(value.includes('hero')||value.includes('banner'))return'▧';
  if(value.includes('product')||value.includes('collection'))return'◇';
  if(value.includes('review')||value.includes('testimonial'))return'☆';
  if(value.includes('newsletter')||value.includes('email'))return'✉';
  if(value.includes('faq'))return'?';
  if(value.includes('image')||value.includes('gallery'))return'▣';
  if(value.includes('text')||value.includes('copy')||value.includes('heading'))return'T';
  if(value.includes('button')||value.includes('cta'))return'＋';
  return'◆';
};
const componentGroup=(key:string)=>{
  const value=key.toLowerCase();
  if(value.includes('hero')||value.includes('banner'))return'Hero';
  if(value.includes('product')||value.includes('collection')||value.includes('recommend'))return'Termékek';
  if(value.includes('review')||value.includes('testimonial')||value.includes('story')||value.includes('editorial')||value.includes('blog'))return'Tartalom';
  if(value.includes('newsletter')||value.includes('cta')||value.includes('promo')||value.includes('finder')||value.includes('cart'))return'Konverzió';
  return'Egyéb';
};

function flatten(document:StorefrontPageDocument){
  const result:FlatNode[]=[];
  const walk=(nodes:StorefrontComponentNode[],parentId:string|null,depth:number)=>nodes.forEach((node,index)=>{
    result.push({node,parentId,index,depth});
    walk(node.children??[],node.id,depth+1);
  });
  walk(document.sections,null,0);
  return result;
}

function getNode(document:StorefrontPageDocument,id:string|null){
  return id?flatten(document).find(item=>item.node.id===id)?.node??null:null;
}

function setNested(value:unknown,path:(string|number)[],next:unknown):unknown{
  if(!path.length)return next;
  const[head,...tail]=path;
  if(Array.isArray(value)){
    const copy=[...value];
    copy[Number(head)]=setNested(copy[Number(head)],tail,next);
    return copy;
  }
  const source=value&&typeof value==='object'?value as Record<string,unknown>:{};
  return{...source,[String(head)]:setNested(source[String(head)],tail,next)};
}

function ScalarEditor({label,value,onChange}:{label:string;value:unknown;onChange:(value:unknown)=>void}){
  if(typeof value==='boolean')return <label className={styles.switchField}><span>{humanize(label)}</span><input type="checkbox" checked={value} onChange={event=>onChange(event.target.checked)}/><i aria-hidden="true"/></label>;
  if(typeof value==='number')return <label className={styles.field}><span>{humanize(label)}</span><input type="number" value={value} onChange={event=>onChange(Number(event.target.value))}/></label>;
  const options=TOKEN_OPTIONS[label];
  if(options)return <label className={styles.field}><span>{humanize(label)}</span><select value={typeof value==='string'?value:''} onChange={event=>onChange(event.target.value)}><option value="">—</option>{options.map(option=><option key={option} value={option}>{humanize(option)}</option>)}</select></label>;
  const stringValue=typeof value==='string'?value:'';
  const color=/^#[0-9a-f]{6}$/i.test(stringValue);
  if(color)return <label className={styles.field}><span>{humanize(label)}</span><span className={styles.colorField}><input type="color" value={stringValue} onChange={event=>onChange(event.target.value)}/><input value={stringValue} onChange={event=>onChange(event.target.value)}/></span></label>;
  const multiline=label.toLowerCase().includes('copy')||label.toLowerCase().includes('text')||label.toLowerCase().includes('description')||stringValue.length>80;
  return <label className={styles.field}><span>{humanize(label)}</span>{multiline?<textarea value={stringValue} rows={4} onChange={event=>onChange(event.target.value)}/>:<input value={stringValue} onChange={event=>onChange(event.target.value)}/>}</label>;
}

function StructuredEditor({label,value,onChange}:{label:string;value:unknown;onChange:(value:unknown)=>void}){
  if(value===null||value===undefined||typeof value!=='object')return <ScalarEditor label={label} value={value??''} onChange={onChange}/>;
  if(Array.isArray(value))return <div className={styles.complexField}><strong>{humanize(label)}</strong>{value.length===0?<span className={styles.muted}>Üres lista – ezt adatbinding vagy a komponens logikája töltheti.</span>:value.map((item,index)=><StructuredEditor key={index} label={`${index+1}. elem`} value={item} onChange={next=>onChange(setNested(value,[index],next))}/>)}</div>;
  return <div className={styles.complexField}><strong>{humanize(label)}</strong>{Object.entries(value as Record<string,unknown>).map(([key,child])=><StructuredEditor key={key} label={key} value={child} onChange={next=>onChange(setNested(value,[key],next))}/>)}</div>;
}

function Outline({document,selectedId,onSelect,onMove}:{document:StorefrontPageDocument;selectedId:string|null;onSelect:(id:string)=>void;onMove:(nodeId:string,parentId:string|null,index:number)=>void}){
  const items=flatten(document);
  const[dragging,setDragging]=useState<string|null>(null);
  const drop=(event:DragEvent,entry:FlatNode)=>{
    event.preventDefault();
    if(dragging&&dragging!==entry.node.id)onMove(dragging,entry.parentId,entry.index);
    setDragging(null);
  };
  return <div className={styles.outline}>{items.map(entry=><div
    key={entry.node.id}
    className={`${styles.outlineRow} ${selectedId===entry.node.id?styles.selected:''}`}
    style={{paddingLeft:8+entry.depth*16}}
    draggable
    onDragStart={()=>setDragging(entry.node.id)}
    onDragEnd={()=>setDragging(null)}
    onDragOver={event=>event.preventDefault()}
    onDrop={event=>drop(event,entry)}
  >
    <button type="button" onClick={()=>onSelect(entry.node.id)}><span className={styles.dragHandle} aria-hidden="true">⋮⋮</span><span className={styles.outlineIcon} aria-hidden="true">{componentIcon(entry.node.componentKey)}</span><span><strong>{componentLabel(entry.node.componentKey)}</strong><small>{entry.node.id}</small></span></button>
    <span className={styles.rowMoves}><button type="button" aria-label="Mozgatás felfelé" disabled={entry.index===0} onClick={()=>onMove(entry.node.id,entry.parentId,Math.max(0,entry.index-1))}>↑</button><button type="button" aria-label="Mozgatás lefelé" onClick={()=>onMove(entry.node.id,entry.parentId,entry.index+1)}>↓</button></span>
  </div>)}</div>;
}

export function StorefrontVisualBuilder({pages,document:initialDocument,pageId,draftRevision:initialDraftRevision,publishedRevision:initialPublishedRevision,revisions,capability,bindingContext,templates,savedBlocks}:Props){
  const router=useRouter();
  const[busy,startTransition]=useTransition();
  const[history,setHistory]=useState<StorefrontBuilderHistory|null>(()=>initialDocument?createStorefrontBuilderHistory(initialDocument):null);
  const[selectedId,setSelectedId]=useState<string|null>(()=>initialDocument?.sections[0]?.id??null);
  const[viewport,setViewport]=useState<StorefrontViewport>('desktop');
  const[draftRevision,setDraftRevision]=useState(initialDraftRevision);
  const[publishedRevision,setPublishedRevision]=useState(initialPublishedRevision);
  const[dirty,setDirty]=useState(false);
  const[notice,setNotice]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[panelMode,setPanelMode]=useState<PanelMode>('pages');
  const[editorTab,setEditorTab]=useState<EditorTab>('content');
  const[historyOpen,setHistoryOpen]=useState(false);
  const[componentQuery,setComponentQuery]=useState('');
  const[componentFilter,setComponentFilter]=useState('Összes');
  const document=history?.present??null;
  const selected=document?getNode(document,selectedId):null;
  const definition=selected?componentRegistry.get(selected.componentKey,selected.componentVersion):undefined;
  const viewportWidth=VIEWPORTS.find(item=>item.key===viewport)?.width??1200;
  const entitled=(template:TemplateEntry)=>hasStorefrontRuntimeCapability({minPlan:template.minPlan,features:template.requiredFeatures as readonly FeatureCode[]},capability);

  const mutate=(mutation:StorefrontBuilderMutation)=>{
    if(!document)return;
    try{
      const next=applyStorefrontBuilderMutation({document,mutation,registry:componentRegistry,capability});
      setHistory(current=>current?pushStorefrontBuilderHistory(current,next):current);
      setDirty(true);
      setError(null);
    }catch(reason){setError(reason instanceof Error?reason.message:'A módosítás nem hajtható végre.');}
  };
  const applyFidelity=(next:StorefrontPageDocument,message:string)=>{
    setHistory(current=>current?pushStorefrontBuilderHistory(current,next):current);
    setDirty(true);
    setError(null);
    setNotice(message);
  };
  const run=(job:()=>Promise<void>)=>startTransition(()=>{
    setError(null);
    setNotice(null);
    job().catch(reason=>setError(reason instanceof Error?reason.message:'A művelet sikertelen.'));
  });
  const move=(nodeId:string,parentId:string|null,index:number)=>mutate({type:'move',nodeId,parentId,index});
  const save=()=>{
    if(!document)return;
    run(async()=>{
      const result=await saveVisualBuilderDraftAction({document,expectedDraftRevision:draftRevision,operationKey:operationKey('save')});
      setDraftRevision(result.revisionNumber);
      setDirty(false);
      setNotice(`Mentve · r${result.revisionNumber}${result.replayed?' · replay':''}`);
      router.refresh();
    });
  };
  const preview=()=>{
    if(!pageId||!draftRevision)return;
    run(async()=>{
      if(dirty)throw new Error('PREVIEW_REQUIRES_SAVED_DRAFT');
      const result=await createVisualBuilderPreviewAction({pageId,revisionNumber:draftRevision,operationKey:operationKey('preview')});
      window.open(`${result.href}?viewport=${viewport}`,'_blank','noopener,noreferrer');
      setNotice(`Előnézet létrehozva · r${result.revisionNumber}`);
    });
  };
  const publish=()=>{
    if(!pageId||!draftRevision)return;
    run(async()=>{
      if(dirty)throw new Error('PUBLISH_REQUIRES_SAVED_DRAFT');
      const result=await publishVisualBuilderPageAction({pageId,expectedDraftRevision:draftRevision,operationKey:operationKey('publish')});
      setPublishedRevision(result.revisionNumber);
      setNotice(`Publikálva · r${result.revisionNumber}`);
      router.refresh();
    });
  };
  const rollback=(target:number)=>{
    if(!pageId||!publishedRevision)return;
    run(async()=>{
      const result=await rollbackVisualBuilderPageAction({pageId,targetPublishedRevision:target,expectedCurrentPublishedRevision:publishedRevision,operationKey:operationKey('rollback')});
      setPublishedRevision(result.revisionNumber);
      setNotice(`Visszaállítás elkészült · r${result.revisionNumber}`);
      router.refresh();
    });
  };
  const install=(template:TemplateEntry)=>run(async()=>{
    const result=await installVisualBuilderTemplateAction({templateKey:template.templateKey,templateVersion:template.templateVersion,operationKey:operationKey('template')});
    setNotice(`${result.templateKey} draftként telepítve · ${result.pageCount} oldal`);
    router.refresh();
  });
  const openTemplateLibrary=()=>{
    if(dirty){
      setError('A Sablonok megnyitása előtt mentsd a jelenlegi oldal nem mentett módosításait.');
      return;
    }
    router.push('/admin/tartalom/builder?view=templates');
  };

  if(!document)return <div className={styles.builderShell}>
    <header className={styles.topbar}>
      <div className={styles.builderBrand}><span className={styles.builderMark}>S</span><span><strong>Shoperation</strong><small>Visual Builder</small></span></div>
      <Link className={styles.backButton} href="/admin">← Vissza az Admin felületre</Link>
    </header>
    <section className={styles.emptyState}>
      <div><span className={styles.kicker}>Visual Builder</span><h1>Indulj egy valódi sablonból</h1><p>A kiválasztott sablon draft Page Schema oldalakat hoz létre. Nem publikál automatikusan és nem módosít üzleti adatot.</p></div>
      <div className={styles.templateGrid}>{templates.map(template=><article className={styles.templateCard} key={`${template.templateKey}@${template.templateVersion}`}><span>{template.category}</span><h2>{humanize(template.templateKey)}</h2><p>{template.pageTypes.length} oldal preset · {template.minPlan==='pro'?'Pro':'Alap'}</p><button type="button" disabled={busy||!entitled(template)} onClick={()=>install(template)}>{entitled(template)?'Sablon használata':'Csomag vagy jogosultság szükséges'}</button></article>)}</div>
      {error&&<div className={styles.errorNotice} role="alert">{error}</div>}
      {notice&&<div className={styles.notice}>{notice}</div>}
    </section>
  </div>;

  const flat=flatten(document);
  const insertableSelected=selected?listStorefrontBuilderInsertableComponents({document,registry:componentRegistry,capability,parentId:selected.id}):[];
  const insertableRoot=listStorefrontBuilderInsertableComponents({document,registry:componentRegistry,capability,parentId:null});
  const insertable=[...insertableRoot,...insertableSelected.filter(candidate=>!insertableRoot.some(root=>root.componentKey===candidate.componentKey&&root.componentVersion===candidate.componentVersion))];
  const visibleInsertable=insertable.filter(item=>{
    const matchesQuery=!componentQuery.trim()||`${item.componentKey} ${componentLabel(item.componentKey)}`.toLowerCase().includes(componentQuery.trim().toLowerCase());
    const matchesFilter=componentFilter==='Összes'||componentGroup(item.componentKey)===componentFilter;
    return matchesQuery&&matchesFilter;
  });
  const setConfig=(key:string,value:unknown)=>selected&&mutate({type:'config',nodeId:selected.id,key,value});
  const addComponent=(item:{componentKey:string;componentVersion:number},parentId:string|null)=>{
    const nodeId=`${item.componentKey.replace(/[^a-z0-9._:-]+/gi,'-')}-${crypto.randomUUID().slice(0,8)}`.toLowerCase().slice(0,127);
    mutate({type:'add',parentId,componentKey:item.componentKey,componentVersion:item.componentVersion,nodeId});
    setSelectedId(nodeId);
    setPanelMode('pages');
    setEditorTab('content');
  };
  const selectedFlat=selected?flat.find(entry=>entry.node.id===selected.id)??null:null;
  const contentKeys=definition?.manifest.configurable.filter(key=>!isAppearanceKey(key))??[];
  const appearanceKeys=definition?.manifest.configurable.filter(key=>isAppearanceKey(key))??[];
  const selectNode=(id:string)=>{setSelectedId(id);setPanelMode('pages');setEditorTab('content');};
  const canvasDecorator=(node:StorefrontResolvedComponentNode,rendered:ReactNode)=>{
    const entry=flat.find(item=>item.node.id===node.id);
    const nodeDefinition=componentRegistry.get(node.componentKey,node.componentVersion);
    const protectedNode=nodeDefinition?.protectedSystem===true;
    const active=selectedId===node.id;
    return <div className={`${styles.canvasNode} ${active?styles.canvasNodeSelected:''}`} data-builder-node-id={node.id} onClick={event=>{event.stopPropagation();selectNode(node.id);}}>
      {active?<>
        <span className={styles.nodeLabel}>{componentLabel(node.componentKey)}</span>
        <div className={styles.nodeToolbar} onClick={event=>event.stopPropagation()}>
          <button type="button" title="Felfelé" disabled={!entry||entry.index===0||protectedNode} onClick={()=>entry&&move(node.id,entry.parentId,Math.max(0,entry.index-1))}>↑</button>
          <button type="button" title="Lefelé" disabled={!entry||protectedNode} onClick={()=>entry&&move(node.id,entry.parentId,entry.index+1)}>↓</button>
          <button type="button" title="Duplikálás" disabled={protectedNode} onClick={()=>mutate({type:'duplicate',nodeId:node.id})}>⧉</button>
          <button type="button" title="Törlés" disabled={protectedNode} onClick={()=>{mutate({type:'remove',nodeId:node.id});setSelectedId(null);}}>⌫</button>
          <button type="button" title="Szerkesztés" onClick={()=>{setPanelMode('pages');setEditorTab('content');}}>•••</button>
        </div>
        {!protectedNode?<button type="button" className={styles.insertAfterButton} title="Új szekció hozzáadása" onClick={event=>{event.stopPropagation();setPanelMode('add');}}>＋</button>:null}
      </>:null}
      {rendered}
    </div>;
  };

  return <div className={styles.builderShell}>
    <header className={styles.topbar}>
      <div className={styles.builderBrand}><span className={styles.builderMark}>S</span><span><strong>Shoperation</strong><small>Visual Builder</small></span></div>
      <Link className={styles.backButton} href="/admin">← Vissza az Admin felületre</Link>
      <label className={styles.pageSelect}><span className={styles.srOnly}>Szerkesztett oldal</span><select value={document.pageKey} onChange={event=>router.push(`/admin/tartalom/builder?page=${encodeURIComponent(event.target.value)}`)}>{pages.map(page=><option key={page.pageId} value={page.pageKey}>{pageLabel(page)}</option>)}</select></label>
      <div className={styles.viewportSwitch}>{VIEWPORTS.map(item=><button key={item.key} type="button" data-active={viewport===item.key} onClick={()=>setViewport(item.key)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</div>
      <div className={styles.topbarActions}>
        <button type="button" className={styles.iconButton} aria-label="Visszavonás" title="Visszavonás" disabled={busy||!history?.past.length} onClick={()=>{setHistory(current=>current?undoStorefrontBuilderHistory(current):current);setDirty(true);}}>↶</button>
        <button type="button" className={styles.iconButton} aria-label="Újra" title="Újra" disabled={busy||!history?.future.length} onClick={()=>{setHistory(current=>current?redoStorefrontBuilderHistory(current):current);setDirty(true);}}>↷</button>
        <span className={styles.saveState}>{dirty?'Nem mentett módosítás':draftRevision?`Mentve · r${draftRevision}`:'Draft'}</span>
        <button type="button" className={styles.secondaryButton} disabled={busy||!dirty} onClick={save}>Mentés</button>
        <button type="button" className={styles.secondaryButton} disabled={busy} onClick={openTemplateLibrary}>▦ Sablonok</button>
        <button type="button" className={styles.secondaryButton} onClick={()=>setHistoryOpen(true)}>◷ Előzmények</button>
        <button type="button" className={styles.secondaryButton} disabled={busy||dirty||!draftRevision} onClick={preview}>◉ Előnézet</button>
        <button type="button" className={styles.publishButton} disabled={busy||dirty||!draftRevision} onClick={publish}>⬆ Publikálás</button>
      </div>
    </header>

    {(error||notice)?<div className={styles.feedbackBar}>{error?<span className={styles.errorNotice} role="alert">{error}</span>:null}{notice?<span className={styles.notice} role="status">{notice}</span>:null}</div>:null}

    <div className={styles.workspace}>
      <aside className={styles.controlPanel}>
        <nav className={styles.panelNav} aria-label="Visual Builder vezérlőpult">
          <button type="button" data-active={panelMode==='pages'} onClick={()=>setPanelMode('pages')}><span>▣</span>Oldalak</button>
          <button type="button" data-active={panelMode==='add'} onClick={()=>setPanelMode('add')}><span>＋</span>Hozzáadás</button>
          <button type="button" data-active={panelMode==='structure'} onClick={()=>setPanelMode('structure')}><span>◇</span>Szerkezet</button>
          <button type="button" data-active={panelMode==='settings'} onClick={()=>setPanelMode('settings')}><span>⚙</span>Beállítások</button>
        </nav>

        <div className={styles.panelBody}>
          {panelMode==='pages'?<>
            <div className={styles.panelSectionHead}><div><strong>Oldalak</strong><span>Kattints egy oldalra a szerkesztéshez.</span></div></div>
            <div className={styles.pageList}>{pages.map(page=><Link key={page.pageId} data-active={page.pageKey===document.pageKey} href={`/admin/tartalom/builder?page=${encodeURIComponent(page.pageKey)}`}><span className={styles.pageIcon}>{page.pageKey===document.pageKey?'⌂':'▱'}</span><span><strong>{pageLabel(page)}</strong><small>{page.pageKey}</small></span></Link>)}</div>
            <div className={styles.panelDivider}/>
            {selected&&definition?<div className={styles.selectionEditor}>
              <div className={styles.selectionHead}><span className={styles.selectionThumb}>{componentIcon(selected.componentKey)}</span><span><strong>{componentLabel(selected.componentKey)}</strong><small>{selected.componentKey}</small></span></div>
              <div className={styles.editorTabs}><button type="button" data-active={editorTab==='content'} onClick={()=>setEditorTab('content')}>Tartalom</button><button type="button" data-active={editorTab==='appearance'} onClick={()=>setEditorTab('appearance')}>Megjelenés</button><button type="button" data-active={editorTab==='advanced'} onClick={()=>setEditorTab('advanced')}>Haladó</button></div>
              {editorTab==='content'?<div className={styles.editorFields}>{contentKeys.length?contentKeys.map(key=><StructuredEditor key={key} label={key} value={selected.config[key]} onChange={value=>setConfig(key,value)}/>):<p className={styles.emptyHint}>Ennek az elemnek nincs külön tartalmi mezője. A megjelenési beállításokat a következő fülön találod.</p>}</div>:null}
              {editorTab==='appearance'?<div className={styles.editorFields}>
                {appearanceKeys.map(key=><StructuredEditor key={key} label={key} value={selected.config[key]} onChange={value=>setConfig(key,value)}/>)}
                <div className={styles.fieldGroup}><strong>{humanize(viewport)} beállítások</strong><label className={styles.switchField}><span>Elrejtés ezen a nézeten</span><input type="checkbox" checked={selected.responsive?.[viewport]?.hidden??false} onChange={event=>mutate({type:'responsive',nodeId:selected.id,viewport,hidden:event.target.checked})}/><i aria-hidden="true"/></label>{definition.manifest.responsiveMode!=='fixed'?<label className={styles.field}><span>Grid szélesség</span><select value={selected.responsive?.[viewport]?.gridSpan??''} onChange={event=>mutate({type:'responsive',nodeId:selected.id,viewport,gridSpan:event.target.value?Number(event.target.value):null})}><option value="">Örökölt / 12</option>{Array.from({length:12},(_,index)=>index+1).map(value=><option key={value} value={value}>{value} / 12</option>)}</select></label>:null}</div>
              </div>:null}
              {editorTab==='advanced'?<div className={styles.editorFields}><div className={styles.metaGrid}><span><small>Node ID</small><code>{selected.id}</code></span><span><small>Responsive</small><b>{definition.manifest.responsiveMode}</b></span><span><small>Csomag</small><b>{definition.manifest.capability.minPlan}</b></span></div><div className={styles.dangerActions}><button type="button" disabled={definition.protectedSystem} onClick={()=>mutate({type:'duplicate',nodeId:selected.id})}>⧉ Duplikálás</button><button type="button" disabled={definition.protectedSystem} onClick={()=>{mutate({type:'remove',nodeId:selected.id});setSelectedId(null);}}>⌫ Eltávolítás</button></div></div>:null}
            </div>:<div className={styles.emptySelection}><span>↖</span><strong>Válassz ki egy elemet</strong><p>Kattints a webshopon egy szekcióra vagy komponensre, és itt jelennek meg a szerkeszthető tulajdonságai.</p></div>}
          </>:null}

          {panelMode==='add'?<>
            <div className={styles.panelSectionHead}><div><strong>Hozzáadás</strong><span>Szekciók és komponensek a jelenlegi oldalhoz.</span></div></div>
            <input className={styles.componentSearch} value={componentQuery} onChange={event=>setComponentQuery(event.target.value)} placeholder="Keresés a blokkok között…"/>
            <div className={styles.filterTabs}>{['Összes','Hero','Termékek','Tartalom','Konverzió','Egyéb'].map(filter=><button key={filter} type="button" data-active={componentFilter===filter} onClick={()=>setComponentFilter(filter)}>{filter}</button>)}</div>
            {selected&&insertableSelected.length?<div className={styles.addTarget}><span>Kijelölt elem:</span><strong>{componentLabel(selected.componentKey)}</strong><small>A kompatibilis komponensek ide is beilleszthetők.</small></div>:null}
            <div className={styles.componentLibrary}>{visibleInsertable.map(item=>{
              const canInsertIntoSelected=Boolean(selected&&insertableSelected.some(candidate=>candidate.componentKey===item.componentKey&&candidate.componentVersion===item.componentVersion));
              const canInsertRoot=insertableRoot.some(candidate=>candidate.componentKey===item.componentKey&&candidate.componentVersion===item.componentVersion);
              return <article key={`${item.componentKey}@${item.componentVersion}`}><span className={styles.componentLibraryIcon}>{componentIcon(item.componentKey)}</span><span><strong>{componentLabel(item.componentKey)}</strong><small>{componentGroup(item.componentKey)} · {item.responsiveMode}</small></span><div>{canInsertIntoSelected?<button type="button" title="Beillesztés a kijelölt elembe" onClick={()=>addComponent(item,selected?.id??null)}>Beillesztés</button>:canInsertRoot?<button type="button" onClick={()=>addComponent(item,null)}>Hozzáadás</button>:null}</div></article>})}</div>
            {!visibleInsertable.length?<p className={styles.emptyHint}>Nincs a keresésnek megfelelő, ezen az oldalon engedélyezett komponens.</p>:null}
            <StorefrontSavedBlocksPanel
              document={document}
              selectedNode={selected}
              selectedIsTopLevel={selectedFlat?.parentId===null}
              initialSavedBlocks={savedBlocks}
              capability={capability}
              onApply={(next,insertedNodeId,message)=>{
                applyFidelity(next,message);
                setSelectedId(insertedNodeId);
                setPanelMode('pages');
                setEditorTab('content');
              }}
            />
            <button type="button" className={styles.addSectionButton} onClick={openTemplateLibrary}>▦ Sablonkönyvtár megnyitása</button>
          </>:null}

          {panelMode==='structure'?<>
            <div className={styles.panelSectionHead}><div><strong>Oldalszerkezet</strong><span>Fogd és vidd, vagy használd a nyilakat.</span></div></div>
            <Outline document={document} selectedId={selectedId} onSelect={selectNode} onMove={move}/>
            <button type="button" className={styles.addSectionButton} onClick={()=>setPanelMode('add')}>＋ Blokk hozzáadása</button>
          </>:null}

          {panelMode==='settings'?<>
            <div className={styles.panelSectionHead}><div><strong>Beállítások</strong><span>Az oldal és a Builder aktuális állapota.</span></div></div>
            <div className={styles.settingsCards}><article><small>Aktuális oldal</small><strong>{pageLabel({pageKey:document.pageKey,pageType:document.pageType} as StorefrontBuilderPageListItem)}</strong><span>{document.pageKey}</span></article><article><small>Sablon</small><strong>{humanize(document.templateKey)}</strong><span>v{document.templateVersion}</span></article><article><small>Draft / Publikált</small><strong>r{draftRevision??'—'} / r{publishedRevision??'—'}</strong><span>{dirty?'Van nem mentett módosítás':'Szinkronban'}</span></article></div>
            <StorefrontFidelitySettings document={document} viewport={viewport} onApply={applyFidelity}/>
            <button type="button" className={styles.addSectionButton} onClick={openTemplateLibrary}>▦ Másik sablon megtekintése</button>
          </>:null}
        </div>
      </aside>

      <main className={styles.canvasStage} onClick={()=>setSelectedId(null)}>
        <div className={styles.canvasMeta}><span>{humanize(viewport)} nézet</span><span>{viewportWidth}px · élő storefront runtime</span></div>
        <div className={styles.canvasViewport} data-viewport={viewport} style={{width:`min(100%, ${viewportWidth}px)`}}><StorefrontRuntimeRenderer page={document} viewport={viewport} bindingContext={bindingContext} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry} capability={capability} decorateNode={canvasDecorator}/></div>
      </main>
    </div>

    {historyOpen?<div className={styles.drawerBackdrop} onClick={()=>setHistoryOpen(false)}><aside className={styles.historyDrawer} onClick={event=>event.stopPropagation()}><header><div><span>Előzmények</span><strong>Verziók és publikálások</strong></div><button type="button" onClick={()=>setHistoryOpen(false)}>×</button></header><div className={styles.drawerStatus}><span>✓</span><div><strong>{dirty?'Nem mentett módosítások':'A változtatások mentve'}</strong><small>{dirty?'Mentsd a draftot az előnézet vagy publikálás előtt.':draftRevision?`Aktuális draft: r${draftRevision}`:'Nincs draft revision.'}</small></div></div><div className={styles.revisionList}>{revisions.filter(item=>item.kind==='published').map(item=><article key={item.revisionId}><div><strong>r{item.revisionNumber}</strong><time>{new Date(item.createdAt).toLocaleString('hu-HU')}</time></div><button type="button" disabled={busy||item.revisionNumber===publishedRevision} onClick={()=>rollback(item.revisionNumber)}>{item.revisionNumber===publishedRevision?'Aktuális':'Visszaállítás'}</button></article>)}</div><button type="button" className={styles.drawerPublish} disabled={busy||dirty||!draftRevision} onClick={publish}>⬆ Aktuális verzió publikálása</button></aside></div>:null}
  </div>;
}
