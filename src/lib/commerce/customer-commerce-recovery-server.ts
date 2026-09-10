import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {buildCommerceRecoveryAccountModel,type CommerceRecoveryAccountModel,type CommerceJourneyEvidence,type RecentPurchaseEvidence,type SavedCheckoutEvidence} from '@/lib/commerce/commerce-automation-recovery';

type JourneyRow={id:string;kind:'post_purchase'|'replenishment'|'winback'|'abandoned_checkout';status:string;created_at:string;source_key:string|null};
type CheckoutRow={id:string;recovery_token:string;status:string;expires_at:string;last_seen_at:string};
type OrderRow={id:string;created_at:string;status:string};
type ItemRow={order_id:string;variant_id:string;product_name:string;variant_label:string|null;quantity:number};

export type CustomerCommerceRecoveryLoad={model:CommerceRecoveryAccountModel;loadError:boolean};

export async function loadCustomerCommerceRecovery(instanceId:string,userId:string):Promise<CustomerCommerceRecoveryLoad>{
  const admin=createAdminClient();
  const[journeysResult,checkoutResult,ordersResult]=await Promise.all([
    admin.from('customer_journeys').select('id,kind,status,created_at,source_key').eq('instance_id',instanceId).eq('user_id',userId).order('created_at',{ascending:false}).limit(24),
    admin.from('checkout_recovery_intents').select('id,recovery_token,status,expires_at,last_seen_at').eq('instance_id',instanceId).eq('user_id',userId).eq('status','open').order('last_seen_at',{ascending:false}).limit(5),
    admin.from('orders').select('id,created_at,status').eq('instance_id',instanceId).eq('customer_id',userId).order('created_at',{ascending:false}).limit(12),
  ]);

  const orderRows=((ordersResult.data??[]) as OrderRow[]).filter(row=>!['cancelled','refunded'].includes(row.status));
  const orderIds=orderRows.map(row=>row.id);
  let itemRows:ItemRow[]=[];
  let itemLoadError=false;
  if(orderIds.length){
    const itemResult=await admin.from('order_items').select('order_id,variant_id,product_name,variant_label,quantity').eq('instance_id',instanceId).in('order_id',orderIds);
    itemRows=(itemResult.data??[]) as ItemRow[];
    itemLoadError=Boolean(itemResult.error);
  }
  const orderCreatedAt=new Map(orderRows.map(row=>[row.id,row.created_at]));
  const recentPurchases:RecentPurchaseEvidence[]=itemRows.flatMap(row=>{
    const createdAt=orderCreatedAt.get(row.order_id);
    if(!createdAt||!row.variant_id)return[];
    return[{orderId:row.order_id,orderCreatedAt:createdAt,variantId:row.variant_id,productName:row.product_name,variantLabel:row.variant_label,quantity:Number(row.quantity)||0,productHref:`/fiokom/rendeles/${row.order_id}`}];
  });
  const journeys:CommerceJourneyEvidence[]=((journeysResult.data??[]) as JourneyRow[]).map(row=>({id:row.id,kind:row.kind,status:row.status,createdAt:row.created_at,sourceKey:row.source_key}));
  const savedCheckouts:SavedCheckoutEvidence[]=((checkoutResult.data??[]) as CheckoutRow[]).map(row=>({id:row.id,recoveryToken:row.recovery_token,status:row.status,expiresAt:row.expires_at,lastSeenAt:row.last_seen_at}));

  return{
    model:buildCommerceRecoveryAccountModel({journeys,savedCheckouts,recentPurchases}),
    loadError:Boolean(journeysResult.error||checkoutResult.error||ordersResult.error||itemLoadError),
  };
}
