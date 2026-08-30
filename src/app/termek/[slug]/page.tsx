import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { EngagementPanel } from '@/components/catalog/engagement-panel';
import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceAccess } from '@/lib/commerce/access';

type Params={params:Promise<{slug:string}>;searchParams:Promise<{notify?:string;review?:string}>};

export async function generateMetadata({params}:Params):Promise<Metadata>{
  const {slug}=await params; const products=await getProducts(); const product=products.find(item=>item.slug===slug);
  if(!product) return {title:'Termék nem található',robots:{index:false,follow:false}};
  return {title:product.name,description:product.short,alternates:{canonical:`/termek/${product.slug}`},openGraph:{title:`${product.name} | Water-K`,description:product.short,url:`/termek/${product.slug}`,type:'website'}};
}

export default async function ProductPage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params,searchParams]);
  const [products, access] = await Promise.all([getProducts(), getCommerceAccess()]);
  const product = products.find((item)=>item.slug===slug);
  if(!product) notFound();
  const alternatives=products.filter((item)=>item.id!==product.id);
  const partnerLocked=product.audience==='professional'&&!access.resellerApproved;
  const base=(process.env.NEXT_PUBLIC_SITE_URL??'https://water-k-native.vercel.app').replace(/\/$/,'');
  const structuredData={'@context':'https://schema.org','@type':'Product',name:product.name,sku:product.sku,description:product.short,brand:{'@type':'Brand',name:'Water-K'},offers:{'@type':'Offer',url:`${base}/termek/${product.slug}`,priceCurrency:'HUF',price:String(product.grossPrice),availability:product.stock>0?'https://schema.org/InStock':'https://schema.org/OutOfStock',itemCondition:'https://schema.org/NewCondition'}};
  const notifyMessage=query.notify==='ok'?'Rendben, értesítünk, amikor a termék újra elérhető.':query.notify==='rate-limited'?'Túl sok értesítési kérés érkezett rövid időn belül. Próbáld meg később.':query.notify==='invalid'?'Kérlek, adj meg érvényes e-mail címet.':query.notify==='error'?'Az értesítés mentése most nem sikerült. Próbáld meg később.':null;
  return <main className="section productPage"><div className="shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/>
    {notifyMessage&&<p className="notice" role="status">{notifyMessage}</p>}
    <div className="productHero"><section className="productStage"><div className="productPack largePack"><small>WATER-K</small><strong>{product.size}</strong><span>vízmegtartó technológia</span></div><div className="floatingFacts"><span>9% K</span><span>Akár 3 év</span><span>≤50 ciklus</span></div></section>
      <section className="productInfo"><span className="eyebrow">Water-K · {product.audience==='professional'?'viszonteladói':'lakossági'} kiszerelés</span><h1 className="sectionTitle">{product.name}</h1><p className="lead">{product.short}</p><div className="tagRow productTags">{product.useCases.map(x=><span key={x}>{x}</span>)}</div><div className="productPriceBlock"><div className="price">{formatHuf(product.grossPrice)}</div><p className="muted">Nettó {formatHuf(product.netPrice)} · {product.stock>0?`raktáron: ${product.stock} db`:'jelenleg nem elérhető'}</p></div>
        <div className="actions productActions">{partnerLocked?<Link className="btn btnPrimary" href="/fiokom">{access.signedIn?'Viszonteladói jóváhagyás szükséges':'Viszonteladói fiók létrehozása'}</Link>:<AddToCart id={product.id} slug={product.slug} name={product.name} price={product.grossPrice}/>}<Link className="btn btnGhost" href="/kosar">Kosár megnyitása</Link></div>
        {partnerLocked&&<p className="notice">A 25 kg-os partnerkiszerelést csak jóváhagyott viszonteladói fiókkal lehet megrendelni.</p>}<div className="purchaseTrust"><span>✓ Adatbázisból validált ár</span><span>✓ Készletfoglalás rendeléskor</span><span>✓ Magyar checkout</span></div></section></div>
    <section className="section productDetailsSection"><div className="detailGrid"><article className="card"><span className="stepIndex">01</span><h2>Hová való?</h2><p className="muted">{product.useCases.join(', ')}. A Water-K a gyökérzóna közelébe dolgozva fejti ki vízmegtartó funkcióját.</p></article><article className="card"><span className="stepIndex">02</span><h2>Mit tud?</h2><ul className="featureList">{product.highlights.map(x=><li key={x}>{x}</li>)}<li>9% káliumtartalom</li><li>Többszöri nedvesedési ciklus</li></ul></article><article className="card"><span className="stepIndex">03</span><h2>Hogyan használd?</h2><p className="muted">Talajba dolgozás után alapos beöntözés szükséges. A pontos dózis a felhasználási területhez igazítandó.</p></article></div></section>
    <EngagementPanel variantId={product.id} slug={product.slug} stock={product.stock}/>
    <section className="selectionHelp productAlternatives"><div><span className="eyebrow">Másik méret?</span><h2>Hasonlítsd össze a kiszereléseket.</h2></div><div className="alternativeRow">{alternatives.map(item=><Link className="alternativeCard" key={item.id} href={`/termek/${item.slug}`}><span>{item.name}</span><strong>{formatHuf(item.grossPrice)}</strong><small>{item.short}</small></Link>)}</div></section>
  </div></main>;
}
