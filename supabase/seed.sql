insert into products(slug,name,size_label,gross_price,net_price,stock) values
('water-k-40-g','Water-K 40 g','40 g',990,780,100),
('water-k-750-g','Water-K 750 g','750 g',14990,11803,50),
('water-k-25-kg','Water-K 25 kg','25 kg',215900,170000,10)
on conflict(slug) do nothing;
