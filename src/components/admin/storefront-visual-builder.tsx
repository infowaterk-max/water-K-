'use client';

import Link from 'next/link';
import {useState,useTransition,type DragEvent,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
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
};

type FlatNode={node:StorefrontComponentNode;parentId:string|null;index:number;depth:number};

const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
const VIEWPORTS:readonly {key:StorefrontViewport;label:string;width:number}[]=[
  {key:'desktop',label:'Desktop',width:1200},
  {key:'tablet',label:'Tablet',width:768},
  {key:'mobile',label:'Mobile',width:390},
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
const operationKey=(kind:string)=>`builder:${kind}:${crypto.randomUUID()}`;

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
  if(typeof value==='boolean')return <label className={styles.field}><span>{label}</span><input type="checkbox" checked={value} onChange={event=>onChange(event.target.checked)}/></label>;
  if(typeof value==='number')return <label className={styles.field}><span>{label}</span><input type="number" value={value} onChange={event=>onChange(Number(event.target.value))}/></label>;
  const options=TOKEN_OPTIONS[label];
  if(options)return <label className={styles.field}><span>{label}</span><select value={typeof value==='string'?value:''} onChange={event=>onChange(event.target.value)}><option value="">—</option>{options.map(option=><option key={option} value={option}>{option}</option>)}</select></label>;
  const stringValue=typeof value==='string'?value:'';
  const multiline=label.toLowerCase().includes('copy')||label.toLowerCase().includes('text')||stringValue.length>80;
  return <label className={styles.field}><span>{label}</span>{multiline?<textarea value={stringValue} rows={4} onChange={event=>onChange(event.target.value)}/>:<input value={stringValue} onChange={event=>onChange(event.target.value)}/>}</label>;
}

function StructuredEditor({label,value,onChange}:{label:string;value:unknown;onChange:(value:unknown)=>void}){
  if(value===null||value===undefined||typeof value!=='object')return <ScalarEditor label={label} value={value??''} onChange={onChange}/>;
  if(Array.isArray(value))return <div className={styles.complexField}><strong>{label}</strong>{value.length===0?<span className={styles.muted}>Üres lista – adatbinding vagy komponens-logika töltheti.</span>:value.map((item,index)=><StructuredEditor key={index} label={`${index+1}. elem`} value={item} onChange={next=>onChange(setNested(value,[index],next))}/>)}</div>;
  return <div className={styles.complexField}><strong>{label}</strong>{Object.entries(value as Record<string,unknown>).map(([key,child])=><StructuredEditor key={key} label={key} value={child} onChange={next=>onChange(setNested(value,[key],next))}/>)}</div>;
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
    style={{paddingLeft:10+entry.depth*16}}
    draggable
    onDragStart={()=>setDragging(entry.node.id)}
    onDragEnd={()=>setDragging(null)}
    onDragOver={event=>event.preventDefault()}
    onDrop={event=>drop(event,entry)}
  >
    <button type="button" onClick={()=>onSelect(entry.node.id)}><span className={styles.dragHandle} aria-hidden="true">⋮⋮</span><span><strong>{entry.node.componentKey}</strong><small>{entry.node.id}</small></span></button>
    <span className={styles.rowMoves}><button type="button" aria-label="Mozgatás felfelé" disabled={entry.index===0} onClick={()=>onMove(entry.node.id,entry.parentId,Math.max(0,entry.index-1))}>↑</button><button type="button" aria-label="Mozgatás lefelé" onClick={()=>onMove(entry.node.id,entry.parentId,entry.index+1)}>↓</button></span>
  </div>)}</div>;
}

