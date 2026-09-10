import{NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';

type Option={value:string;label:string};
const shortId=(id:string)=>`${id.slice(0,8)}…`;

export async function GET(){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)return NextResponse.json({options:[]},{status:403,headers:{'Cache-Control':'no-store'}});
  if(!(await hasCurrentPlanFeature('officeCommunicationAdvanced')))return NextResponse.json({options:[]},{headers:{'Cache-Control':'no-store'}});
  let scope;try{scope=await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({options:[]},{status:403,headers:{'Cache-Control':'no-store'}})}
  const db=createAdminClient();
  const[orders,offers,returns,tickets,tasks]=await Promise.all([
    db.from('orders').select('id,order_number,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(150),
    db.from('commercial_offers').select('id,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100),
    db.from('return_cases').select('id,order_id,status').eq('instance_id',scope.instanceId).order('requested_at',{ascending:false}).limit(100),
    db.from('support_tickets').select('id,ticket_number,subject,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100),
    db.from('office_tasks').select('id,title,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100),
  ]);
  if(orders.error||offers.error||returns.error||tickets.error||tasks.error)return NextResponse.json({error:'Az üzleti objektumok nem tölthetők be.'},{status:500});
  const orderRows=(orders.data??[])as{id:string;order_number:string;status:string}[];
  const options:Option[]=[
    ...orderRows.map(o=>({value:`order:${o.id}`,label:`Rendelés · ${o.order_number} · ${o.status}`})),
    ...((offers.data??[])as{id:string;status:string}[]).map(o=>({value:`commercial_offer:${o.id}`,label:`Árajánlat · ${shortId(o.id)} · ${o.status}`})),
    ...((returns.data??[])as{id:string;order_id:string;status:string}[]).map(r=>({value:`return_case:${r.id}`,label:`Visszáru · ${orderRows.find(o=>o.id===r.order_id)?.order_number??shortId(r.id)} · ${r.status}`})),
    ...((tickets.data??[])as{id:string;ticket_number:string;subject:string;status:string}[]).map(t=>({value:`support_ticket:${t.id}`,label:`Ügyfélszolgálat · ${t.ticket_number} · ${t.subject}`})),
    ...((tasks.data??[])as{id:string;title:string;status:string}[]).map(t=>({value:`task:${t.id}`,label:`Feladat · ${t.title} · ${t.status}`})),
  ];
  return NextResponse.json({options},{headers:{'Cache-Control':'no-store'}});
}
