import { createClient } from '@/lib/supabase/server';

export type CommerceAccess = {
  signedIn: boolean;
  reseller: boolean;
  resellerApproved: boolean;
};

export async function getCommerceAccess(): Promise<CommerceAccess> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { signedIn: false, reseller: false, resellerApproved: false };
    const { data: profile } = await supabase.from('profiles').select('role,reseller_approved').eq('id', user.id).maybeSingle();
    return {
      signedIn: true,
      reseller: profile?.role === 'reseller',
      resellerApproved: profile?.role === 'reseller' && profile?.reseller_approved === true,
    };
  } catch {
    return { signedIn: false, reseller: false, resellerApproved: false };
  }
}
