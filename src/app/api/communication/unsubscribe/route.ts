import{createHmac,timingSafeEqual}from'node:crypto';
import{NextResponse}from'next/server';
import{z}from'zod';
import{createAdminClient}from'@/lib/supabase/admin';

function normalized(value:string|null){return(value??'').trim().toLowerCase()}
function valid(instanceId:string,email:string,token:string){const secret=process.env.COMMUNICATION_UNSUBSCRIBE_SECRET;if(!secret||!z.string().uuid().safeParse(instanceId).success||!email||!token)return false;const expected=createHmac('sha256',secret).update(`${instanceId}:${email}`).digest('hex');if(token.length!==expected.length)return false;try{return timingSafeEqual(Buffer.from(token),Buffer.from(expected))}catch{return false}}
function html(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c))}
function page(title:string,text:string,action?:string){const button=action?`<form method="post" action="${action}"><button type="submit" style="border:0;border-radius:999px;background:#183f2d;color:white;padding:12px 20px;font-weight:700;cursor:pointer">Leiratkozás megerősítése</button></form>`:'';return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:Arial,sans-serif;background:#f5f7f5;color:#18221d;margin:0"><main style="max-width:620px;margin:10vh auto;background:white;padding:32px;border-radius:20px"><h1>${title}</h1><p>${text}</p>${button}</main></body></html>`}

export async function GET(request:Request){
 const u=new URL(request.url),instanceId=u.searchParams.get('instance')??'',email=normalized(u.searchParams.get('email')),token=u.searchParams.get('token')??'';
 if(!valid(instanceId,email,token))return new NextResponse(page('Érvénytelen leiratkozási hivatkozás','A hivatkozás hiányos vagy már nem érvényes.'),{status:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
 const a=createAdminClient(),{data:instance}=await a.from('webshop_instances').select('id').eq('id',instanceId).in('status',['pilot','active']).maybeSingle();
 if(!instance)return new NextResponse(page('Érvénytelen leiratkozási hivatkozás','A hivatkozáshoz tartozó webshop nem aktív.'),{status:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
 const action=`/api/communication/unsubscribe?instance=${encodeURIComponent(instanceId)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
 return new NextResponse(page('Marketing e-mail leiratkozás',`A(z) <strong>${html(email)}</strong> cím leiratkozását erősítheted meg. A rendelési és ügyfélszolgálati értesítéseket ez nem érinti.`,action),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
export async function POST(request:Request){
 const u=new URL(request.url),instanceId=u.searchParams.get('instance')??'',email=normalized(u.searchParams.get('email')),token=u.searchParams.get('token')??'';
 if(!valid(instanceId,email,token))return NextResponse.json({error:'Érvénytelen leiratkozási hivatkozás.'},{status:400});
 const a=createAdminClient(),{data:instance}=await a.from('webshop_instances').select('id').eq('id',instanceId).in('status',['pilot','active']).maybeSingle();
 if(!instance)return NextResponse.json({error:'A webshop nem aktív.'},{status:409});
 const{error}=await a.from('marketing_consents').insert({instance_id:instanceId,user_id:null,email,channel:'email',status:'withdrawn',source:'one_click_unsubscribe',policy_version:'2026-08-v1',metadata:{actor:'recipient',method:'signed_link'}});
 if(error)return NextResponse.json({error:'A leiratkozás most nem menthető.'},{status:500});
 const accept=request.headers.get('accept')??'';
 if(accept.includes('text/html'))return new NextResponse(page('Leiratkozás sikeres','A marketing e-mail hozzájárulásodat visszavontuk. Tranzakciós értesítéseket továbbra is kaphatsz a rendeléseidről és ügyeidről.'),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
 return NextResponse.json({ok:true});
}
