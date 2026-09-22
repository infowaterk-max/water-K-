import{formatHuf}from'@/lib/catalog';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{ReturnCaseActions}from'@/components/admin/return-case-actions';

export const dynamic='force-dynamic';

const labels:Record<string,string>={requested:'Beérkezett',approved:'Jóváhagyva',rejected:'Elutasítva',received:'Visszaérkezett',refund_pending:'Visszatérítés folyamatban',refunded:'Visszatérítve',closed:'Lezárva'};
const reasonLabels:Record<string,string>={withdrawal:'Elállás',elallas:'Elállás',damaged:'Sérült termék',serult:'Sérült termék',defective:'Hibás termék',hibas:'Hibás termék',wrong_item:'Téves termék',teves_termek:'Nem a megfelelő termék érkezett',not_as_described:'Nem a leírásnak megfelelő',other:'Egyéb',egyeb:'Egyéb'};
const statusWeight:Record<string,number>={requested:0,approved:1,received:2,refund_pending:3,rejected:5,refunded:6,closed:7};

export default async function ReturnsAdmin(){
 const scope=await requireCurrentStoreContext('orders.manage');
 const a=createAdminClient();
 const{data,error}=await a.from('return_cases').select('id,order_id,customer_email,reason,customer_note,status,refund_amount_gross_huf,refund_reference,admin_note,requested_at,updated_at,inventory_restocked_at').eq('instance_id',scope.instanceId).order('requested_at',{ascending:false}).limit(500);
 const rows=(data??[]).sort((x:any,y:any)=>(statusWeight[x.status]??4)-(statusWeight[y.status]??4)||+new Date(y.updated_at)-+new Date(x.updated_at));
 const orderIds=[...new Set(rows.map((row:any)=>row.order_id).filter(Boolean))] as string[];
 const caseIds=rows.map((row:any)=>row.id) as string[];
 const[{data:orders,error:orderError},{data:caseItems,error:itemError}]=await Promise.all([
  orderIds.length?a.from('orders').select('id,order_number,total_gross_huf,status').eq('instance_id',scope.instanceId).in('id',orderIds):Promise.resolve({data:[],error:null}),
  caseIds.length?a.from('return_case_items').select('id,return_case_id,order_item_id,quantity').eq('instance_id',scope.instanceId).in('return_case_id',caseIds).limit(5000):Promise.resolve({data:[],error:null})
 ]);
 const orderItemIds=[...new Set((caseItems??[]).map((item:any)=>item.order_item_id).filter(Boolean))] as string[];
 const{data:orderItems,error:orderItemError}=orderItemIds.length?await a.from('order_items').select('id,product_name,variant_label,quantity,unit_gross_huf').eq('instance_id',scope.instanceId).in('id',orderItemIds):{data:[],error:null};
 const orderMap=new Map((orders??[]).map((order:any)=>[order.id,order]));
 const orderItemMap=new Map((orderItems??[]).map((item:any)=>[item.id,item]));
 const itemMap=new Map<string,any[]>();
 for(const item of caseItems??[]){const list=itemMap.get(item.return_case_id)??[];list.push(item);itemMap.set(item.return_case_id,list)}
 const open=rows.filter((x:any)=>!['rejected','refunded','closed'].includes(x.status));
 const requested=rows.filter((x:any)=>x.status==='requested').length;
 const pendingRefund=rows.filter((x:any)=>['approved','received','refund_pending'].includes(x.status)).reduce((sum:number,x:any)=>sum+Number(x.refund_amount_gross_huf||0),0);
 const refunded30=rows.filter((x:any)=>x.status==='refunded'&&+new Date(x.updated_at)>=Date.now()-30*86400000).reduce((sum:number,x:any)=>sum+Number(x.refund_amount_gross_huf||0),0);
 const restocked=rows.filter((x:any)=>x.inventory_restocked_at).length;
 const loadError=Boolean(error||orderError||itemError||orderItemError);
 return <section className="adminMain"><span className="eyebrow">Admin · Visszáru</span><h1 className="sectionTitle">Visszaküldés és visszatérítés</h1><p className="lead">Elállási, sérülési és visszatérítési ügyek tétel- és mennyiségszintű, ellenőrzött operatív folyamata. A banki pénzmozgás nem automatikus.</p>{loadError&&<div className="errorNotice"><strong>Az ügyek vagy visszaküldött tételek egy része most nem tölthető be.</strong></div>}<div className="cards adminMetricCards"><div className="card"><span className="badge">Új ügy</span><div className="price">{error?'—':requested}</div></div><div className="card"><span className="badge">Nyitott ügy</span><div className="price">{error?'—':open.length}</div></div><div className="card"><span className="badge">Tervezett visszatérítés</span><div className="price">{error?'—':formatHuf(pendingRefund)}</div></div><div className="card"><span className="badge">30 napban visszatérítve</span><div className="price">{error?'—':formatHuf(refunded30)}</div></div><div className="card"><span className="badge">Visszakészletezett ügy</span><div className="price">{error?'—':restocked}</div></div></div><section className="card"><span className="eyebrow">Ügykezelés</span><h2>Aktuális visszáru esetek</h2><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Rendelés / ügyfél</th><th>Visszaküldött tételek</th><th>Ok és leírás</th><th>Állapot</th><th>Rendelési érték</th><th>Visszatérítés</th><th>Művelet</th></tr></thead><tbody>{rows.map((r:any)=>{const order=orderMap.get(r.order_id) as any,lines=itemMap.get(r.id)??[];return <tr key={r.id}><td><strong>{order?.order_number??'—'}</strong><br/><span className="muted">{r.customer_email}</span></td><td>{lines.length?lines.map((line:any)=>{const oi=orderItemMap.get(line.order_item_id) as any;return <div key={line.order_item_id}><strong>{line.quantity}× {oi?.product_name??'Termék'}</strong><br/><span className="muted">{oi?.variant_label??''} · eredetileg {oi?.quantity??'—'} db</span></div>}):<span className="muted">Régi ügy · nincs tételszintű adat</span>}</td><td><strong>{reasonLabels[r.reason]??r.reason.replaceAll('_',' ')}</strong><br/><span className="muted">{r.customer_note||'Nincs megjegyzés.'}</span></td><td><span className="badge">{labels[r.status]??r.status}</span><br/><span className="muted">{r.inventory_restocked_at?'Készlet visszaállítva':new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(r.requested_at))}</span></td><td>{formatHuf(Number(order?.total_gross_huf||0))}</td><td>{r.refund_amount_gross_huf==null?'—':formatHuf(r.refund_amount_gross_huf)}</td><td>{!loadError?<ReturnCaseActions id={r.id} status={r.status} refundAmount={r.refund_amount_gross_huf} refundReference={r.refund_reference} inventoryRestockedAt={r.inventory_restocked_at}/>:<span className="muted">Adatbetöltés szükséges</span>}</td></tr>})}</tbody></table></div>{!error&&rows.length===0&&<p className="muted">Még nincs visszáru ügy.</p>}</section><p className="muted">A készletre visszahelyezés külön admin döntés: csak fizikailag visszaérkezett és újraértékesíthető terméknél használd. A rendszer ugyanazt az ügyet csak egyszer engedi visszakészletezni. Teljes rendelési visszatérítés esetén a rendelés állapota automatikusan „refunded” lesz.</p></section>;
}