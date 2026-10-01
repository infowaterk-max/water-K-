import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('STRESS: learned cart product image regression remains protected',()=>{
  it('renders the CartItem image instead of replacing every product with initials',()=>{
    const source=readFileSync('src/components/cart/cart-view.tsx','utf8');
    expect(source).toContain('item.image');
    expect(source).toMatch(/<img\b/);
    expect(source).not.toContain("item.name.trim().slice(0,2).toUpperCase()");
  });
});
