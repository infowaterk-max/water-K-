import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { hasCurrentPlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAudit } from '@/lib/admin/audit';
import { buildMerchantDecisionCards,deterministicDecisionExplanation,loadMerchantDecisionSnapshot,MERCHANT_DECISIONING_VERSION } from '@/lib/decisioning/merchant-intelligence';

const requestSchema=z.object({key:z.string().min(1).max(220)}).strict();
const responseSchema=z.object({summary:z.string().min(1).max(700),why:z.string().min(1).max(1200),nextSteps:z.array(z.string().min(1).max(320)).min(1).max(3)}).strict();
const MODEL_RE=/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i;

function parseAiContent(value:unknown){
  if(typeof value!=='string')return null;
  const cleaned=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{return responseSchema.safeParse(JSON.parse(cleaned));}catch{return null;}
}

export async function POST(request:Request){
  const actor=await getAdminRequestUser('analytics.read');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('analytics.read')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  if(!(await hasCurrentPlanFeature('executiveAnalytics')))return NextResponse.json({error:'A döntési intelligencia Pro funkció.'},{status:403});

  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=requestSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen döntési azonosító.'},{status:400});

  const admin=createAdminClient();
  const{data:rateAllowed,error:rateError}=await admin.rpc('consume_security_rate_limit',{p_rate_key:`block18-ai:${scope.instanceId}:${actor.id}`,p_window_seconds:60,p_max_count:12});
  if(rateError||rateAllowed!==true)return NextResponse.json({error:'Túl sok AI magyarázatkérés. Próbáld újra később.'},{status:429});

  let card;
  try{
    const snapshot=await loadMerchantDecisionSnapshot(scope.instanceId);
    card=buildMerchantDecisionCards(snapshot).find(candidate=>candidate.key===parsed.data.key);
  }catch{return NextResponse.json({error:'A döntési bizonyíték most nem tölthető be.'},{status:503})}
  if(!card)return NextResponse.json({error:'A döntési javaslat már nem aktuális vagy nem ehhez a webshophoz tartozik.'},{status:404});

  const fallback=deterministicDecisionExplanation(card);
  const apiKey=process.env.AI_GATEWAY_API_KEY?.trim();
  const model=(process.env.SHOPOPERATION_DECISIONING_MODEL?.trim()||'openai/gpt-5.4');
  if(!apiKey||!MODEL_RE.test(model)){
    await recordAdminAudit({actorUserId:actor.id,action:'decisioning.explain',entityType:'decision_insight',entityId:null,summary:'Block 18 bizonyíték-alapú magyarázat megnyitva.',organizationId:scope.organizationId,instanceId:scope.instanceId,metadata:{version:MERCHANT_DECISIONING_VERSION,cardKey:card.key,mode:'evidence-fallback',authority:card.authority}});
    return NextResponse.json({ok:true,mode:'evidence',...fallback});
  }

  const safeInput={
    title:card.title,
    summary:card.summary,
    rationale:card.rationale,
    recommendation:card.recommendation,
    confidence:card.confidence,
    authority:card.authority,
    evidence:card.evidence,
  };
  try{
    const gateway=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        temperature:0.1,
        max_tokens:450,
        messages:[
          {role:'system',content:'Te a Shoperation kereskedői döntéstámogató asszisztense vagy. Kizárólag a megadott bizonyítékot használd. Ne találj ki adatot, okot, előrejelzést vagy ügyféltényt. Ne adj utasítást közvetlen business-state írására, ár/készlet/promóció automatikus módosítására vagy jóváhagyás megkerülésére. A javaslat human-in-the-loop: magyarázz és indokolj. Válaszolj kizárólag JSON objektummal: {"summary":"...","why":"...","nextSteps":["..."]}. Maximum 3 nextSteps.'},
          {role:'user',content:JSON.stringify(safeInput)},
        ],
      }),
      signal:AbortSignal.timeout(12000),
      cache:'no-store',
    });
    if(!gateway.ok)throw new Error(`AI_GATEWAY_${gateway.status}`);
    const payload=await gateway.json() as{choices?:Array<{message?:{content?:unknown}}>};
    const ai=parseAiContent(payload.choices?.[0]?.message?.content);
    if(!ai?.success)throw new Error('AI_RESPONSE_INVALID');
    await recordAdminAudit({actorUserId:actor.id,action:'decisioning.explain',entityType:'decision_insight',entityId:null,summary:'Block 18 AI döntési magyarázat megnyitva.',organizationId:scope.organizationId,instanceId:scope.instanceId,metadata:{version:MERCHANT_DECISIONING_VERSION,cardKey:card.key,mode:'ai',model,authority:card.authority}});
    return NextResponse.json({ok:true,mode:'ai',model,...ai.data});
  }catch{
    await recordAdminAudit({actorUserId:actor.id,action:'decisioning.explain',entityType:'decision_insight',entityId:null,summary:'Block 18 AI fallback magyarázat megnyitva.',organizationId:scope.organizationId,instanceId:scope.instanceId,metadata:{version:MERCHANT_DECISIONING_VERSION,cardKey:card.key,mode:'gateway-fallback',authority:card.authority}});
    return NextResponse.json({ok:true,mode:'evidence',...fallback});
  }
}
