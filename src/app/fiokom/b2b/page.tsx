import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { resolveB2BAccountContext } from '@/lib/commerce/b2b-account';
import { B2B_ACCOUNT_BUILDER_MANIFEST } from '@/lib/commerce/b2b-account-builder';
import { B2BAccountPanel,B2BInviteAccept } from '@/components/account/b2b-account-panel';
import { ResellerRequestButton } from '@/components/account/reseller-request-button';
import { formatHuf } from '@/lib/catalog';
import { orderStatusLabel } from '@/lib/order-display';

type MemberRow={user_id:string;role:'owner'|'admin'|'buyer'};
type ProfileRow={id:string;email:string|null;full_name:string|null};
type InviteRow={id:string;email:string;role:'admin'|'buyer';expires_at:string};
type OrderRow={id:string;order_number:string;status:string;total_gross_huf:number;created_at:string};

export const dynamic='force-dynamic';

export default async function B2BAccountPage({searchParams}:{searchParams:Promise<{invite?:string}>}){
  void B2B_ACCOUNT_BUILDER_MANIFEST;
  const params=await searchParams;
  const instance=await getCurrentWebshopInstance();
  if(!instance)redirect('/fiokom');
  const session=await createClient(),{data:{user}}=await session.auth.getUser();
  if(!user)redirect('/fiokom');

  const context=await resolveB2BAccountContext(instance.id,user.id);
  if(!context){
    return <main className="section"><div className="shell">
      <div className="sectionIntro"><div><span className="eyebrow">B2B partnerfiók</span><h1 className="sectionTitle">Szervezeti vásárlói fiók</h1><p className="lead">Egy céghez több felhasználó kapcsolódhat, külön tulajdonos, admin és vásárlói szerepkörrel.</p></div><Link className="btn btnGhost" href="/fiokom">Vissza a fiókhoz</Link></div>
      {params.invite?<B2BInviteAccept token={params.invite}/>:<section className="featurePanel"><h2>Még nincs B2B szervezeti tagságod.</h2><p className="muted">Új partnerfiók igényléséhez töltsd ki a profilodban a cégnév és adószám mezőt. Meglévő szervezethez a tulajdonos vagy admin meghívója szükséges.</p><ResellerRequestButton/></section>}
    </div></main>;
  }

  const admin=createAdminClient();
  const[{data:members,error:memberError},{data:invites,error:inviteError},{data:orders,error:orderError}]=await Promise.all([
    admin.from('b2b_account_members').select('user_id,role').eq('instance_id',instance.id).eq('account_id',context.accountId).order('joined_at'),
    admin.from('b2b_account_invitations').select('id,email,role,expires_at').eq('instance_id',instance.id).eq('account_id',context.accountId).is('accepted_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
    admin.from('orders').select('id,order_number,status,total_gross_huf,created_at').eq('instance_id',instance.id).eq('b2b_account_id',context.accountId).order('created_at',{ascending:false}).limit(100),
  ]);
  const memberRows=(members??[]) as MemberRow[],ids=memberRows.map(m=>m.user_id);
  const profileResult=ids.length?await admin.from('profiles').select('id,email,full_name').in('id',ids):{data:[] as ProfileRow[],error:null};
  const profiles=(profileResult.data??[]) as ProfileRow[],byId=new Map(profiles.map(p=>[p.id,p]));
  const loadError=Boolean(memberError||inviteError||orderError||profileResult.error);
  const memberView=memberRows.map(m=>({userId:m.user_id,name:byId.get(m.user_id)?.full_name||byId.get(m.user_id)?.email||'Felhasználó',email:byId.get(m.user_id)?.email||'—',role:m.role}));
  const inviteView=((invites??[])as InviteRow[]).map(i=>({id:i.id,email:i.email,role:i.role,expiresAt:i.expires_at}));
  const orderRows=(orders??[]) as OrderRow[];

  const statusLabel=context.status==='approved'?'Jóváhagyott':context.status==='suspended'?'Felfüggesztett':'Jóváhagyás alatt';
  return <main className="section"><div className="shell">
    <div className="sectionIntro"><div><span className="eyebrow">B2B partnerfiók</span><h1 className="sectionTitle">{context.accountName}</h1><p className="lead">{statusLabel} · {context.memberRole==='owner'?'Tulajdonos':context.memberRole==='admin'?'Admin':'Vásárló'}{context.taxNumber?` · ${context.taxNumber}`:''}</p></div><Link className="btn btnGhost" href="/fiokom">Vissza a fiókhoz</Link></div>
    {loadError&&<div className="errorNotice" role="alert">A B2B szervezeti adatok egy része most nem tölthető be, ezért módosítás előtt frissítsd az oldalt.</div>}
    {!loadError&&<B2BAccountPanel accountId={context.accountId} currentUserId={user.id} currentRole={context.memberRole} members={memberView} invitations={inviteView}/>}
    <section className="tableCard" style={{marginTop:28}}><div style={{padding:'20px 20px 0'}}><span className="eyebrow">Szervezeti rendelések</span><h2>A céghez tartozó rendelési előzmények</h2></div><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Rendelés</th><th>Állapot</th><th>Összeg</th><th>Dátum</th></tr></thead><tbody>{!orderError&&orderRows.map(order=><tr key={order.id}><td><Link className="textLink" href={`/fiokom/b2b/rendeles/${order.id}`}><strong>{order.order_number}</strong></Link></td><td><span className="badge">{orderStatusLabel(order.status)}</span></td><td>{formatHuf(order.total_gross_huf)}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(order.created_at))}</td></tr>)}</tbody></table></div>{!orderError&&!orderRows.length&&<div className="accountEmptyState"><p className="muted">Még nincs szervezeti rendelés.</p></div>}</section>
  </div></main>;
}
