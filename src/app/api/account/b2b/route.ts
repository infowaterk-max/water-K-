import { createHash,randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('invite'),accountId:z.string().uuid(),email:z.string().email(),role:z.enum(['admin','buyer'])}),
  z.object({action:z.literal('accept'),token:z.string().min(32).max(256)}),
  z.object({action:z.literal('set_role'),accountId:z.string().uuid(),userId:z.string().uuid(),role:z.enum(['admin','buyer'])}),
  z.object({action:z.literal('transfer'),accountId:z.string().uuid(),userId:z.string().uuid()}),
  z.object({action:z.literal('remove'),accountId:z.string().uuid(),userId:z.string().uuid()}),
  z.object({action:z.literal('revoke_invite'),accountId:z.string().uuid(),invitationId:z.string().uuid()}),
]);

function hashToken(token:string){return createHash('sha256').update(token).digest('hex')}
function dbError(error:{message:string}){
  const message=error.message;
  if(/B2B_ACCOUNT_(ADMIN|OWNER)_REQUIRED|B2B_MEMBER_REMOVE_FORBIDDEN|B2B_INVITATION_EMAIL_MISMATCH/.test(message))
    return NextResponse.json({error:'Ehhez a B2B szervezeti művelethez nincs jogosultságod.'},{status:403});
  if(/LAST_B2B_ACCOUNT_OWNER|B2B_OWNER_TRANSFER_REQUIRED|B2B_MEMBER_ALREADY_ASSIGNED|B2B_ACCOUNT_INVITATION_REQUIRED/.test(message))
    return NextResponse.json({error:'A művelet a jelenlegi B2B tagsági állapotban nem hajtható végre.'},{status:409});
  if(/B2B_INVITATION_(NOT_FOUND|INACTIVE)|B2B_MEMBER_NOT_FOUND/.test(message))
    return NextResponse.json({error:'A meghívó vagy tagság már nem aktív.'},{status:404});
  return NextResponse.json({error:'A B2B szervezeti művelet nem sikerült.'},{status:500});
}

export async function POST(request:Request){
  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status))
    return NextResponse.json({error:'Nincs aktív webshop.'},{status:409});

  const session=await createClient();
  const{data:{user}}=await session.auth.getUser();
  if(!user)return NextResponse.json({error:'Jelentkezz be a B2B fiók kezeléséhez.'},{status:401});

  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen B2B művelet.'},{status:400});

  const admin=createAdminClient();
  const body=parsed.data;
  let data:unknown,error:{message:string}|null=null;

  if(body.action==='invite'){
    const token=randomBytes(32).toString('hex');
    const expiresAt=new Date(Date.now()+7*24*60*60*1000).toISOString();
    const result=await admin.rpc('b2b_invite_member_v1',{
      p_instance_id:instance.id,p_account_id:body.accountId,p_actor:user.id,
      p_email:body.email,p_role:body.role,p_token_hash:hashToken(token),p_expires_at:expiresAt,
    });
    data=result.data;error=result.error;
    if(error)return dbError(error);
    return NextResponse.json({ok:true,result:data,joinUrl:`/fiokom/b2b?invite=${encodeURIComponent(token)}`});
  }

  if(body.action==='accept'){
    const result=await admin.rpc('b2b_accept_invitation_v1',{
      p_instance_id:instance.id,p_actor:user.id,p_token_hash:hashToken(body.token),
    });
    data=result.data;error=result.error;
  }else if(body.action==='set_role'){
    const result=await admin.rpc('b2b_set_member_role_v1',{
      p_instance_id:instance.id,p_account_id:body.accountId,p_actor:user.id,p_user_id:body.userId,p_role:body.role,
    });
    data=result.data;error=result.error;
  }else if(body.action==='transfer'){
    const result=await admin.rpc('b2b_transfer_ownership_v1',{
      p_instance_id:instance.id,p_account_id:body.accountId,p_actor:user.id,p_user_id:body.userId,
    });
    data=result.data;error=result.error;
  }else if(body.action==='remove'){
    const result=await admin.rpc('b2b_remove_member_v1',{
      p_instance_id:instance.id,p_account_id:body.accountId,p_actor:user.id,p_user_id:body.userId,
    });
    data=result.data;error=result.error;
  }else{
    const result=await admin.rpc('b2b_revoke_invitation_v1',{
      p_instance_id:instance.id,p_account_id:body.accountId,p_actor:user.id,p_invitation_id:body.invitationId,
    });
    data=result.data;error=result.error;
  }

  if(error)return dbError(error);
  return NextResponse.json({ok:true,result:data});
}
