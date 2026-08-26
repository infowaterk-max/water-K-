import { AuthForm } from '@/components/auth/auth-form';
import { createClient } from '@/lib/supabase/server';

export default async function AccountPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  if (!configured) {
    return (
      <main className="section">
        <div className="shell">
          <span className="eyebrow">Water-K fiók</span>
          <h1 className="sectionTitle">Belépés és regisztráció</h1>
          <div className="card">
            <h2>A fiókrendszer még nincs összekötve a staging adatbázissal.</h2>
            <p className="muted">
              A webshop többi része ettől még tesztelhető. A Supabase környezeti változók bekötése után itt aktiválódik a bejelentkezés és a regisztráció.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="section">
      <div className="shell">
        <span className="eyebrow">Water-K fiók</span>
        <h1 className="sectionTitle">{user ? 'Fiókom' : 'Belépés vagy regisztráció'}</h1>
        {user ? (
          <div className="card">
            <h2>{user.email}</h2>
            <p className="muted">Innen érheted majd el rendeléseidet, számlázási adataidat és viszonteladói státuszodat.</p>
          </div>
        ) : <AuthForm />}
      </div>
    </main>
  );
}
