import{NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';

type Delegation={id:string;source_user_id:string;scope_type:'all'|'topic'|'mailbox';scope_value:string|null};
type Permission={delegation_id:string;permission_code:string};
type Profile={id:string;email:string|null;full_name:string|null};
type Thread={mailbox_key:string|null;topic_code:string|null};

export async function GET(request:Request){
 const actor=await getAdminRequestUser('support.manage');if(!actor)return NextResponse.json({options:[]},{status:403,headers:{'Cache-Control':'no-store'}});
 if(!(await hasCurrentPlanFeature('officeCommunicationAdvanced')))return NextResponse.json({options:[]},{headers:{'Cache-Control':'no-store'}});
 let scope;try{scope=await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({options:[]},{status:403,headers:{'Cache-Control':'no-store'}})}
 const url=new URL(request.url),permission=url.searchParams.get('permission');const threadId=url.searchParams.get('threadId');if(!permission||!['office.thread.reply','office.email.compose'].includes(permission))return NextResponse.json({error:'Érvénytelen delegációs jogosultság.'},{status:400});
 const db=createAdminClient(),now=new Date().toISOString();const{data,error}=await db.from('store_delegations').select('id,source_user_id,scope_type,scope_value').eq('instance_id',scope.instanceId).eq('delegate_user_id',actor.id).is('revoked_at',null).lte('valid_from',now).gt('valid_until',now);if(error)return NextResponse.json({error:'A delegációk nem ellenőrizhetők.'},{status:500});
 let delegations=(data??[])as Delegation[];if(!delegations.length)return NextResponse.json({options:[]},{headers:{'Cache-Control':'no-store'}});
 const{data:permissionData,error:permissionError}=await db.from('store_delegation_permissions').select('delegation_id,permission_code').in('delegation_id',delegations.map(item=>item.id)).eq('permission_code',permission);if(permissionError)return NextResponse.json({error:'A delegációs jogosultságok nem ellenőrizhetők.'},{status:500});const allowedIds=new Set(((permissionData??[])as Permission[]).map(item=>item.delegation_id));delegations=delegations.filter(item=>allowedIds.has(item.id));
 let thread:Thread|null=null;if(threadId){const{data:threadData,error:threadError}=await db.from('office_threads').select('mailbox_key,topic_code').eq('instance_id',scope.instanceId).eq('id',threadId).eq('conversation_type','customer').maybeSingle();if(threadError)return NextResponse.json({error:'A beszélgetés delegációs scope-ja nem ellenőrizhető.'},{status:500});thread=(threadData??null)as Thread|null;if(!thread)return NextResponse.json({options:[]},{status:404});delegations=delegations.filter(item=>item.scope_type==='all'||item.scope_type==='mailbox'&&item.scope_value===thread?.mailbox_key||item.scope_type==='topic'&&item.scope_value===thread?.topic_code)}
 const sourceIds=[...new Set(delegations.map(item=>item.source_user_id))];const{data:profileData,error:profileError}=sourceIds.length?await db.from('profiles').select('id,email,full_name').in('id',sourceIds):{data:[]as Profile[],error:null};if(profileError)return NextResponse.json({error:'A delegált feladók nem tölthetők be.'},{status:500});const profiles=new Map(((profileData??[])as Profile[]).map(item=>[item.id,item]));const options=delegations.map(item=>({delegationId:item.id,userId:item.source_user_id,label:profiles.get(item.source_user_id)?.full_name||profiles.get(item.source_user_id)?.email||`${item.source_user_id.slice(0,8)}…`,scopeType:item.scope_type,scopeValue:item.scope_value}));
 return NextResponse.json({options},{headers:{'Cache-Control':'no-store'}});
}
