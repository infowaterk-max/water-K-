import { createClient } from '@/lib/supabase/server';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export type CommerceAccess = {
  signedIn: boolean;
  reseller: boolean;
  resellerApproved: boolean;
};

const anonymousAccess:CommerceAccess={signedIn:false,reseller:false,resellerApproved:false};

export async function getCommerceAccess(): Promise<CommerceAccess> {
  try {
    const [supabase,instance]=await Promise.all([createClient(),getCurrentWebshopInstance()]);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !instance) return anonymousAccess;

    const { data: relation,error } = await supabase
      .from('customer_instance_roles')
      .select('role,reseller_approved')
      .eq('instance_id',instance.id)
      .eq('user_id',user.id)
      .maybeSingle();

    if(error)return{signedIn:true,reseller:false,resellerApproved:false};

    const reseller=relation?.role==='reseller';
    return {
      signedIn: true,
      reseller,
      resellerApproved: reseller && relation?.reseller_approved === true,
    };
  } catch {
    return anonymousAccess;
  }
}
