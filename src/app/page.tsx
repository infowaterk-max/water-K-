import Link from 'next/link';
import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';

const benefits = [
  ['Víz a gyökérzónában', 'A technológia célja, hogy a rendelkezésre álló nedvességet tovább a növény közelében tartsa.'],
  ['9% káliumtartalom', 'A Water-K vízmegtartó funkciója mellett káliumtartalommal is rendelkezik.'],
  ['Többszöri ciklus', 'Nedvesedés és kiszáradás során ismételten képes vizet felvenni és leadni.'],
];
const useCases = ['Dísznövény','Gyep','Kert és ágyás','Faültetés','Kertészet'];

export default async function HomePage() {
  const products = await getProducts();
  const featured = products.find((product)=>product.featured) ?? products[0];
  return <main>
    <section className="hero heroV2"><div className="shell heroGrid"><div className="heroCopy"><span className="eyebrow">Water-K · intelligensebb vízhasználat</span><h1>Több víz a növénynek. Kevesebb veszteség.</h1><p className="lead">Káliumtartalmú vízmegtartó polimer kertészethez, dísznövényhez, gyephez és fákhoz. Modern, közvetlen Water-K vásárlási élménnyel.</p><div className="actions"><Link className="btn btnPrimary" href="/webaruhaz">Kiszerelések megtekintése</Link><a className="btn btnGhost" href="#hogyan-mukodik">Hogyan működik?</a></div><div className="heroProof"><span><strong>9%</strong> K</span><span><strong>akár 3 év</strong> hatástartam</span><span><strong>≤50</strong> nedvesedési ciklus</span></div></div>
      {featured&&<aside className="productSpotlight"><span className="badge">Ajánlott kiszerelés</span><div className="productOrb"><span>WATER-K</span><strong>{featured.size}</strong></div><h2>{featured.name}</h2><p className="muted">{featured.short}</p><div className="spotlightPrice">{formatHuf(featured.grossPrice)}</div><Link className="btn btnPrimary" href={`/termek/${featured.slug}`}>Megnézem</Link></aside>}
    </div></section>
    <section className="useCaseStrip" aria-label="Felhasználási területek"><div className="shell useCaseRow">{useCases.map(item=><span key={item}>{item}</span>)}</div></section>
    <section className="section" id="hogyan-mukodik"><div className="shell"><div className="sectionIntro"><div><span className="eyebrow">A technológia</span><h2 className="sectionTitle">Vízraktár ott, ahol számít.</h2></div><p className="lead">A Water-K a gyökérzónába dolgozva segít a víz helyben tartásában. A cél, hogy a termék kiválasztásától a használatig minden érthető legyen.</p></div><div className="cards benefitCards">{benefits.map(([title,text],index)=><article className="card" key={title}><span className="stepIndex">0{index+1}</span><h3>{title}</h3><p className="muted">{text}</p></article>)}</div></div></section>
    <section className="section toneSection"><div className="shell"><div className="sectionIntro"><div><span className="eyebrow">Válassz méretet</span><h2 className="sectionTitle">Három kiszerelés. Egy technológia.</h2></div><Link className="textLink" href="/webaruhaz">Teljes webáruház →</Link></div><div className="cards productCards">{products.map(product=><article key={product.id} className={`card productCard ${product.featured?'isFeatured':''}`}><div className="productCardTop"><span className="badge">{product.featured?'Legnépszerűbb':product.audience==='professional'?'Viszonteladói':'Water-K'}</span><span className={`stockDot ${product.stock===0?'outOfStock':''}`}>{product.stock>0?'Raktáron':'Elfogyott'}</span></div><div className="miniProductOrb">{product.size}</div><h3>{product.name}</h3><p className="muted">{product.short}</p><div className="tagRow">{product.useCases.slice(0,3).map(x=><span key={x}>{x}</span>)}</div><div className="price">{formatHuf(product.grossPrice)}</div><p className="muted priceMeta">Bruttó ár · nettó {formatHuf(product.netPrice)}</p><Link className="btn btnPrimary" href={`/termek/${product.slug}`}>Részletek és vásárlás</Link></article>)}</div></div></section>
    <section className="section"><div className="shell splitFeature"><div className="featurePanel darkPanel"><span className="eyebrow">Saját webshop</span><h2>Nem sablon. Nem WordPress. Water-K.</h2><p>A termék-, kosár-, rendelés-, fizetési és szállítási rendszer saját architektúrán fut.</p></div><div className="featurePanel"><span className="eyebrow">Vásárlási folyamat</span><h2>Kevesebb súrlódás, több bizalom.</h2><ul className="featureList"><li>Élő bruttó és nettó ár</li><li>Valós készletellenőrzés</li><li>Közvetlen K&H és futár API adapterek</li><li>Lakossági, céges és viszonteladói fiókok</li></ul></div></div></section>
    <section className="section finalCta"><div className="shell ctaPanel"><div><span className="eyebrow">Water-K webáruház</span><h2>Válaszd ki a neked megfelelő kiszerelést.</h2></div><Link className="btn btnPrimary" href="/webaruhaz">Irány a webáruház</Link></div></section>
  </main>;
}
