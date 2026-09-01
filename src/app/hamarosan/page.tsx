import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata:Metadata={title:'Hamarosan nyitunk',robots:{index:false,follow:false}};
export default function StorefrontClosed(){return <main className="section systemStatePage"><div className="shell"><section className="card systemStateCard"><span className="eyebrow">Shoperation</span><h1 className="sectionTitle">Ez a webshop még nem nyitott meg.</h1><p className="lead">A tulajdonos jelenleg az előnézetet és az indulási beállításokat ellenőrzi. A nyilvános vásárlás csak a kifejezett megnyitás után válik elérhetővé.</p><div className="actions"><Link className="btn btnGhost" href="/fiokom">Üzemeltetői belépés</Link></div></section></div></main>}
