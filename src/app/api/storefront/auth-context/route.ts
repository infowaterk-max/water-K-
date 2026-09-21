import{NextResponse}from'next/server';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

export const dynamic='force-dynamic';

export async function GET(){
 const instance=await getCurrentWebshopInstance();
 return NextResponse.json({instanceId:instance?.id??null},{headers:{'cache-control':'no-store'}});
}
