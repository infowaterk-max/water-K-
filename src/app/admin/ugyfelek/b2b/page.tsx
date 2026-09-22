import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStorePageContext } from '@/lib/instances/scope';
import { B2BAccountStatusControl } from '@/components/admin/b2b-account-status-control';
import { B2BIdentityReviewControl } from '@/components/admin/b2b-identity-review-control';

type Account={id:string;name:string;tax_number:string|null;status:'pending'|'approved'|'suspended';created_at:string};
type Member={account_id:string;user_id:string;role:'owner'|'admin'|'buyer'};
type Profile={id:string;full_name:string|null;email:string|null};
type IdentityRequest={id:string;account_id:string;current_name:string;current_tax_number:string|null;requested_name:string;requested_tax_number:string;created_at:string};

export const dynamic='force-dynamic';

export default async function B2BAccountsAdminPage(){
  const scope=await requireCurrentStorePageContext('sales.manage'),admin=createAdminClient();
  const[{data:accounts,error:accountError},{data:members,error:memberError},{data:identityRequests,error:identityError}]=await Promise.all([
    admin.from('b2b_accounts').select('id,name,tax_number,status,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}),
    admin.from('b2b_account_members').select('account_id,user_id,role').eq('instance_id',scope.instanceId),
    admin.from('b2b_account_identity_change_requests').select('id,account_id,current_name,current_tax_number,requested_name,requested_tax_number,created_at').eq('instance_id',scope.instanceId).eq('status','pending').order('created_at',{ascending:true}),
  ]);
  const accountRows=(accounts??[])as Account[],memberRows=(members??[])as Member[],ids=[...new Set(memberRows.map(m=>m.user_id))];
  const profileResult=ids.length?await admin.from('profiles').select('id,full_name,email').in('id',ids):{data:[] as Profile[],error:null};
  const profiles=(profileResult.data??[])as Profile[],byUser=new Map(profiles.map(p=>[p.id,p]));
  const membersByAccount=new Map<string,Member[]>();
  for(const member of memberRows)membersByAccount.set(member.account_id,[...(membersByAccount.get(member.account_id)??[]),member]);
  const requestRows=(identityRequests??[])as IdentityRequest[];
  const loadError=Boolean(accountError||memberError||identityError||profileResult.error);

  return <section className="adminMain">
    <div className="sectionIntro"><div><span className="eyebrow">Admin · B2B</span><h1 className="sectionTitle">B2B szervezetek</h1><p className="lead">A partnerjóváhagyás szervezeti szinten történik. A tagok ebből öröklik a B2B ár- és katalógusjogosultságot.</p></div><Link className="btn btnGhost" href="/admin/ugyfelek">Vissza az ügyfelekhez</Link></div>
    {loadError&&<div className="errorNotice" role="alert">A B2B szervezeti lista nem teljes; hiányos adatok mellett státuszt ne módosíts.</div>}
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Szervezet</span><div className="price">{loadError?'—':accountRows.length}</div></div><div className="card"><span className="badge">Jóváhagyásra vár</span><div className="price">{loadError?'—':accountRows.filter(a=>a.status==='pending').length}</div></div><div className="card"><span className="badge">Aktív B2B</span><div className="price">{loadError?'—':accountRows.filter(a=>a.status==='approved').length}</div></div></div>
    <div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Szervezet</th><th>Tulajdonos</th><th>Tagok</th><th>Állapot</th><th>Kezelés</th></tr></thead><tbody>{!loadError&&accountRows.map(account=>{const accountMembers=membersByAccount.get(account.id)??[],owner=accountMembers.find(m=>m.role==='owner'),profile=owner?byUser.get(owner.user_id):null;return <tr key={account.id}><td><strong>{account.name}</strong><br/><span className="muted">{account.tax_number||'Adószám nincs rögzítve'}</span></td><td>{profile?.full_name||profile?.email||'—'}</td><td>{accountMembers.length}</td><td><span className="badge">{account.status==='approved'?'Jóváhagyott':account.status==='suspended'?'Felfüggesztett':'Várakozik'}</span></td><td><B2BAccountStatusControl id={account.id} status={account.status}/></td></tr>})}</tbody></table></div>
    {!loadError&&!accountRows.length&&<div className="card"><h2>Még nincs B2B szervezet.</h2><p className="muted">Az első partnerfiók-igénylés után itt jelenik meg.</p></div>}
    <div className="sectionIntro" style={{marginTop:32}}><div><span className="eyebrow">Újraellenőrzés</span><h2>Jóváhagyásra váró cégadat-módosítások</h2><p className="lead">A jóváhagyott cégnév és adószám közvetlenül nem módosítható; minden változás before/after audittal kerül ide.</p></div></div>
    <div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Jelenlegi</th><th>Kért módosítás</th><th>Beküldve</th><th>Döntés</th></tr></thead><tbody>{!loadError&&requestRows.map(item=><tr key={item.id}><td><strong>{item.current_name}</strong><br/><span className="muted">{item.current_tax_number??'—'}</span></td><td><strong>{item.requested_name}</strong><br/><span>{item.requested_tax_number}</span></td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.created_at))}</td><td><B2BIdentityReviewControl id={item.id}/></td></tr>)}</tbody></table></div>
    {!loadError&&!requestRows.length&&<div className="card"><p className="muted">Nincs jóváhagyásra váró cégadat-módosítás.</p></div>}
  </section>;
}
