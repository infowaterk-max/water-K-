'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="section"><div className="shell confirmationShell"><span className="eyebrow">Hiba</span><h1 className="sectionTitle">Valami nem sikerült.</h1><p className="lead">A webshop nem veszítette el a rendelésedet automatikusan. Próbáld újra a műveletet.</p><button className="btn btnPrimary" onClick={() => reset()}>Újrapróbálom</button></div></main>;
}
