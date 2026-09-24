import{NextResponse}from'next/server';
import{z}from'zod';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{isSameOrigin,manualIncidentTriageSchema}from'@/lib/incidents/contracts';
import{applyManualIncidentTriage,IncidentServiceError}from'@/lib/incidents/service';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const actor=await getPlatformRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs platform jogosultság.'},{status:403});
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen incidensazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=manualIncidentTriageSchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen incidensbesorolás.'},{status:400});
  try{
    const result=await applyManualIncidentTriage(id,parsed.data,actor.id);
    return NextResponse.json({ok:true,result},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof IncidentServiceError)return NextResponse.json({error:error.publicMessage},{status:error.status});
    return NextResponse.json({error:'Az incidens besorolása nem menthető.'},{status:500});
  }
}
