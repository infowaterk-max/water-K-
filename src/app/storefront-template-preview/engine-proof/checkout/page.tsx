import {redirect} from 'next/navigation';
import {startPlatformPilotAcceptanceAction} from '@/lib/builder/storefront-pilot-acceptance-action';
import {requirePlatformOperator} from '@/lib/auth/platform-operator';
import {createAdminClient} from '@/lib/supabase/admin';

export const dynamic='force-dynamic';

export default async function SharedCheckoutEngineProofEntry(){
  if(process.env.VERCEL_ENV!=='preview')redirect('/');
  await requirePlatformOperator();

  const admin=createAdminClient();
  const{data,error}=await admin
    .from('webshop_instances')
    .select('id,status,storefront_config')
    .eq('status','pilot')
    .contains('storefront_config',{acceptance:'digital-commerce-guest-matrix'})
    .limit(2);

  if(error||!data||data.length!==1){
    return <main className="adminMain" data-engine-functional-proof="E13">
      <span className="eyebrow">Shared E13 · Checkout acceptance</span>
      <h1 className="sectionTitle">A funkcionális checkout proof nem indítható.</h1>
      <div className="errorNotice" role="alert">
        <strong>ENGINE_FUNCTIONAL_ACCEPTANCE_TARGET_AMBIGUOUS</strong><br/>
        Pontosan egy, explicit digital-commerce-guest-matrix markerrel ellátott pilot acceptance tenant szükséges.
      </div>
    </main>;
  }

  const instanceId=String(data[0]!.id);
  return <main className="adminMain" data-engine-functional-proof="E13" data-acceptance-instance-id={instanceId}>
    <span className="eyebrow">Shared E13 · Checkout acceptance</span>
    <h1 className="sectionTitle">Valódi shared checkout engine proof</h1>
    <p className="lead">A proof a meglévő signed pilot acceptance sessiont és a valódi /penztar runtime-ot használja. Nem hoz létre külön checkout motort.</p>
    <form action={startPlatformPilotAcceptanceAction}>
      <input type="hidden" name="instanceId" value={instanceId}/>
      <input type="hidden" name="flow" value="checkout"/>
      <button className="btn btnPrimary" type="submit">E13 checkout proof indítása</button>
    </form>
  </main>;
}
