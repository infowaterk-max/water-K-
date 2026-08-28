import { createAdminClient } from '@/lib/supabase/admin';

type Readiness={environment_key:string;display_name:string;source_sha:string|null;trusted_passes:number;trusted_failures:number;smoke_pass:boolean;security_pass:boolean;migration_pass:boolean;evidence_bundle_hash:string};
type Decision={id:string;environment_key:string;source_sha:string;decision:string;note:string;created_at:string;evidence_bundle_hash:string};

export default async function RolloutPage(){
 const db=createAdminClient();
 const [{data:readiness},{data:decisions}]=await Promise.all([
  db.from('rollout_readiness').select('*').order('environment_key'),
  db.from('rollout_decisions').select('id,environment_key,source_sha,decision,note,created_at,evidence_bundle_hash').order('created_at',{ascending:false}).limit(20)
 ]);
 const rows=(readiness??[]) as Readiness[];const history=(decisions??[]) as Decision[];
 return <section className="adminContent"><div className="adminHeader"><div><span className="eyebrow">V24 · Rollout readiness</span><h1>Rollout központ</h1><p>Preview, staging és production GO/NO-GO bizonyítékok. Ez a felület nem indít automatikus deployt.</p></div></div>
 <div className="metricGrid">{rows.map(r=><article className="metricCard" key={`${r.environment_key}:${r.source_sha??'none'}`}><span>{r.display_name}</span><strong>{r.trusted_failures>0?'NO-GO':r.smoke_pass&&(r.environment_key==='preview'||r.migration_pass)?'READY':'PENDING'}</strong><small>{r.source_sha?.slice(0,12)??'nincs SHA'} · {r.trusted_passes} trusted pass</small></article>)}</div>
 <div className="panel"><h2>Környezeti kapuk</h2><div className="tableWrap"><table><thead><tr><th>Környezet</th><th>SHA</th><th>Smoke</th><th>Migration</th><th>Security</th><th>Hibák</th><th>Evidence bundle</th></tr></thead><tbody>{rows.map(r=><tr key={`${r.environment_key}:${r.source_sha??'none'}:table`}><td>{r.display_name}</td><td><code>{r.source_sha?.slice(0,12)??'—'}</code></td><td>{r.smoke_pass?'OK':'—'}</td><td>{r.migration_pass?'OK':'—'}</td><td>{r.security_pass?'OK':'—'}</td><td>{r.trusted_failures}</td><td><code>{r.evidence_bundle_hash?.slice(0,14)}</code></td></tr>)}</tbody></table></div></div>
 <div className="panel"><h2>GO / NO-GO döntési napló</h2>{history.length===0?<p>Még nincs rollout döntés.</p>:<div className="tableWrap"><table><thead><tr><th>Környezet</th><th>Döntés</th><th>SHA</th><th>Indoklás</th><th>Idő</th></tr></thead><tbody>{history.map(d=><tr key={d.id}><td>{d.environment_key}</td><td><strong>{d.decision.toUpperCase()}</strong></td><td><code>{d.source_sha.slice(0,12)}</code></td><td>{d.note}</td><td>{new Date(d.created_at).toLocaleString('hu-HU')}</td></tr>)}</tbody></table></div>}</div>
 </section>;
}
