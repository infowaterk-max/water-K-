import 'server-only';
import {createAdminClient}from'@/lib/supabase/admin';
export type OrderLifecycleStatus='draft'|'pending'|'pending_payment'|'pending_transfer'|'paid'|'processing'|'shipped'|'completed'|'cancelled'|'refunded';
export async function transitionTenantOrder(input:{instanceId:string;orderId:string;actorId:string;status:OrderLifecycleStatus;trackingNumber?:string|null}){const admin=createAdminClient();const{data,error}=await admin.rpc('transition_tenant_order_v1',{p_instance_id:input.instanceId,p_order_id:input.orderId,p_actor:input.actorId,p_target_status:input.status,p_tracking_number:input.trackingNumber??null});if(error)throw error;return data as{order_id:string;status:OrderLifecycleStatus;inventory_restored:boolean;replayed:boolean};}
