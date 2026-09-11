import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

export const runtime='nodejs';
const input=z.object({
 mode:z.enum(['description','seo','category','complete']),
 product:z.object({name:z.string().trim().min(1).max(200),shortDescription:z.string().max(1000).default(''),description:z.string().max(20000).default(''),seoTitle:z.string().max(200).default(''),seoDescription:z.string().max(500).default(''),category:z.string().max(120).default(''),colors:z.array(z.string().max(120)).max(30).default([]),sizes:z.array(z.string().max(120)).max(30).default([])})
});
const suggestion=z.object({shortDescription:z.string().trim().min(1).max(1000).optional(),description:z.string().trim().min(1).max(20000).optional(),seoTitle:z.string().trim().min(1).max(200).optional(),seoDescription:z.string().trim().min(1).max(500).optional(),category:z.string().trim().min(1).max(120).optional(),reason:z.string().trim().max(500).optional()}).strict();
type Suggestion=z.infer<typeof suggestion>;
const MODEL_DEFAULT='openai/gpt-5.6-luna';
const allowedByMode:Record<z.infer<typeof input>['mode'],Array<keyof Suggestion>>={description:['shortDescription','description','reason'],seo:['seoTitle','seoDescription','reason'],category:['category','reason'],complete:['shortDescription','description','seoTitle','seoDescription','category','reason']};
function cleanJson(text:string){const trimmed=text.trim();if(trimmed.startsWith('```'))return trimmed.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return trimmed}
function pickAllowed(value:Suggestion,mode:z.infer<typeof input>['mode']){const allowed=new Set(allowedByMode[mode]);return Object.fromEntries(Object.entries(value).filter(([key])=>allowed.has(key as keyof Suggestion)))as Suggestion}

export async function POST(request:Request){
 const actor=await getAdminRequestUser('catalog.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}const parsed=input.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'A Copilot bemenete érvénytelen.'},{status:400});
 const admin=createAdminClient(),{data:allowed,error:limitError}=await admin.rpc('consume_security_rate_limit',{p_rate_key:`product-copilot:${scope.instanceId}:${actor.id}`,p_window_seconds:3600,p_max_count:30});if(limitError)return NextResponse.json({error:'A Copilot használati korlátja most nem ellenőrizhető.'},{status:503});if(allowed!==true)return NextResponse.json({error:'A Product Copilot óránkénti használati kerete elfogyott. Próbáld újra később.'},{status:429});
 const token=process.env.AI_GATEWAY_API_KEY?.trim()||process.env.VERCEL_OIDC_TOKEN?.trim();if(!token)return NextResponse.json({error:'A Product Copilot AI Gateway kapcsolata nincs konfigurálva.'},{status:503});
 const model=process.env.PRODUCT_COPILOT_MODEL?.trim()||MODEL_DEFAULT,task=parsed.data.mode==='description'?'Adj jobb rövid és hosszú termékleírást.':parsed.data.mode==='seo'?'Adj tömör SEO címet és meta descriptiont.':parsed.data.mode==='category'?'Javasolj egyetlen, rövid webshop-kategóriát.':'Javasolj hiányzó vagy javítható leírási, SEO és kategória mezőket.';
 const system='Te a Shoperation Product Copilot vagy. Kizárólag magyar nyelvű, tényszerű termékadat-javaslatokat adj a kapott adatok alapján. Ne találj ki műszaki tulajdonságot, tanúsítványt, készletet, árat, garanciát vagy teljesítményígéretet. Ne adj HTML-t. A válasz kizárólag egy JSON objektum legyen a megengedett kulcsokkal: shortDescription, description, seoTitle, seoDescription, category, reason. Hagyd el azt a kulcsot, amelyhez nincs megbízható javaslat. A javaslat emberi jóváhagyás nélkül nem kerül alkalmazásra.';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:`Feladat: ${task}\nTermékadatok: ${JSON.stringify(parsed.data.product)}`}],response_format:{type:'json_object'},user:actor.id}),signal:controller.signal});
  const payload=await response.json().catch(()=>null)as null|{choices?:Array<{message?:{content?:string}}>;error?:{message?:string}};if(!response.ok)return NextResponse.json({error:response.status===429?'A Product Copilot AI szolgáltatása átmenetileg elérte a korlátját.':'A Product Copilot most nem tudott javaslatot készíteni.'},{status:response.status===429?429:502});
  const content=payload?.choices?.[0]?.message?.content;if(!content)return NextResponse.json({error:'A Product Copilot üres választ adott.'},{status:502});let candidate:unknown;try{candidate=JSON.parse(cleanJson(content))}catch{return NextResponse.json({error:'A Product Copilot válasza nem volt biztonságosan értelmezhető.'},{status:502})}const checked=suggestion.safeParse(candidate);if(!checked.success)return NextResponse.json({error:'A Product Copilot válasza nem felelt meg a mezőcontractnak.'},{status:502});const result=pickAllowed(checked.data,parsed.data.mode);if(!Object.keys(result).some(key=>key!=='reason'))return NextResponse.json({error:'A Product Copilot nem talált megbízható módosítási javaslatot.'},{status:422});
  return NextResponse.json({ok:true,model,suggestion:result,requiresApproval:true});
 }catch(error){return NextResponse.json({error:error instanceof Error&&error.name==='AbortError'?'A Product Copilot válasza időtúllépés miatt megszakadt.':'A Product Copilot hálózati hibába ütközött.'},{status:502})}finally{clearTimeout(timeout)}
}
