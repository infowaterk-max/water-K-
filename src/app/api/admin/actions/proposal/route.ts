import{NextRequest,NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';

type ProposalEvidence={id?:string;instance_id?:string;status?:string};
type ExecutionEvidence={id?:string;instance_id?:string;proposal_id?:string;status?:string};

export async function POST(req:NextRequest){
 const user=await getAdminRequestUser('store.manage');if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const store=await requireCurrentStoreContext('store.manage');
 if(!(await hasCurrentPlanFeature('executiveAnalytics')))return NextResponse.json({error:'Az Intézkedési központ a Pro csomag része.'},{status:403});
 let body:{proposalId?:string;action?:string;note?:string};try{body=await req.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const id=String(body.proposalId??''),action=String(body.action??'');
 if(!id||!['simulate','approve','reject','execute'].includes(action))return NextResponse.json({error:'Érvénytelen művelet.'},{status:400});
 const a=createAdminClient(),key=`${store.instanceId}:${action}:${id}:${Date.now()}:${user.id}`;
 let data:unknown=null,errorMessage:string|null=null;
 if(action==='simulate'){
  const result=await a.rpc('simulate_action_proposal_v2',{p_instance_id:store.instanceId,p_proposal_id:id,p_actor_id:user.id,p_event_key:key});
  data=result.data;errorMessage=result.error?.message??null;
 }else if(action==='execute'){
  const result=await a.rpc('execute_action_proposal_v2',{p_instance_id:store.instanceId,p_proposal_id:id,p_actor_id:user.id,p_execution_key:key});
  data=result.data;errorMessage=result.error?.message??null;
 }else{
  const result=await a.rpc('decide_action_proposal_v2',{p_instance_id:store.instanceId,p_proposal_id:id,p_actor_id:user.id,p_decision:action==='approve'?'approved':'rejected',p_note:body.note??null,p_event_key:key});
  data=result.data;errorMessage=result.error?.message??null;
 }
 if(errorMessage)return NextResponse.json({error:errorMessage},{status:400});

 if(action==='execute'){
  const execution=(data??{})as ExecutionEvidence;
  if(!execution.id||execution.proposal_id!==id||execution.instance_id!==store.instanceId||execution.status!=='succeeded'){
   return NextResponse.json({error:'Az intézkedés végrehajtásának eredménye nem igazolható.'},{status:500});
  }
  return NextResponse.json({ok:true,data:execution});
 }

 const proposal=(data??{})as ProposalEvidence;
 if(proposal.id!==id||proposal.instance_id!==store.instanceId){
  return NextResponse.json({error:'Az intézkedési javaslat műveletének eredménye nem igazolható.'},{status:500});
 }
 if(action==='simulate'&&proposal.status!=='simulated'){
  return NextResponse.json({error:'A szimuláció eredménye nem igazolható.'},{status:500});
 }
 if(action==='reject'&&proposal.status!=='rejected'){
  return NextResponse.json({error:'Az elutasítás eredménye nem igazolható.'},{status:500});
 }
 if(action==='approve'&&!['simulated','approved'].includes(String(proposal.status??''))){
  return NextResponse.json({error:'A jóváhagyás eredménye nem igazolható.'},{status:500});
 }
 return NextResponse.json({ok:true,data:proposal});
}
