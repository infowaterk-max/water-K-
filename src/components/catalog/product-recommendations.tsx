'use client';

import { useMemo } from 'react';
import { useCart } from '@/components/cart/cart-provider';
import { useAnalytics } from '@/components/analytics/analytics-provider';
import { formatHuf, type Product } from '@/lib/catalog';

type Props={products:Product[];context?:'cart'|'confirmation'};

export function ProductRecommendations({products,context='cart'}:Props){
 const {items,add}=useCart(); const {track}=useAnalytics();
 const recommendations=useMemo(()=>products.filter(product=>product.stock>0&&!items.some(item=>item.productId===product.id)).slice(0,3),[products,items]);
 if(!recommendations.length)return null;
 return <section className="featurePanel recommendationPanel"><div className="sectionIntro"><div><span className="eyebrow">{context==='confirmation'?'Még hasznos lehet':'Gyakran együtt választják'}</span><h2>{context==='confirmation'?'Egészítsd ki a következő rendelésed.':'Egészítsd ki a kosarad.'}</h2><p className="muted">A rendszer csak raktáron lévő, a kosaradban még nem szereplő termékeket ajánl.</p></div></div><div className="cards recommendationGrid">{recommendations.map(product=><article className="card" key={product.id}><span className="badge">{product.size}</span><h3>{product.name}</h3><p className="muted">{product.short}</p><strong className="price">{formatHuf(product.grossPrice)}</strong><button className="btn btnGhost" type="button" onClick={()=>{add({productId:product.id,slug:product.slug,name:product.name,unitPrice:product.grossPrice,quantity:1});track('select_item',{item_id:product.id,item_name:product.name,item_list_name:context==='cart'?'cart_cross_sell':'post_purchase_offer',value:product.grossPrice,currency:'HUF'});track('add_to_cart',{item_id:product.id,item_name:product.name,value:product.grossPrice,currency:'HUF'});}}>{context==='confirmation'?'Kosárba a következő vásárláshoz':'Kosárhoz adom'}</button></article>)}</div></section>;
}
