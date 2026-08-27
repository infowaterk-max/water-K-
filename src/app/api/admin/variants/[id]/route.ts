import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAudit } from '@/lib/admin/audit';

const nullablePrice=z.union([z.number().int().min(0).max(10000000),z.null()]).optional();
const bodySchema = z.object({
  stock: z.number().int().min(0).max(100000).optional(),
  grossPrice: z.number().int().min(0).max(10000000).optional(),
  netPrice: z.number().int().min(0).max(10000000).optional(),
  resellerGrossPrice: nullablePrice,
  resellerNetPrice: nullablePrice,
  unitCostNet: nullablePrice,
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Nincs módosítás.');

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAdminRequestUser();
  if (!actor) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Érvénytelen változatazonosító.' }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Érvénytelen termékadat.' }, { status: 400 });

  const admin = createAdminClient();
  const fields='stock_quantity,gross_price_huf,net_price_huf,reseller_gross_price_huf,reseller_net_price_huf,unit_cost_net_huf,active,sku,updated_at';
  const { data: current, error: currentError } = await admin.from('product_variants').select(fields).eq('id', id).maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: 'A termékváltozat nem található.' }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (parsed.data.stock !== undefined) update.stock_quantity = parsed.data.stock;
  if (parsed.data.grossPrice !== undefined) update.gross_price_huf = parsed.data.grossPrice;
  if (parsed.data.netPrice !== undefined) update.net_price_huf = parsed.data.netPrice;
  if (parsed.data.resellerGrossPrice !== undefined) update.reseller_gross_price_huf = parsed.data.resellerGrossPrice;
  if (parsed.data.resellerNetPrice !== undefined) update.reseller_net_price_huf = parsed.data.resellerNetPrice;
  if (parsed.data.unitCostNet !== undefined) update.unit_cost_net_huf = parsed.data.unitCostNet;
  if (parsed.data.active !== undefined) update.active = parsed.data.active;

  const { data: updated, error } = await admin.from('product_variants').update(update).eq('id', id).eq('updated_at',current.updated_at).select(fields).maybeSingle();
  if (error) return NextResponse.json({ error: 'A termék módosítása nem sikerült.' }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'A termékváltozat készlete vagy ára időközben megváltozott. Frissítsd az oldalt, ellenőrizd az aktuális adatokat, majd próbáld újra.' }, { status: 409 });

  if (parsed.data.stock !== undefined && parsed.data.stock !== current.stock_quantity) {
    await admin.from('inventory_events').insert({variant_id:id,change_quantity:parsed.data.stock-current.stock_quantity,previous_stock:current.stock_quantity,new_stock:parsed.data.stock,reason:'admin_adjustment',actor_user_id:actor.id,metadata:{sku:current.sku,previous_gross_price_huf:current.gross_price_huf,new_gross_price_huf:parsed.data.grossPrice??current.gross_price_huf}});
  }
  await recordAdminAudit({actorUserId:actor.id,action:'catalog.variant_updated',entityType:'product_variant',entityId:id,summary:`${current.sku} termékváltozat módosítva`,beforeState:current,afterState:updated,metadata:{fields:Object.keys(update)}});
  return NextResponse.json({ ok: true });
}
