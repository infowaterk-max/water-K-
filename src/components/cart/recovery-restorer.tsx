'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { CartItem } from '@/lib/cart/types';
import { useCart } from '@/components/cart/cart-provider';

export function RecoveryRestorer({items}:{items:CartItem[]}){
  const {replace}=useCart();
  const restored=useRef(false);
  useEffect(()=>{if(restored.current)return;restored.current=true;replace(items);},[items,replace]);
  return <div className="card"><span className="eyebrow">Kosár helyreállítva</span><h2>{items.length} termék visszakerült a kosaradba.</h2><p className="muted">Az aktuális árakat és elérhetőséget a rendszer frissen ellenőrizte. A rendelést ott folytathatod, ahol abbahagytad.</p><div className="actions"><Link className="btn btnPrimary" href="/kosar">Kosár megnyitása</Link><Link className="btn btnGhost" href="/webaruhaz">Tovább vásárolok</Link></div></div>;
}
