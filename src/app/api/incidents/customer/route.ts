import{NextResponse}from'next/server';
import{customerIncidentInputSchema,isSameOrigin}from'@/lib/incidents/contracts';
import{createCustomerIncident,IncidentServiceError}from'@/lib/incidents/service';
import{correlationId,logEvent}from'@/lib/observability/logger';

export async function POST(request:Request){
  const corr=correlationId(request.headers.get('x-correlation-id'));
  const headers={'Cache-Control':'no-store','X-Correlation-Id':corr};
  if(!isSameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403,headers});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400,headers})}
  const parsed=customerIncidentInputSchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Ellenőrizd a hibabejelentés adatait.'},{status:400,headers});
  if(parsed.data.website)return NextResponse.json({ok:true,incidentNumber:'INC-OK',supportTicketNumber:'SUP-OK'},{status:202,headers});
  try{
    const result=await createCustomerIncident(parsed.data,corr);
    if(result.duplicate===true)return NextResponse.json({error:'Hasonló hibabejelentést néhány perce már rögzítettünk. Kérjük, várj egy kicsit.',incidentNumber:result.incidentNumber},{status:429,headers});
    return NextResponse.json({ok:true,incidentNumber:result.incidentNumber,supportTicketNumber:result.supportTicketNumber,triagePending:result.triagePending},{status:201,headers});
  }catch(error){
    if(error instanceof IncidentServiceError)return NextResponse.json({error:error.publicMessage},{status:error.status,headers});
    logEvent('error','incident.customer.api_failed',{correlationId:corr});
    return NextResponse.json({error:'A hibabejelentés rögzítése nem sikerült.'},{status:500,headers});
  }
}
