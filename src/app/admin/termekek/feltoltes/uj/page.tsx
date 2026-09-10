import{createAdminClient}from'@/lib/supabase/admin';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStorePageContext}from'@/lib/instances/scope';
import{ProductIntakeEditor,type ProductIntakeInitialData}from'@/components/admin/product-intake-editor';

export const dynamic='force-dynamic';
export default async function NewProductIntakePage(){
  await requirePlanFeature('importExport');
  const scope=await requireCurrentStorePageContext('catalog.manage'),admin=createAdminClient();
  const{data:channels}=await admin.from('webshop_sales_channels').select('channel_code,enabled').eq('instance_id',scope.instanceId);
  const state=new Map((channels??[]).map(item=>[item.channel_code,item.enabled]));
  const initialData:ProductIntakeInitialData={channels:{b2cVisible:true,b2bVisible:false,b2cEnabled:state.get('b2c')!==false,b2bEnabled:state.get('b2b')===true}};
  return <ProductIntakeEditor initialData={initialData}/>;
}