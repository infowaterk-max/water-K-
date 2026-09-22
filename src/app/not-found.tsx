import Link from 'next/link';
import {StorefrontContentShell} from '@/components/content/storefront-content-shell';

export default async function NotFound() {
  return (
    <StorefrontContentShell pageKey="not-found"><main className="section systemStatePage">
      <div className="shell">
        <section className="card systemStateCard">
          <span className="eyebrow">404</span>
          <h1 className="sectionTitle">Ezt az oldalt nem találjuk.</h1>
          <p className="lead">A hivatkozás megváltozhatott vagy az oldal már nem érhető el.</p>
          <div className="actions">
            <Link className="btn btnPrimary" href="/">Főoldal</Link>
            <Link className="btn btnGhost" href="/webaruhaz">Webáruház</Link>
          </div>
        </section>
      </div>
    </main></StorefrontContentShell>
  );
}
