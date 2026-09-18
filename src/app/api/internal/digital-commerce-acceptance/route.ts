import{createHash,randomUUID,timingSafeEqual}from'node:crypto';
import{NextResponse}from'next/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{authorizeDigitalDownload,createGuestDigitalAccess,digitalRequestFingerprint}from'@/lib/commerce/digital-commerce';

const EXPECTED_STAGING_URL='https://rfuvzgumbardvbvqjxdq.supabase.co';
const EXPECTED_BRANCH='feature/digital-commerce-product-documents';
const INSTANCE_ID='6027c79a-e5f3-4c9c-a8d0-b6090958efde';
const INSTANCE_SLUG='digital-commerce-acceptance-20260918';
const ACTOR_ID='f6ee71eb-8c50-4d85-bcd9-743a3cc8a7ef';
const PRODUCT_ID='0e828394-fb56-4777-8f38-40abb656a12b';
const VARIANT_ID='cfd2022d-7051-4971-a1c8-bafa64948a9c';
const ORDER_ID='fad6d026-4cef-4bc1-8797-cde35beb126e';
const BUCKET='digital-products-private';

function sha256(value:string|Buffer){return createHash('sha256').update(value).digest('hex')}
function safeEqualHex(left:string,right:string){
  if(!/^[a-f0-9]{64}$/.test(left)||!/^[a-f0-9]{64}$/.test(right))return false;
  const a=Buffer.from(left,'hex'),b=Buffer.from(right,'hex');
  return a.length===b.length&&timingSafeEqual(a,b);
}
function errorMessage(error:unknown){return error instanceof Error?error.message:String(error)}

