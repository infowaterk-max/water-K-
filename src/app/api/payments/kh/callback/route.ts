import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordWebhookEvent } from '@/lib/integrations/outbox';

export async function POST(request: Request) {
  const khSecret = process.env.KH_SECRET ?? process.env.KH_API_SECRET;
  const payload = await request.text();
  const payloadHash = payload ? createHash('sha256').update(payload).digest('hex') : null;

  if (!process.env.KH_MERCHANT_ID || !khSecret) {
    await recordWebhookEvent({ provider:'kh', signatureValid:false, payloadHash, status:'rejected', errorMessage:'K&H nincs konfigurálva.' }).catch(()=>undefined);
    return NextResponse.json({ error: 'A K&H sandbox nincs konfigurálva.' }, { status: 503 });
  }
  if (!payload) {
    await recordWebhookEvent({ provider:'kh', signatureValid:false, status:'rejected', errorMessage:'Üres banki visszahívás.' }).catch(()=>undefined);
    return NextResponse.json({ error: 'Üres banki visszahívás.' }, { status: 400 });
  }

  // Fail-closed: amíg a hivatalos banki specifikáció szerinti aláírás/MAC
  // ellenőrzés nincs implementálva, egy callback sem módosíthat rendelési állapotot.
  await recordWebhookEvent({ provider:'kh', signatureValid:false, payloadHash, status:'rejected', errorMessage:'Callback hitelesítés még nincs aktiválva.' }).catch(()=>undefined);
  return NextResponse.json({ error: 'A K&H callback hitelesítése még nincs aktiválva.' }, { status: 501 });
}
