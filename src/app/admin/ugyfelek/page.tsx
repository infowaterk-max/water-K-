import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminCustomersPage() {
  await requireAdmin();

  return (
    <main className="adminMain">
      <span className="eyebrow">Admin · Ügyfelek</span>
      <h1 className="sectionTitle">Ügyfelek</h1>
      <div className="card">
        <h2>Ügyfélkezelés</h2>
        <p className="muted">A Supabase profil- és viszonteladói adatok bekötése után itt jelennek meg az ügyfelek és jóváhagyási státuszaik.</p>
      </div>
    </main>
  );
}
