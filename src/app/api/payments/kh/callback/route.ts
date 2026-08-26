import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  const payload = await request.text();
  if (!payload) return NextResponse.json({ error: 'Üres banki visszahívás.' }, { status: 400 });
  // TODO with official K&H docs: verify signature/MAC, resolve transaction idempotently, mark order paid only after server-side verification.
  return NextResponse.json({ received: true });
}
