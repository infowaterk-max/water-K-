import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';
import{CANONICAL_ACCOUNT_CAPABILITIES}from'@/lib/account/account-capabilities';

const read=(path:string)=>readFileSync(path,'utf8');

describe('account collection authority',()=>{
  it('keeps Collection separate from Wishlist in canonical account IA',()=>{
    const wishlist=CANONICAL_ACCOUNT_CAPABILITIES.find(item=>item.key==='wishlist');
    const collection=CANONICAL_ACCOUNT_CAPABILITIES.find(item=>item.key==='collection');
    expect(wishlist?.href).toBe('/fiokom/kivansaglista');
    expect(collection?.href).toBe('/fiokom/gyujtemenyem');
    expect(collection?.href).not.toBe(wishlist?.href);
  });

  it('derives owned state from authenticated order history, never wishlists',()=>{
    const page=read('src/app/fiokom/gyujtemenyem/page.tsx');
    expect(page).toContain(".from('orders')");
    expect(page).toContain(".from('order_items')");
    expect(page).toContain("OWNED_ORDER_STATUSES=['paid','processing','shipped','completed']");
    expect(page).toContain('ownedVariantIds.has(product.id)');
    expect(page).not.toContain(".from('wishlists')");
  });

  it('keeps mobile Collection at two tiles per row with clear owned and missing states',()=>{
    const css=read('src/app/globals.css');
    const grid=read('src/components/account/account-collection-grid.tsx');
    expect(css).toContain('@media(max-width:620px)');
    expect(css).toContain('.accountCollectionGrid{grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(grid).toContain("data-owned={item.owned?'true':'false'}");
    expect(grid).toContain("item.owned?'Megvan':'Még hiányzik'");
  });
});
