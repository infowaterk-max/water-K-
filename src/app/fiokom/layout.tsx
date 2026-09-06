import { AccountSubnav } from '@/components/account/account-subnav';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export default async function AccountLayout({children}:{children:React.ReactNode}){
  const instance=await getCurrentWebshopInstance();
  let showLoyalty=false;
  if(instance){
    const{data}=await createAdminClient().from('loyalty_program_settings').select('enabled').eq('instance_id',instance.id).maybeSingle();
    showLoyalty=Boolean(data?.enabled);
  }
  return <><AccountSubnav showLoyalty={showLoyalty}/>{children}</>;
}
