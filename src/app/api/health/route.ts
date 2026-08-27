import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
export const dynamic='force-dynamic';
export async function GET(){const started=Date.now();try{const admin=createAdminClient();const {error}=await admin.from('products').select('id').limit(1);if(error)throw error;return NextResponse.json({status:'ok',database:'ok',latencyMs:Date.now()-started,timestamp:new Date().toISOString()});}catch{return NextResponse.json({status:'degraded',database:'error',latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{status:503});}}