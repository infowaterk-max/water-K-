'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export function LogoutButton(){
  const router=useRouter(); const [busy,setBusy]=useState(false);
  async function logout(){setBusy(true);const supabase=createClient();await supabase.auth.signOut();router.refresh();router.push('/');}
  return <button className="btn btnGhost" type="button" disabled={busy} onClick={logout}>{busy?'Kilépés…':'Kijelentkezés'}</button>;
}
