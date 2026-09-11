'use client';

import Link from 'next/link';
import {useMemo,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {installVisualBuilderTemplateAction} from '@/app/admin/tartalom/builder/actions';
import {hasStorefrontRuntimeCapability,type StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {FeatureCode} from '@/lib/plans/catalog';
import type {StorefrontTemplateLibraryEntry} from '@/lib/builder/storefront-template-library';
import builderStyles from './storefront-visual-builder.module.css';
import styles from './storefront-template-library.module.css';

type Props={templates:readonly StorefrontTemplateLibraryEntry[];capability:StorefrontRuntimeCapabilityContext};

const operationKey=()=>`builder:template:${crypto.randomUUID()}`;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU');

export function StorefrontTemplateLibrary({templates,capability}:Props){
  const router=useRouter();
  const[busy,startTransition]=useTransition();
  const[query,setQuery]=useState('');
  const[category,setCategory]=useState('all');
  const[notice,setNotice]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);

  const categories=useMemo(()=>{
    const counts=new Map<string,{label:string;count:number}>();
    for(const template of templates){
      const current=counts.get(template.category);
      counts.set(template.category,{label:template.categoryLabel,count:(current?.count??0)+1});
    }
    return [...counts.entries()].sort((a,b)=>a[1].label.localeCompare(b[1].label,'hu'));
  },[templates]);

  const filtered=useMemo(()=>{
    const needle=normalize(query.trim());
    return templates.filter(template=>{
      if(category!=='all'&&template.category!==category)return false;
      if(!needle)return true;
      const searchable=[
        template.displayName,template.categoryLabel,template.description,template.audience,
        ...template.highlights,template.proComparison.summary,...template.proComparison.highlights,...template.proComparison.optionalAddOns,
      ].map(normalize).join(' ');
      return searchable.includes(needle);
    });
  },[templates,category,query]);

  const entitled=(template:StorefrontTemplateLibraryEntry)=>hasStorefrontRuntimeCapability({
    minPlan:template.minPlan,
    features:template.requiredFeatures as readonly FeatureCode[],
  },capability);

  const install=(template:StorefrontTemplateLibraryEntry)=>startTransition(()=>{
    setError(null);setNotice(null);
    installVisualBuilderTemplateAction({templateKey:template.templateKey,templateVersion:template.templateVersion,operationKey:operationKey()})
      .then(result=>{
        setNotice(`${template.displayName} draftként telepítve · ${result.pageCount} oldal`);
        router.refresh();
      })
      .catch(reason=>setError(reason instanceof Error?reason.message:'A sablon telepítése sikertelen.'));
  });

  return <div className={builderStyles.builderShell}>
    <header className={builderStyles.topbar}>
      <div className={builderStyles.builderBrand}><span className={builderStyles.builderMark}>S</span><span><strong>Shoperation</strong><small>Webshop szerkesztő</small></span></div>
      <Link className={builderStyles.backButton} href="/admin">← Vissza az Admin felületre</Link>
      <div className={styles.topbarNote}>Válassz kiinduló sablont · a telepítés csak draftot hoz létre</div>
    </header>

    <main className={styles.library}>
      <section className={styles.hero}>
        <div><span className={styles.kicker}>SABLONKÖNYVTÁR</span><h1>Találd meg a webshopodhoz illő sablont</h1><p>A sablonok ugyanarra a Shoperation storefront motorra épülnek. Nézd meg élőben, olvasd el kinek ajánljuk, és csak utána telepítsd draftként.</p></div>
        <label className={styles.search}><span>Keresés a sablonok között</span><div><span aria-hidden="true">⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Pl. ékszer, streetwear, gaming, B2B…"/></div></label>
      </section>

      <div className={styles.layout}>
        <aside className={styles.filters} aria-label="Sablon kategóriák">
          <div className={styles.filterHeading}><strong>Kategóriák</strong><span>{templates.length} sablon</span></div>
          <button type="button" data-active={category==='all'} onClick={()=>setCategory('all')}><span>Összes sablon</span><b>{templates.length}</b></button>
          {categories.map(([key,item])=><button key={key} type="button" data-active={category===key} onClick={()=>setCategory(key)}><span>{item.label}</span><b>{item.count}</b></button>)}
          <div className={styles.planExplainer}>
            <span className={styles.proBadge}>PRO</span>
            <strong>A Pro nem „szebb skin”</strong>
            <p>Az Alap és a Pro sablonok egyformán professzionálisak. A Pro különbsége a több funkció: fejlettebb merchandising, személyre szabás, automatizálás és kategóriaspecifikus extra képességek.</p>
          </div>
        </aside>

        <section className={styles.results} aria-live="polite">
          <div className={styles.resultHeading}><div><strong>{category==='all'?'Összes sablon':categories.find(([key])=>key===category)?.[1].label}</strong><span>{filtered.length} találat</span></div>{query&&<button type="button" onClick={()=>setQuery('')}>Keresés törlése</button>}</div>
          {filtered.length===0?<div className={styles.emptyResult}><strong>Nincs ilyen sablon.</strong><p>Próbálj más keresést vagy válassz másik kategóriát.</p></div>:<div className={styles.grid}>{filtered.map(template=>{
            const canUse=entitled(template);
            const previewHref=`/storefront-template-preview?template=${encodeURIComponent(template.templateKey)}&version=${template.templateVersion}`;
            return <article className={styles.card} key={`${template.templateKey}@${template.templateVersion}`}>
              <div className={styles.previewFrame}>
                <iframe title={`${template.displayName} mini előnézet`} src={`${previewHref}&embed=1`} loading="lazy" tabIndex={-1}/>
                <Link className={styles.previewOverlay} href={previewHref} target="_blank" rel="noreferrer"><span>Élő előnézet</span></Link>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}><span>{template.categoryLabel}</span><b data-plan={template.minPlan}>{template.minPlan==='pro'?'Pro sablon':'Alap sablon'}</b></div>
                <h2>{template.displayName}</h2>
                <p className={styles.description}>{template.description}</p>
                <p className={styles.audience}><strong>Kinek ajánljuk?</strong> {template.audience}</p>
                <div className={styles.highlights}>{template.highlights.slice(0,4).map(item=><span key={item}>{item}</span>)}</div>
                <details className={styles.proComparison}>
                  <summary><span><b>{template.proComparison.status==='available'?'Pro többlet':'Tervezett Pro többlet'}</b><small>{template.proComparison.summary}</small></span><span aria-hidden="true">＋</span></summary>
                  <div>
                    <ul>{template.proComparison.highlights.map(item=><li key={item}>{item}</li>)}</ul>
                    {template.proComparison.optionalAddOns.length>0&&<p><strong>Külön prémium add-on:</strong> {template.proComparison.optionalAddOns.join(' · ')}</p>}
                    {template.proComparison.status==='planned'&&<p className={styles.proStatus}>A konkrét Pro sablonvariáns még nincs publikálva a katalógusban; ezek az elfogadott funkcionális irányok, nem jelenlegi Alap-funkciók.</p>}
                  </div>
                </details>
                <div className={styles.actions}>
                  <Link className={styles.secondaryButton} href={previewHref} target="_blank" rel="noreferrer">Élő előnézet</Link>
                  <button type="button" className={styles.primaryButton} disabled={busy||!canUse} onClick={()=>install(template)}>{canUse?'Sablon használata':'Csomag vagy jogosultság szükséges'}</button>
                </div>
              </div>
            </article>;
          })}</div>}
        </section>
      </div>
      {notice&&<div className={styles.notice} role="status">{notice}</div>}
      {error&&<div className={styles.error} role="alert">{error}</div>}
    </main>
  </div>;
}
