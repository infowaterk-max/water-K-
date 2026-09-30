import{createHash}from'node:crypto';import{readFileSync}from'node:fs';import{join}from'node:path';import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const flatten=(nodes:any[]):any[]=>nodes.flatMap(node=>[node,...flatten(node.children??[])]);
describe('Loot Vault v2 polish contract',()=>{
 it('keeps all representative media package-owned WebP files with physical diversity',()=>{
  const pkg=JSON.parse(read('src/lib/builder/templates/gaming/loot-vault/v2/canonical-package.json'));
  const nodes=pkg.pages.flatMap((page:any)=>flatten(page.sections??[]));
  const media=nodes.filter((node:any)=>node.componentKey==='content.image').map((node:any)=>String(node.config?.src??'')).filter(Boolean);
  expect(media.length).toBeGreaterThanOrEqual(20);
  expect(media.every((src:string)=>src.startsWith('/storefront-demo/loot-vault-v2/')&&(src.endsWith('.webp')||src.endsWith('brand-mark.svg')))).toBe(true);
  const usage=new Map<string,number>();for(const src of media)usage.set(src,(usage.get(src)??0)+1);
  expect(new Set(media).size).toBeGreaterThanOrEqual(14);
  expect(Math.max(...usage.values())).toBeLessThanOrEqual(2);
  const home=pkg.pages.find((page:any)=>page.pageType==='home');
  const homeNodes=flatten(home.sections??[]);
  const universe=homeNodes.filter((node:any)=>/^loot-vault-loot-v2-universe-\d+-image$/.test(node.id)).map((node:any)=>String(node.config.src));
  const hash=(src:string)=>createHash('sha256').update(readFileSync(join(process.cwd(),'public',src))).digest('hex');
  expect(new Set(universe.map(hash)).size).toBe(6);
  const grid=homeNodes.find((node:any)=>node.id==='loot-vault-loot-v2-product-grid');
  const products=(grid?.config?.products??[]).map((p:any)=>String(p.image??''));
  expect(new Set(products.map(hash)).size).toBe(4);
  const catalog=pkg.pages.find((page:any)=>page.pageType==='catalog'),catalogNodes=flatten(catalog.sections??[]);
  const catalogGrid=catalogNodes.find((node:any)=>node.id==='loot-vault-loot-v2-catalog-products'),catalogProducts=catalogGrid?.config?.products??[];
  expect(catalogProducts).toHaveLength(6);expect(new Set(catalogProducts.map((p:any)=>String(p.image??''))).size).toBe(6);
  const productPage=pkg.pages.find((page:any)=>page.pageType==='product'),productNodes=flatten(productPage.sections??[]);
  const gallery=productNodes.find((node:any)=>node.id==='loot-vault-loot-v2-product-gallery'),galleryImages=(gallery?.config?.images??[]).map((item:any)=>String(item.src??''));
  expect(galleryImages).toHaveLength(4);expect(new Set(galleryImages).size).toBe(4);
  const demo=read('src/lib/builder/storefront-template-preview-demo.ts'),start=demo.indexOf('const LOOT_VAULT_PREVIEW_PRODUCTS'),end=demo.indexOf('const LOOT_VAULT_PREVIEW_VARIANTS');
  const previewProductImages=[...demo.slice(start,end).matchAll(/image:'([^']+)'/g)].map(match=>match[1]);
  expect(previewProductImages).toHaveLength(6);expect(new Set(previewProductImages).size).toBe(6);
 });
 it('locks the two CTA families and strong gold checkout selection',()=>{
  const pkg=JSON.parse(read('src/lib/builder/templates/gaming/loot-vault/v2/canonical-package.json'));
  const buttons=pkg.pages.flatMap((p:any)=>flatten(p.sections??[])).filter((n:any)=>n.componentKey==='content.button');
  expect(buttons.every((n:any)=>n.config?.variant==='primary'||n.config?.variant==='secondary')).toBe(true);
  expect(buttons.filter((n:any)=>n.config.variant==='primary').every((n:any)=>String(n.config.style?.background).includes('#D8A14C'))).toBe(true);
  expect(buttons.filter((n:any)=>n.config.variant==='secondary').every((n:any)=>n.config.style?.background==='#111416')).toBe(true);
  expect(read('src/components/checkout/checkout-guided.module.css')).toContain('border:2px solid var(--checkout-primary)');
 });
 it('bridges account/cart legacy variables and removes the bright legacy delete treatment',()=>{
  const account=read('src/components/account/storefront-account-shell.tsx'),cart=read('src/components/cart/cart-view.tsx'),qty=read('src/components/commerce/cart-style-quantity-control.tsx');
  expect(account).toContain("'--card':'var(--shoporation-color-surface)'");expect(account).toContain("'--green':'var(--shoporation-color-primary)'");
  expect(cart).toContain('className="btn btnGhost" href="/webaruhaz"');expect(cart).toContain('className="btn btnGhost" type="button" onClick={applyCoupon}');
  expect(cart).toContain('className="btn btnPrimary cartCheckoutButton"');expect(qty).not.toContain("background:'#cf3038'");
 });
});
