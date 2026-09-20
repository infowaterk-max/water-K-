'use client';

type QuantityControlContract='cart'|'rfq';

export function CartTrashIcon(){
  return <svg data-cart-icon="trash" aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style={{display:'block',flex:'0 0 auto'}}><path d="M7 2h6l1 2h3v2H3V4h3l1-2Zm-2 5h10l-.78 10.12A2 2 0 0 1 12.23 19H7.77a2 2 0 0 1-1.99-1.88L5 7Zm3 2v6h1.5V9H8Zm2.5 0v6H12V9h-1.5Z"/></svg>;
}

export function CartChevronIcon({direction}:{direction:'up'|'down'}){
  return <svg data-cart-icon={`chevron-${direction}`} aria-hidden="true" viewBox="0 0 14 8" width="14" height="8" fill="currentColor" style={{display:'block',flex:'0 0 auto'}}><path d={direction==='up'?'M7 1 13 7H1L7 1Z':'M1 1h12L7 7 1 1Z'}/></svg>;
}

export function CartStyleQuantityControl({
  quantity,
  minimumQuantity,
  ariaLabel,
  onIncrease,
  onDecrease,
  onRemove,
  disabled=false,
  contract='cart',
}:{
  quantity:number;
  minimumQuantity:number;
  ariaLabel:string;
  onIncrease:()=>void;
  onDecrease:()=>void;
  onRemove?:()=>void;
  disabled?:boolean;
  contract?:QuantityControlContract;
}){
  const canDecrease=!disabled&&quantity>minimumQuantity;
  const cart=contract==='cart';
  return <div
    className="cartQuantityStepper"
    data-cart-quantity-layout={cart?'vertical-arrows':undefined}
    data-rfq-quantity-layout={!cart?'cart-vertical-arrows':undefined}
    role="group"
    aria-label={ariaLabel}
    style={{display:'flex',alignItems:'center',gap:8}}
  >
    <output aria-live="polite" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:48,height:32,padding:'0 10px',border:'1px solid rgba(255,255,255,.18)',borderRadius:8,background:'var(--shoporation-color-primary,#5c7cfa)',color:'var(--shoporation-color-primary-contrast,#fff)',fontWeight:900,lineHeight:1,boxShadow:'0 6px 16px rgba(20,58,150,.22)'}}>{quantity} db</output>
    <span
      data-cart-stepper={cart?'vertical':undefined}
      data-rfq-stepper={!cart?'vertical':undefined}
      style={{display:'grid',gap:3,alignContent:'center'}}
    >
      <button
        data-cart-step={cart?'increase':undefined}
        data-rfq-step={!cart?'increase':undefined}
        type="button"
        aria-label="Mennyiség növelése"
        disabled={disabled}
        onClick={onIncrease}
        style={{display:'flex',alignItems:'center',justifyContent:'center',width:28,height:16,minWidth:28,minHeight:16,padding:0,margin:0,border:'1px solid var(--line)',borderRadius:5,background:'#fbfcfa',color:'var(--ink)',lineHeight:0,opacity:disabled?.55:1}}
      ><CartChevronIcon direction="up"/></button>
      <button
        data-cart-step={cart?'decrease':undefined}
        data-rfq-step={!cart?'decrease':undefined}
        type="button"
        aria-label="Mennyiség csökkentése"
        aria-disabled={!canDecrease}
        disabled={!canDecrease}
        onClick={onDecrease}
        style={{display:'flex',alignItems:'center',justifyContent:'center',width:28,height:16,minWidth:28,minHeight:16,padding:0,margin:0,border:'1px solid var(--line)',borderRadius:5,background:'#fbfcfa',color:'var(--ink)',lineHeight:0,opacity:canDecrease?1:.55}}
      ><CartChevronIcon direction="down"/></button>
    </span>
    {onRemove?<button
      data-cart-remove-control={cart?'true':undefined}
      data-rfq-remove-control={!cart?'true':undefined}
      type="button"
      aria-label="Tétel törlése"
      title="Törlés"
      disabled={disabled}
      onClick={onRemove}
      style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,minWidth:32,minHeight:32,padding:0,margin:0,border:'1px solid #ef5454',borderRadius:8,background:'#cf3038',color:'#fff',lineHeight:0,opacity:disabled?.55:1}}
    ><CartTrashIcon/></button>:null}
  </div>;
}