export function StorefrontVisualBuilder({pages,document:initialDocument,pageId,draftRevision:initialDraftRevision,publishedRevision:initialPublishedRevision,revisions,capability,bindingContext,templates}:Props){
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
      setNotice(`Draft mentve · r${result.revisionNumber}${result.replayed?' · replay':''}`);
      router.refresh();
    });
  };
  const preview=()=>{
    if(!pageId||!draftRevision)return;
    run(async()=>{
      if(dirty)throw new Error('PREVIEW_REQUIRES_SAVED_DRAFT');
      const result=await createVisualBuilderPreviewAction({pageId,revisionNumber:draftRevision,operationKey:operationKey('preview')});
      window.open(`${result.href}?viewport=${viewport}`,'_blank','noopener,noreferrer');
      setNotice(`Preview létrehozva · r${result.revisionNumber}`);
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
      setNotice(`Rollback elkészült új publikált revisionként · r${result.revisionNumber}`);
      router.refresh();
    });
  };
  const install=(template:TemplateEntry)=>run(async()=>{
    const result=await installVisualBuilderTemplateAction({templateKey:template.templateKey,templateVersion:template.templateVersion,operationKey:operationKey('template')});
    setNotice(`${result.templateKey} draftként telepítve · ${result.pageCount} oldal`);
    router.refresh();
  });

  if(!document)return <section className={styles.emptyState}>
    <div><span className="eyebrow">Visual Builder</span><h1 className="sectionTitle">Indulj egy valódi sablonból</h1><p className="lead">A kiválasztott sablon kizárólag draft Page Schema oldalakat hoz létre. Nem publikál automatikusan és nem módosít üzleti adatot.</p></div>
    <div className={styles.templateGrid}>{templates.map(template=><article className={styles.templateCard} key={`${template.templateKey}@${template.templateVersion}`}><span>{template.category}</span><h2>{template.templateKey}</h2><p>{template.pageTypes.length} oldal preset · {template.minPlan==='pro'?'Pro':'Alap'}</p><button type="button" disabled={busy||!entitled(template)} onClick={()=>install(template)}>{entitled(template)?'Sablon használata':'Csomag vagy jogosultság szükséges'}</button></article>)}</div>
    {error&&<div className="errorNotice" role="alert">{error}</div>}
    {notice&&<div className={styles.notice}>{notice}</div>}
  </section>;

  const insertableSelected=selected?listStorefrontBuilderInsertableComponents({document,registry:componentRegistry,capability,parentId:selected.id}):[];
  const insertableRoot=listStorefrontBuilderInsertableComponents({document,registry:componentRegistry,capability,parentId:null});
  const setConfig=(key:string,value:unknown)=>selected&&mutate({type:'config',nodeId:selected.id,key,value});
  const canvasDecorator=(node:StorefrontResolvedComponentNode,rendered:ReactNode)=><div className={`${styles.canvasNode} ${selectedId===node.id?styles.canvasNodeSelected:''}`} data-builder-node-id={node.id} onClick={event=>{event.stopPropagation();setSelectedId(node.id);}}>{rendered}</div>;

  return <div className={styles.builderShell}>
    <header className={styles.toolbar}>
      <div><span className="eyebrow">Roadmap Block 22 · Visual Builder</span><h1>{document.pageKey}</h1><p>{document.templateKey} v{document.templateVersion} · draft r{draftRevision??'—'} · published r{publishedRevision??'—'}</p></div>
      <div className={styles.toolbarActions}>
        <button type="button" disabled={busy||!history?.past.length} onClick={()=>{setHistory(current=>current?undoStorefrontBuilderHistory(current):current);setDirty(true);}}>↶ Undo</button>
        <button type="button" disabled={busy||!history?.future.length} onClick={()=>{setHistory(current=>current?redoStorefrontBuilderHistory(current):current);setDirty(true);}}>↷ Redo</button>
        <button type="button" disabled={busy||!dirty} onClick={save}>Draft mentése</button>
        <button type="button" disabled={busy||dirty||!draftRevision} onClick={preview}>Preview</button>
        <button type="button" className={styles.publishButton} disabled={busy||dirty||!draftRevision} onClick={publish}>Publikálás</button>
      </div>
    </header>
    <nav className={styles.pageTabs} aria-label="Storefront oldalak">{pages.map(page=><Link key={page.pageId} className={page.pageKey===document.pageKey?styles.activePage:''} href={`/admin/tartalom/builder?page=${encodeURIComponent(page.pageKey)}`}>{page.pageType}<small>{page.pageKey}</small></Link>)}</nav>
    <div className={styles.deviceBar}>{VIEWPORTS.map(item=><button key={item.key} type="button" data-active={viewport===item.key} onClick={()=>setViewport(item.key)}>{item.label}<small>{item.width}px</small></button>)}<span>{dirty?'Nem mentett módosítás':'Draft szinkronban'}</span></div>
    {error&&<div className="errorNotice" role="alert">{error}</div>}
    {notice&&<div className={styles.notice}>{notice}</div>}
    <div className={styles.workspace}>
      <aside className={styles.leftPanel}>
        <div className={styles.panelTitle}><strong>Oldalstruktúra</strong><span>Page → section → component</span></div>
        <Outline document={document} selectedId={selectedId} onSelect={setSelectedId} onMove={move}/>
        <div className={styles.addBox}>
          <strong>Hozzáadás</strong>
          {selected&&insertableSelected.length>0?<select defaultValue="" onChange={event=>{if(!event.target.value)return;const[key,version]=event.target.value.split('@');mutate({type:'add',parentId:selected.id,componentKey:key,componentVersion:Number(version)});event.currentTarget.value='';}}><option value="">A kijelölt elembe…</option>{insertableSelected.map(item=><option key={`${item.componentKey}@${item.componentVersion}`} value={`${item.componentKey}@${item.componentVersion}`}>{item.componentKey}</option>)}</select>:null}
          <select defaultValue="" onChange={event=>{if(!event.target.value)return;const[key,version]=event.target.value.split('@');mutate({type:'add',parentId:null,componentKey:key,componentVersion:Number(version)});event.currentTarget.value='';}}><option value="">Új section…</option>{insertableRoot.map(item=><option key={`${item.componentKey}@${item.componentVersion}`} value={`${item.componentKey}@${item.componentVersion}`}>{item.componentKey}</option>)}</select>
        </div>
      </aside>
      <main className={styles.canvasStage} onClick={()=>setSelectedId(null)}>
        <div className={styles.canvasChrome}><span>{viewport}</span><span>{viewportWidth}px · élő runtime</span></div>
        <div className={styles.canvasViewport} style={{width:`min(100%, ${viewportWidth}px)`}}><StorefrontRuntimeRenderer page={document} viewport={viewport} bindingContext={bindingContext} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry} capability={capability} decorateNode={canvasDecorator}/></div>
      </main>
      <aside className={styles.inspector}>
        {selected&&definition?<>
          <div className={styles.panelTitle}><strong>Inspector</strong><span>{selected.componentKey}</span></div>
          <div className={styles.nodeMeta}><code>{selected.id}</code><span>{definition.manifest.responsiveMode}</span><span>{definition.manifest.capability.minPlan}</span></div>
          <section><h3>Tulajdonságok</h3>{definition.manifest.configurable.map(key=><StructuredEditor key={key} label={key} value={selected.config[key]} onChange={value=>setConfig(key,value)}/>)}</section>
          <section><h3>{viewport} beállítások</h3><label className={styles.field}><span>Elrejtés ezen a breakpointon</span><input type="checkbox" checked={selected.responsive?.[viewport]?.hidden??false} onChange={event=>mutate({type:'responsive',nodeId:selected.id,viewport,hidden:event.target.checked})}/></label>{definition.manifest.responsiveMode!=='fixed'&&<label className={styles.field}><span>Grid span</span><select value={selected.responsive?.[viewport]?.gridSpan??''} onChange={event=>mutate({type:'responsive',nodeId:selected.id,viewport,gridSpan:event.target.value?Number(event.target.value):null})}><option value="">Örökölt / 12</option>{Array.from({length:12},(_,index)=>index+1).map(value=><option key={value} value={value}>{value} / 12</option>)}</select></label>}</section>
          <section className={styles.nodeActions}><button type="button" disabled={definition.protectedSystem} onClick={()=>mutate({type:'duplicate',nodeId:selected.id})}>Duplikálás</button><button type="button" disabled={definition.protectedSystem} onClick={()=>{mutate({type:'remove',nodeId:selected.id});setSelectedId(null);}}>Eltávolítás</button></section>
        </>:<div className={styles.inspectorEmpty}>Válassz ki egy sectiont vagy komponenst a vásznon vagy az oldalstruktúrában.</div>}
      </aside>
      <section className={styles.revisions}>
        <div className={styles.panelTitle}><strong>Revision history</strong><span>immutábilis előzmények</span></div>
        {revisions.filter(item=>item.kind==='published').map(item=><div key={item.revisionId}><span>r{item.revisionNumber}</span><time>{new Date(item.createdAt).toLocaleString('hu-HU')}</time><button type="button" disabled={busy||item.revisionNumber===publishedRevision} onClick={()=>rollback(item.revisionNumber)}>{item.revisionNumber===publishedRevision?'Aktuális':'Rollback'}</button></div>)}
      </section>
    </div>
  </div>;
}