export async function GET(request:Request){
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==EXPECTED_BRANCH)return new NextResponse(null,{status:404});
  if((process.env.NEXT_PUBLIC_SUPABASE_URL??'').replace(/\/$/,'')!==EXPECTED_STAGING_URL)return new NextResponse(null,{status:404});

  const token=new URL(request.url).searchParams.get('token')??'';
  if(!/^[a-f0-9]{64}$/.test(token))return new NextResponse(null,{status:404});

  const admin=createAdminClient();
  const{data:instance,error:instanceError}=await admin.from('webshop_instances')
    .select('id,slug,status,storefront_config').eq('id',INSTANCE_ID).eq('slug',INSTANCE_SLUG).maybeSingle();
  if(instanceError||!instance||instance.status!=='pilot')return new NextResponse(null,{status:404});
  const config=instance.storefront_config&&typeof instance.storefront_config==='object'&&!Array.isArray(instance.storefront_config)
    ?instance.storefront_config as Record<string,unknown>:{};
  const storedHash=typeof config.acceptanceHarnessHash==='string'?config.acceptanceHarnessHash:'';
  if(!safeEqualHex(sha256(token),storedHash))return new NextResponse(null,{status:404});

  const{data:order,error:orderError}=await admin.from('orders')
    .select('id,status,customer_id,fulfillment_mode,paid_at').eq('id',ORDER_ID).eq('instance_id',INSTANCE_ID).maybeSingle();
  if(orderError||!order||order.status!=='pending'||order.customer_id!==null||order.fulfillment_mode!=='digital'||order.paid_at!==null){
    return NextResponse.json({ok:false,errorCode:'ACCEPTANCE_ORDER_PRECONDITION_FAILED'},{status:409});
  }
  const{data:line,error:lineError}=await admin.from('order_items')
    .select('id,variant_id,fulfillment_type').eq('order_id',ORDER_ID).eq('instance_id',INSTANCE_ID).eq('variant_id',VARIANT_ID).maybeSingle();
  if(lineError||!line||line.fulfillment_type!=='digital'){
    return NextResponse.json({ok:false,errorCode:'ACCEPTANCE_ORDER_LINE_PRECONDITION_FAILED'},{status:409});
  }

  const assetId=randomUUID();
  const fileName='shoperation-digital-commerce-acceptance.bin';
  const storagePath=`${INSTANCE_ID}/${PRODUCT_ID}/${assetId}/${fileName}`;
  const fileBody=Buffer.from([
    'Shoperation Digital Commerce Acceptance',
    `commit=${process.env.VERCEL_GIT_COMMIT_SHA??'unknown'}`,
    `order=${ORDER_ID}`,
    `asset=${assetId}`,
    ''
  ].join('\n'),'utf8');
  const checksum=sha256(fileBody);
  let activated=false;
  let paid=false;

  try{
    const{data:draft,error:draftError}=await admin.rpc('create_digital_asset_draft_v1',{
      p_instance_id:INSTANCE_ID,p_actor:ACTOR_ID,p_asset_id:assetId,p_product_id:PRODUCT_ID,p_variant_id:VARIANT_ID,
      p_storage_path:storagePath,p_original_name:fileName,p_media_type:'application/octet-stream',
      p_size_bytes:fileBody.length,p_checksum_sha256:checksum,p_max_downloads:3,
    });
    const draftValue=(draft??{})as{assetId?:string;storagePath?:string;active?:boolean};
    if(draftError||draftValue.assetId!==assetId||draftValue.storagePath!==storagePath||draftValue.active!==false)throw draftError??new Error('ACCEPTANCE_DRAFT_FAILED');

    const{data:ticket,error:ticketError}=await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath,{upsert:false});
    if(ticketError||!ticket?.token)throw ticketError??new Error('ACCEPTANCE_SIGNED_UPLOAD_TICKET_FAILED');
    const{error:uploadError}=await admin.storage.from(BUCKET).uploadToSignedUrl(storagePath,ticket.token,fileBody,{contentType:'application/octet-stream',cacheControl:'0'});
    if(uploadError)throw uploadError;

    const{data:activation,error:activationError}=await admin.rpc('activate_digital_asset_v1',{
      p_instance_id:INSTANCE_ID,p_actor:ACTOR_ID,p_asset_id:assetId,
    });
    const activationValue=(activation??{})as{assetId?:string;active?:boolean};
    if(activationError||activationValue.assetId!==assetId||activationValue.active!==true)throw activationError??new Error('ACCEPTANCE_ACTIVATION_FAILED');
    activated=true;

    const{data:paidTransition,error:paidError}=await admin.rpc('transition_tenant_order_v1',{
      p_instance_id:INSTANCE_ID,p_order_id:ORDER_ID,p_actor:ACTOR_ID,p_target_status:'paid',p_tracking_number:null,
    });
    if(paidError||(paidTransition as{status?:string}|null)?.status!=='paid')throw paidError??new Error('ACCEPTANCE_PAID_TRANSITION_FAILED');
    paid=true;

    const{data:paidOrder,error:paidOrderError}=await admin.from('orders').select('status,paid_at')
      .eq('id',ORDER_ID).eq('instance_id',INSTANCE_ID).maybeSingle();
    if(paidOrderError||!paidOrder||paidOrder.status!=='paid'||!paidOrder.paid_at)throw paidOrderError??new Error('ACCEPTANCE_PAYMENT_EVIDENCE_MISSING');

    const{data:entitlement,error:entitlementError}=await admin.from('digital_entitlements')
      .select('id,status,download_count,max_downloads,customer_id,customer_email')
      .eq('instance_id',INSTANCE_ID).eq('order_id',ORDER_ID).eq('asset_id',assetId).maybeSingle();
    if(entitlementError||!entitlement||entitlement.status!=='active'||entitlement.download_count!==0)throw entitlementError??new Error('ACCEPTANCE_ENTITLEMENT_MISSING');

    const guest=await createGuestDigitalAccess({instanceId:INSTANCE_ID,orderId:ORDER_ID,tokenSeed:`acceptance:${assetId}`});
    const fingerprint=digitalRequestFingerprint([INSTANCE_ID,ORDER_ID,assetId,'acceptance-harness']);
    const signed=await authorizeDigitalDownload({
      instanceId:INSTANCE_ID,orderId:ORDER_ID,assetId,customerId:null,guestToken:guest.token,requestFingerprint:fingerprint,
    });
    const response=await fetch(signed.url,{redirect:'follow',cache:'no-store'});
    if(!response.ok)throw new Error(`ACCEPTANCE_SIGNED_DOWNLOAD_HTTP_${response.status}`);
    const downloaded=Buffer.from(await response.arrayBuffer());
    const downloadedChecksum=sha256(downloaded);
    if(downloadedChecksum!==checksum)throw new Error('ACCEPTANCE_DOWNLOAD_CHECKSUM_MISMATCH');

    const{data:afterDownload,error:afterDownloadError}=await admin.from('digital_entitlements')
      .select('status,download_count,max_downloads,last_download_at').eq('id',entitlement.id).maybeSingle();
    if(afterDownloadError||!afterDownload||afterDownload.status!=='active'||afterDownload.download_count!==1||!afterDownload.last_download_at){
      throw afterDownloadError??new Error('ACCEPTANCE_DOWNLOAD_COUNTER_FAILED');
    }
    const{data:guestAccess,error:guestAccessError}=await admin.from('digital_guest_access_tokens')
      .select('id,use_count,revoked_at,expires_at').eq('instance_id',INSTANCE_ID).eq('order_id',ORDER_ID).maybeSingle();
    if(guestAccessError||!guestAccess||guestAccess.use_count!==1||guestAccess.revoked_at!==null)throw guestAccessError??new Error('ACCEPTANCE_GUEST_TOKEN_STATE_FAILED');

    const{data:refundTransition,error:refundError}=await admin.rpc('transition_tenant_order_v1',{
      p_instance_id:INSTANCE_ID,p_order_id:ORDER_ID,p_actor:ACTOR_ID,p_target_status:'refunded',p_tracking_number:null,
    });
    if(refundError||(refundTransition as{status?:string}|null)?.status!=='refunded')throw refundError??new Error('ACCEPTANCE_REFUND_TRANSITION_FAILED');
    paid=false;

    const[{data:revokedEntitlement,error:revokedEntitlementError},{data:revokedGuest,error:revokedGuestError}]=await Promise.all([
      admin.from('digital_entitlements').select('status,revoked_at,revoked_reason,download_count').eq('id',entitlement.id).maybeSingle(),
      admin.from('digital_guest_access_tokens').select('revoked_at,use_count').eq('instance_id',INSTANCE_ID).eq('order_id',ORDER_ID).maybeSingle(),
    ]);
    if(revokedEntitlementError||!revokedEntitlement||revokedEntitlement.status!=='revoked'||!revokedEntitlement.revoked_at||revokedEntitlement.revoked_reason!=='refunded'){
      throw revokedEntitlementError??new Error('ACCEPTANCE_ENTITLEMENT_REVOCATION_FAILED');
    }
    if(revokedGuestError||!revokedGuest||!revokedGuest.revoked_at)throw revokedGuestError??new Error('ACCEPTANCE_GUEST_TOKEN_REVOCATION_FAILED');

    let postRefundDenied=false;
    let postRefundReason='';
    try{
      await authorizeDigitalDownload({
        instanceId:INSTANCE_ID,orderId:ORDER_ID,assetId,customerId:null,guestToken:guest.token,
        requestFingerprint:digitalRequestFingerprint([INSTANCE_ID,ORDER_ID,assetId,'acceptance-post-refund']),
      });
    }catch(error){
      postRefundDenied=true;
      postRefundReason=errorMessage(error).slice(0,160);
    }
    if(!postRefundDenied)throw new Error('ACCEPTANCE_POST_REFUND_DOWNLOAD_UNEXPECTEDLY_ALLOWED');

    const{data:audit,error:auditError}=await admin.from('digital_download_audit')
      .select('actor_type,outcome,reason,request_fingerprint,created_at')
      .eq('instance_id',INSTANCE_ID).eq('order_id',ORDER_ID).eq('asset_id',assetId)
      .order('created_at',{ascending:true});
    if(auditError)throw auditError;
    const allowedAudit=(audit??[]).filter(row=>row.outcome==='allowed'&&row.actor_type==='guest'&&row.reason==='SIGNED_URL_ISSUED');
    if(allowedAudit.length!==1)throw new Error('ACCEPTANCE_DOWNLOAD_AUDIT_MISMATCH');

    const clearedConfig={...config};
    delete clearedConfig.acceptanceHarnessHash;
    delete clearedConfig.acceptanceHarnessPurpose;
    const{error:clearError}=await admin.from('webshop_instances').update({storefront_config:clearedConfig})
      .eq('id',INSTANCE_ID).eq('slug',INSTANCE_SLUG);
    if(clearError)throw clearError;

    return NextResponse.json({
      ok:true,
      evidence:{
        environment:'preview-staging',
        branch:process.env.VERCEL_GIT_COMMIT_REF,
        commit:process.env.VERCEL_GIT_COMMIT_SHA??null,
        instanceId:INSTANCE_ID,productId:PRODUCT_ID,variantId:VARIANT_ID,orderId:ORDER_ID,assetId,storagePath,
        upload:{signedUpload:true,activated:true,sizeBytes:fileBody.length,checksumSha256:checksum},
        purchase:{status:'paid',paidAtEvidence:true,entitlementActive:true},
        guest:{tokenPersistedAsHashOnly:true,useCountBeforeRefund:guestAccess.use_count},
        download:{httpStatus:response.status,checksumMatch:true,downloadCount:afterDownload.download_count,remainingDownloads:signed.remainingDownloads,auditAllowed:allowedAudit.length},
        refund:{status:'refunded',entitlementRevoked:true,guestTokenRevoked:true,postRefundDenied:true,postRefundReason},
        nonceConsumed:true,
      },
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(paid){
      await admin.rpc('transition_tenant_order_v1',{
        p_instance_id:INSTANCE_ID,p_order_id:ORDER_ID,p_actor:ACTOR_ID,p_target_status:'refunded',p_tracking_number:null,
      }).catch(()=>undefined);
    }
    if(activated){
      await admin.rpc('deactivate_digital_asset_v1',{
        p_instance_id:INSTANCE_ID,p_actor:ACTOR_ID,p_asset_id:assetId,
      }).catch(()=>undefined);
    }
    return NextResponse.json({ok:false,errorCode:'DIGITAL_COMMERCE_ACCEPTANCE_FAILED',detail:errorMessage(error).slice(0,240)},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
