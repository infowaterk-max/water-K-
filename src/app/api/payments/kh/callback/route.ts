import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const khSecret = process.env.KH_SECRET ?? process.env.KH_API_SECRET;

  if (!process.env.KH_MERCHANT_ID || !khSecret) {
    return NextResponse.json({ error: 'A K&H sandbox nincs konfigurálva.' }, { status: 503 });
  }

  const payload = await request.text();
  if (!payload) {
    return NextResponse.json({ error: 'Üres banki visszahívás.' }, { status: 400 });
  }

  // Biztonsági fail-closed állapot: amíg a hivatalos K&H szerződés szerinti
  // aláírás/MAC ellenőrzés nincs implementálva, callback nem módosíthat rendelést.
  return NextResponse.json(
    { error: 'A K&H callback hitelesítése még nincs aktiválva.' },
    { status: 501 },
  );
}
