import{AccountSubnav}from'@/components/account/account-subnav';
import{StorefrontAccountShell}from'@/components/account/storefront-account-shell';
import{createAdminClient}from'@/lib/supabase/admin';
import{createClient}from'@/lib/supabase/server';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

export default async function AccountLayout({children}:{children:React.ReactNode}){
 const instance=await getCurrentWebshopInstance();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 let showLoyalty=false,showB2BOrganization=false,showB2BQuotes=false;
 if(instance){
  const admin=createAdminClient();
  const[loyaltyResult,relationResult]=await Promise.all([
   admin.from('loyalty_program_settings').select('enabled').eq('instance_id',instance.id).maybeSingle(),
   user?admin.from('customer_instance_roles').select('role,reseller_approved,b2b_account_id').eq('instance_id',instance.id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null,error:null}),
  ]);
  showLoyalty=Boolean(loyaltyResult.data?.enabled);
  const relation=relationResult.data as{role?:string;reseller_approved?:boolean;b2b_account_id?:string|null}|null;
  showB2BOrganization=Boolean(relation?.b2b_account_id);
  showB2BQuotes=relation?.role==='reseller'&&relation?.reseller_approved===true;
 }
 const fallback=<AccountSubnav showLoyalty={showLoyalty} showB2BOrganization={showB2BOrganization} showB2BQuotes={showB2BQuotes}/>;
 return <StorefrontAccountShell customerId={user?.id??null} fallbackNavigation={fallback}>{children}</StorefrontAccountShell>;
}
