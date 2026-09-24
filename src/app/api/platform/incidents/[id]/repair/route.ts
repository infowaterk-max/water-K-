import{NextResponse}from'next/server';
import{z}from'zod';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{isSameOrigin}from'@/lib/incidents/contracts';
import{createPlatformRepairProposal,IncidentServiceError}from'@/lib/incidents/service';

const repairSchema=z.object({
  runbookKey:z.enum(['observability.recheck','storefront.cache.revalidate','code.repair.pr']),
}).strict();

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403,headers:{'Cache-Control':'no-store'}});
  const actor=await getPlatformRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs platform jogosultság.'},{status:403,headers:{'Cache-Control':'no-store'}});
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen incidensazonosító.'},{status:400,headers:{'Cache-Control':'no-store'}});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400,headers:{'Cache-Control':'no-store'}})}
  const parsed=repairSchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen javítási javaslat.'},{status:400,headers:{'Cache-Control':'no-store'}});
  try{
    const result=await createPlatformRepairProposal(id,parsed.data.runbookKey,actor.id);
    return NextResponse.json({
      ok:true,
      repairRequestId:result.repairRequestId,
      runbookKey:result.policy.key,
      risk:result.policy.risk,
      mode:result.policy.mode,
      autoApply:result.policy.autoApply,
    },{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof IncidentServiceError)return NextResponse.json({error:error.publicMessage},{status:error.status,headers:{'Cache-Control':'no-store'}});
    return NextResponse.json({error:'A javítási javaslat nem hozható létre.'},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
