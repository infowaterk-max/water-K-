'use client';
import Link from 'next/link';

export function AddToCartConfirmation({open,productName,onClose}:{open:boolean;productName:string;onClose:()=>void}){
 if(!open)return null;
 return <aside className="storefrontCartConfirmation" role="status" aria-live="polite" aria-atomic="true" data-storefront-cart-confirmation="shared-v1">
  <div className="storefrontCartConfirmationHead"><div><strong>A termék a kosárba került.</strong><span>{productName}</span></div><button type="button" onClick={onClose} aria-label="Kosárértesítés bezárása">×</button></div>
  <div className="storefrontCartConfirmationActions"><Link href="/kosar" className="storefrontCartConfirmationPrimary">Kosár megnyitása</Link><button type="button" onClick={onClose}>Tovább vásárolok</button></div>
  <style jsx>{`
    .storefrontCartConfirmation{position:fixed;left:50%;top:50%;right:auto;bottom:auto;transform:translate(-50%,-50%);z-index:1200;width:min(32rem,calc(100vw - 2rem));padding:1rem;background:var(--shoporation-color-surface,#fff);color:var(--shoporation-color-text,#111827);border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:var(--shoporation-radius-m,.9rem);box-shadow:0 22px 70px rgba(0,0,0,.32)}
    .storefrontCartConfirmationHead{display:flex;gap:1rem;align-items:flex-start;justify-content:space-between}.storefrontCartConfirmationHead div{display:grid;gap:.2rem}.storefrontCartConfirmationHead strong{font-size:1rem}.storefrontCartConfirmationHead span{font-size:.82rem;color:var(--shoporation-color-muted-text,#6b7280)}
    .storefrontCartConfirmationHead button,.storefrontCartConfirmationActions button,.storefrontCartConfirmationActions :global(a){min-height:44px;border-radius:var(--shoporation-radius-s,.65rem);font:inherit;font-weight:800;cursor:pointer}
    .storefrontCartConfirmationHead button{min-width:44px;border:1px solid var(--shoporation-color-border,#d1d5db);background:transparent;color:inherit;font-size:1.25rem}
    .storefrontCartConfirmationActions{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-top:.9rem}.storefrontCartConfirmationActions button,.storefrontCartConfirmationActions :global(a){display:grid;place-items:center;padding:.65rem .8rem;text-decoration:none;border:1px solid var(--shoporation-color-border,#d1d5db);background:transparent;color:inherit}
    .storefrontCartConfirmationActions :global(.storefrontCartConfirmationPrimary){background:var(--shoporation-color-primary,#2563eb);border-color:var(--shoporation-color-primary,#2563eb);color:var(--shoporation-color-primary-contrast,#fff)}
    @media(max-width:767px){.storefrontCartConfirmation{left:.75rem;right:.75rem;top:auto;bottom:.75rem;transform:none;width:auto}.storefrontCartConfirmationActions{grid-template-columns:1fr}}
  `}</style>
 </aside>;
}
