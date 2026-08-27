import { createClient } from '@/lib/supabase/server';
import { CustomerRoleControl } from '@/components/admin/customer-role-control';

type ProfileRow = { id:string; email:string|null; full_name:string|null; company_name:string|null; tax_number:string|null; role:string; reseller_approved:boolean; created_at:string };

export default async function AdminCustomersPage() {
  let customers: ProfileRow[]=[];
  try { const supabase=await createClient(); const result=await supabase.from('profiles').select('id,email,full_name,company_name,tax_number,role,reseller_approved,created_at').order('created_at',{ascending:false}).limit(200); if(!result.error&&result.data) customers=result.data as ProfileRow[]; } catch {}
  const pending=customers.filter(c=>c.role==='reseller'&&!c.reseller_approved).length;
  return <section className="adminMain"><span className="eyebrow">Admin · Ügyfelek</span><h1 className="sectionTitle">Ügyfelek és viszonteladók</h1>
    <div className="cards"><div className="card"><strong>{customers.length}</strong><p className="muted">regisztrált profil</p></div><div className="card"><strong>{pending}</strong><p className="muted">jóváhagyásra váró viszonteladó</p></div></div>
    <div className="tableCard"><table className="adminTable"><thead><tr><th>Ügyfél</th><th>Cég</th><th>Szerepkör</th><th>Partnerkezelés</th><th>Regisztráció</th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td><strong>{c.full_name||'Nincs név'}</strong><br/><span className="muted">{c.email||'—'}</span></td><td>{c.company_name||'—'}{c.tax_number&&<><br/><span className="muted">{c.tax_number}</span></>}</td><td><span className="badge">{c.role==='admin'?'Admin':c.role==='reseller'?(c.reseller_approved?'Viszonteladó':'Jóváhagyásra vár'):'Vásárló'}</span></td><td><CustomerRoleControl id={c.id} role={c.role} approved={c.reseller_approved}/></td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(c.created_at))}</td></tr>)}</tbody></table>{customers.length===0&&<p className="muted" style={{padding:20}}>Még nincs megjeleníthető ügyfél.</p>}</div>
  </section>;
}
