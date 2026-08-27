with product as (
  insert into public.products(slug,name,short_description,description,active)
  values('water-k','Water-K','Víztároló káliumos talajkondicionáló polimer.','Water-K vízmegtartó technológia kertészethez, gyephez, fákhoz és dísznövényekhez.',true)
  on conflict(slug) do update set name=excluded.name,short_description=excluded.short_description,active=true
  returning id
)
insert into public.product_variants(product_id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active)
select id,'WK-040','40 g',780,990,100,true from product
union all select id,'WK-750','750 g',11803,14990,50,true from product
union all select id,'WK-25K','25 kg',170000,215900,10,true from product
on conflict(sku) do update set label=excluded.label,net_price_huf=excluded.net_price_huf,gross_price_huf=excluded.gross_price_huf,active=true;
