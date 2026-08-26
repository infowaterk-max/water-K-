import { NextResponse } from 'next/server';

export async function GET() {
  const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const khSecret = process.env.KH_SECRET ?? process.env.KH_API_SECRET;

  return NextResponse.json({
    ok: true,
    service: 'waterk-store',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabasePublicKey),
    khConfigured: Boolean(process.env.KH_MERCHANT_ID && khSecret),
  });
}
