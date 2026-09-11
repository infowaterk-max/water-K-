import{createAdminClient}from'@/lib/supabase/admin';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStorePageContext}from'@/lib/instances/scope';
import{ProductIntakeEditor,type ProductIntakeInitialData}from'@/components/admin/product-intake-editor';
import{normalizeMediaPresentationSet,type MediaPresentationContext,type MediaPresentationTransform,type MediaPresentationPreset}from'@/lib/catalog-media-presentation';

export const dynamic='force-dynamic';
type PresentationInput=Partial<Record<MediaPresentationContext,Partial<MediaPresentationTransform>>>;
const normalizeJsonPresentation=(value:unknown)=>normalizeMediaPresentationSet(value as PresentationInput);
export default async function NewProductIntakePage(){
  await requirePlanFeature('importExport');
  const scope=await requireCurrentStorePageContext('catalog.manage'),admin=createAdminClient();
  const[channelsResult,presetsResult]=await Promise.all([
    admin.from('webshop_sales_channels').select('channel_code,enabled').eq('instance_id',scope.instanceId),
    admin.from('product_media_presets').select('id,name,presentation').eq('instance_id',scope.instanceId).order('name'),
  ]);
  const state=new Map((channelsResult.data??[]).map(item=>[item.channel_code,item.enabled]));
  const mediaPresets:MediaPresentationPreset[]=(presetsResult.data??[]).map(item=>({id:item.id,name:item.name,presentation:normalizeJsonPresentation(item.presentation)}));
  const initialData:ProductIntakeInitialData={
    name:'',shortDescription:'',description:'',seoTitle:'',seoDescription:'',category:'',baseSku:'',colors:[],sizes:[],
    variants:[{id:'',label:'Alap',sku:'',netPrice:0,grossPrice:0,stock:0,active:true,primaryMediaId:null}],
    media:[],mediaPresets,
    channels:{b2cVisible:true,b2bVisible:false,b2cEnabled:state.get('b2c')!==false,b2bEnabled:state.get('b2b')===true},
  };
  return <ProductIntakeEditor initialData={initialData}/>;
}
