import Link from 'next/link';

export default function NotFound() {
  return <main className="section"><div className="shell confirmationShell"><span className="eyebrow">404</span><h1 className="sectionTitle">Ez az oldal nem található.</h1><p className="lead">Lehet, hogy a termék vagy az oldal címe megváltozott.</p><div className="actions"><Link className="btn btnPrimary" href="/webaruhaz">Webáruház</Link><Link className="btn btnGhost" href="/">Főoldal</Link></div></div></main>;
}
