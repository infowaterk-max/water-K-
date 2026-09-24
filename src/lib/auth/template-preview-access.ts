import 'server-only';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

type BindingRow={role_code:string;valid_from:string;valid_until:string|null;revoked_at:string|null};

function safeReturnTo(value:string){
  return value.startsWith('/storefront-template-preview?')?value:'/storefront-template-preview';
}

export async function requireStorefrontTemplatePreviewAccess(returnTo:string){
  const hasPublicKey=Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!hasPublicKey)redirect('/fiokom?reason=admin-config');

  const supabase=await createClient();
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user){
    const next=safeReturnTo(returnTo);
    redirect(`/fiokom?reason=login&next=${encodeURIComponent(next)}`);
  }

  let admin:ReturnType<typeof createAdminClient>;
  try{admin=createAdminClient()}catch{redirect('/fiokom?reason=forbidden')}

  const{data:platformOperator,error:platformError}=await admin
    .from('platform_operators')
    .select('role')
    .eq('user_id',user.id)
    .in('role',['owner','admin','operator'])
    .maybeSingle();
  if(!platformError&&platformOperator)return user;

  const{data:bindingData,error:bindingError}=await admin
    .from('role_bindings')
    .select('role_code,valid_from,valid_until,revoked_at')
    .eq('user_id',user.id);
  if(bindingError)redirect('/fiokom?reason=forbidden');

  const now=new Date().toISOString();
  const bindings=(bindingData??[])as BindingRow[];
  const activeAdminBinding=bindings.some(binding=>
    !binding.revoked_at
    &&binding.valid_from<=now
    &&(!binding.valid_until||binding.valid_until>now)
    &&(binding.role_code==='owner'||binding.role_code==='admin')
  );
  if(activeAdminBinding)return user;

  // Transitional compatibility is available only before this user has any RBAC history.
  // Revoked/expired role_bindings remain authoritative and can never fall back to legacy membership.
  if(bindings.length===0){
    const{data:profile,error:profileError}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
    if(!profileError&&profile?.role==='admin'){
      const{data:legacy,error:legacyError}=await admin
        .from('webshop_instance_members')
        .select('instance_id,role')
        .eq('user_id',user.id)
        .in('role',['owner','admin'])
        .limit(1);
      if(!legacyError&&(legacy?.length??0)>0)return user;
    }
  }

  redirect('/fiokom?reason=forbidden');
}
