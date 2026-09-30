import{readFileSync}from'node:fs';import{join}from'node:path';import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const flatten=(nodes:any[]):any[]=>nodes.flatMap(node=>[node,...flatten(node.children??[])]);
describe('Loot Vault v2 polish contract',()=>{
 it('uses package-owned vector media and no legacy placeholder media',()=>{
  const raw=read('src/lib/builder/templates/gaming/loot-vault/v2/canonical-package.json'),pkg=JSON.parse(raw);
  const images=pkg.pages.flatMap((p:any)=>flatten(p.sections??[])).filter((n:any)=>n.componentKey==='content.image').map((n:any)=>n.config?.src).filter(Boolean);
  expect(images.length).toBeGreaterThanOrEqual(20);expect(new Set(images).size).toBe(images.length);
  expect(images.every((s:string)=>s.startsWith('/storefront-demo/loot-vault-v2/')&&s.endsWith('.svg'))).toBe(true);
  expect(raw).not.toContain('.webp');
 });
 it('locks primary/secondary CTA authority and strong active checkout selection',()=>{
  const pkg=JSON.parse(read('src/lib/builder/templates/gaming/loot-vault/v2/canonical-package.json'));
  const buttons=pkg.pages.flatMap((p:any)=>flatten(p.sections??[])).filter((n:any)=>n.componentKey==='content.button');
  expect(buttons.every((n:any)=>n.config?.variant==='primary'||n.config?.variant==='secondary')).toBe(true);
  expect(buttons.filter((n:any)=>n.config.variant==='primary').every((n:any)=>String(n.config.style?.background).includes('#D8A14C'))).toBe(true);
  expect(buttons.filter((n:any)=>n.config.variant==='secondary').every((n:any)=>n.config.style?.background==='#111416')).toBe(true);
  expect(read('src/components/checkout/checkout-guided.module.css')).toContain('border:2px solid var(--checkout-primary)');
 });
 it('bridges account/cart legacy variables and removes bright legacy delete treatment',()=>{
  const account=read('src/components/account/storefront-account-shell.tsx'),cart=read('src/components/cart/cart-view.tsx'),qty=read('src/components/commerce/cart-style-quantity-control.tsx');
  expect(account).toContain("'--card':'var(--shoporation-color-surface)'");expect(account).toContain("'--green':'var(--shoporation-color-primary)'");
  expect(cart).toContain('className="btn btnGhost" href="/webaruhaz"');expect(cart).toContain('className="btn btnGhost" type="button" onClick={applyCoupon}');
  expect(cart).toContain('className="btn btnPrimary cartCheckoutButton"');expect(qty).not.toContain("background:'#cf3038'");
 });
});
