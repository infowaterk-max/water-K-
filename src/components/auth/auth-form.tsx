'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function AuthForm(){
 const [mode,setMode]=useState<'login'|'register'>('login'); const [message,setMessage]=useState('');
 async function submit(formData:FormData){ const supabase=createClient(); const email=String(formData.get('email')); const password=String(formData.get('password')); setMessage('');
  const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
  if(result.error){setMessage(result.error.message);return;} setMessage(mode==='login'?'Sikeres bejelentkezés.':'Regisztráció elküldve. Ellenőrizd az e-mail-fiókodat.');
 }
 return <div className="card"><div className="authTabs"><button onClick={()=>setMode('login')}>Bejelentkezés</button><button onClick={()=>setMode('register')}>Regisztráció</button></div><form action={submit} className="checkoutForm"><label>E-mail<input name="email" type="email" required/></label><label>Jelszó<input name="password" type="password" minLength={8} required/></label><button className="button" type="submit">{mode==='login'?'Belépés':'Fiók létrehozása'}</button>{message&&<p>{message}</p>}</form></div>;
}
