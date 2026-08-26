import { requireAdmin } from '@/lib/auth/require-admin';

export default async function OrdersAdmin() {
  await requireAdmin();

  return (
    <main className="section">
      <div className="shell">
        <span className="eyebrow">Adminisztráció</span>
        <h1 className="sectionTitle">Rendelések</h1>
        <div className="card">
          <div className="adminToolbar">
            <strong>Rendelési központ</strong>
            <span className="badge">Supabase bekötésre kész</span>
          </div>
          <p className="muted">
            Itt kezeljük majd a beérkezett, fizetésre váró, fizetett, csomagolás alatt, átadott és teljesített rendeléseket.
          </p>
        </div>
      </div>
    </main>
  );
}
