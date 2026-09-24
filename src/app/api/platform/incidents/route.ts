import{NextResponse}from'next/server';
import{z}from'zod';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{listPlatformIncidentQueue,IncidentServiceError}from'@/lib/incidents/service';

const querySchema=z.object({
  limit:z.coerce.number().int().min(1).max(200).optional().default(100),
  ownership:z.enum(['undetermined','merchant','platform','shared']).optional(),
  severity:z.enum(['low','normal','high','critical']).optional(),
});

export async function GET(request:Request){
  const actor=await getPlatformRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs platform jogosultság.'},{status:403,headers:{'Cache-Control':'no-store'}});
  const url=new URL(request.url);
  const parsed=querySchema.safeParse({limit:url.searchParams.get('limit')??undefined,ownership:url.searchParams.get('ownership')??undefined,severity:url.searchParams.get('severity')??undefined});
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen incidensszűrő.'},{status:400,headers:{'Cache-Control':'no-store'}});
  try{
    const incidents=await listPlatformIncidentQueue(parsed.data);
    return NextResponse.json({incidents},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof IncidentServiceError)return NextResponse.json({error:error.publicMessage},{status:error.status,headers:{'Cache-Control':'no-store'}});
    return NextResponse.json({error:'Az incidenslista nem olvasható.'},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
