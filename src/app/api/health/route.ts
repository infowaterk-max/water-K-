import { NextResponse } from 'next/server';

export async function GET() {
  const supabasePublicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServerKey=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
  const khSecret=process.env.KH_SECRET??process.env.KH_API_SECRET;
  return NextResponse.json({
    ok:true,
    service:'waterk-store',
    environment:process.env.VERCEL_ENV??process.env.NODE_ENV??'unknown',
    supabasePublicConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&supabasePublicKey),
    supabaseServerConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&supabaseServerKey),
    khConfigured:Boolean(process.env.KH_MERCHANT_ID&&khSecret),
    foxpostConfigured:Boolean(process.env.FOXPOST_API_KEY),
    glsConfigured:Boolean(process.env.GLS_USERNAME&&process.env.GLS_PASSWORD),
    mplConfigured:Boolean(process.env.MPL_API_KEY),
  });
}
