import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {CartStyleQuantityControl} from '@/components/commerce/cart-style-quantity-control';

describe('shared cart quantity touch contract',()=>{
  it('keeps both stepper buttons at least 32px and the remove control comfortably larger',()=>{
    const html=renderToStaticMarkup(
      <CartStyleQuantityControl
        quantity={2}
        minimumQuantity={1}
        ariaLabel="Teszt mennyiség"
        onIncrease={()=>undefined}
        onDecrease={()=>undefined}
        onRemove={()=>undefined}
      />,
    );
    expect(html).toContain('grid-template-rows:32px 32px');
    expect((html.match(/height:32px/g)??[]).length).toBeGreaterThanOrEqual(2);
    expect((html.match(/min-height:32px/g)??[]).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('width:36px;height:36px');
    expect(html).toContain('min-width:36px;min-height:36px');
  });
  it('keeps the decrease control visibly present but disabled at the minimum quantity',()=>{
    const html=renderToStaticMarkup(
      <CartStyleQuantityControl
        quantity={1}
        minimumQuantity={1}
        ariaLabel="Minimum mennyiség"
        onIncrease={()=>undefined}
        onDecrease={()=>undefined}
      />,
    );
    expect(html).toContain('data-cart-step="decrease"');
    expect(html).toContain('data-quantity-disabled-visible="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-cart-icon="chevron-down"');
    expect(html).toContain('opacity:0.55');
  });

});
