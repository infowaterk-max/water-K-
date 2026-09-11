import{notFound}from'next/navigation';
import{createAdminClient}from'@/lib/supabase/admin';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStorePageContext}from'@/lib/instances/scope';
import{ProductIntakeEditor,type ProductIntakeInitialData}from'@/components/admin/product-intake-editor';
import{normalizeMediaPresentationSet,type MediaPresentationContext,type MediaPresentationTransform,type MediaPresentationPreset}from'@/lib/catalog-media-presentation';

export const dynamic='force-dynamic';
const splitValues=(value:string|undefined)=>value?.split(',').map(item=>item.trim()).filter(Boolean)??[];
type PresentationInput=Partial<Record<MediaPresentationContext,Partial<MediaPresentationTransform>>>;
const normalizeJsonPresentation=(value:unknown)=>normalizeMediaPresentationSet(value as PresentationInput);
export default async function EditProductIntakePage({params}:{params:Promise<{id:string}>}){
  await requirePlanFeature('importExport');
  const scope=await requireCurrentStorePageContext('catalog.manage'),{id}=await params,admin=createAdminClient();
  const[productResult,variantsResult,mediaResult,attributesResult,assignmentResult,productChannelsResult,globalChannelsResult,presentationResult,presetsResult]=await Promise.all([
    admin.from('products').select('id,name,short_description,description,seo_title,seo_description,active,updated_at').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle(),
    admin.from('product_variants').select('id,label,sku,net_price_huf,gross_price_huf,stock_quantity,active,primary_media_id').eq('instance_id',scope.instanceId).eq('product_id',id).order('created_at'),
    admin.from('product_media').select('id,original_name,storage_path').eq('instance_id',scope.instanceId).eq('product_id',id).order('sort_order').order('created_at'),
    admin.from('product_attributes').select('name,value').eq('instance_id',scope.instanceId).eq('product_id',id),
    admin.from('product_category_assignments').select('category_id').eq('instance_id',scope.instanceId).eq('product_id',id).limit(1).maybeSingle(),
    admin.from('product_channel_settings').select('channel_code,visible').eq('instance_id',scope.instanceId).eq('product_id',id),
    admin.from('webshop_sales_channels').select('channel_code,enabled').eq('instance_id',scope.instanceId),
    admin.from('product_media_presentations').select('media_id,context,zoom,offset_x,offset_y,rotation').eq('instance_id',scope.instanceId).eq('product_id',id),
    admin.from('product_media_presets').select('id,name,presentation').eq('instance_id',scope.instanceId).order('name'),
  ]);
  const product=productResult.data;if(productResult.error||!product||product.active||variantsResult.error||mediaResult.error||attributesResult.error||assignmentResult.error||productChannelsResult.error||globalChannelsResult.error||presentationResult.error||presetsResult.error)notFound();
  let category='';if(assignmentResult.data?.category_id){const{data,error}=await admin.from('catalog_categories').select('name').eq('instance_id',scope.instanceId).eq('id',assignmentResult.data.category_id).maybeSingle();if(error)notFound();category=data?.name??''}
  const attrs=new Map((attributesResult.data??[]).map(item=>[item.name,item.value])),productChannels=new Map((productChannelsResult.data??[]).map(item=>[item.channel_code,item.visible])),globalChannels=new Map((globalChannelsResult.data??[]).map(item=>[item.channel_code,item.enabled]));
  const presentationByMedia=new Map<string,PresentationInput>();
  for(const row of presentationResult.data??[]){const context=row.context as MediaPresentationContext;if(!['card','detail','mobile'].includes(context))continue;const current=presentationByMedia.get(row.media_id)??{};current[context]={zoom:Number(row.zoom),offsetX:Number(row.offset_x),offsetY:Number(row.offset_y),rotation:Number(row.rotation)};presentationByMedia.set(row.media_id,current)}
  const media=(mediaResult.data??[]).map(item=>({id:item.id,name:item.original_name,url:admin.storage.from('product-media').getPublicUrl(item.storage_path).data.publicUrl,presentation:normalizeMediaPresentationSet(presentationByMedia.get(item.id))}));
  const variants=(variantsResult.data??[]).map(item=>({id:item.id,label:item.label,sku:item.sku,netPrice:item.net_price_huf,grossPrice:item.gross_price_huf,stock:item.stock_quantity,active:item.active,primaryMediaId:item.primary_media_id}));
  const mediaPresets:MediaPresentationPreset[]=(presetsResult.data??[]).map(item=>({id:item.id,name:item.name,presentation:normalizeJsonPresentation(item.presentation)}));
  if(!variants.length)notFound();
  const initialData:ProductIntakeInitialData={productId:product.id,updatedAt:product.updated_at,name:product.name,shortDescription:product.short_description??'',description:product.description??'',seoTitle:product.seo_title??'',seoDescription:product.seo_description??'',category,baseSku:variants[0]?.sku.split('-')[0]??'SKU',colors:splitValues(attrs.get('Szín')),sizes:splitValues(attrs.get('Méret')),variants,media,mediaPresets,channels:{b2cVisible:productChannels.get('b2c')!==false,b2bVisible:productChannels.get('b2b')===true,b2cEnabled:globalChannels.get('b2c')!==false,b2bEnabled:globalChannels.get('b2b')===true}};
  return <ProductIntakeEditor initialData={initialData}/>;
}
