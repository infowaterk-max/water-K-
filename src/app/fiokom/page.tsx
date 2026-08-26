import { AuthForm } from '@/components/auth/auth-form';
import { createClient } from '@/lib/supabase/server';

export default async function AccountPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 return <main className="section"><div className="shell"><span className="eyebrow">Water-K fiók</span><h1 className="sectionTitle">{user?'Fiókom':'Belépés vagy regisztráció'}</h1>{user?<div className="card"><h2>{user.email}</h2><p className="muted">Innen érheted majd el rendeléseidet, számlázási adataidat és viszonteladói státuszodat.</p></div>:<AuthForm/>}</div></main>;
}
