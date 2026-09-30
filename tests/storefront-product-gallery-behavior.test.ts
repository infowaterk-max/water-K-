import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('storefront product gallery behavior contract',()=>{
  it('uses a real client-side thumbnail selector instead of hash-link pseudo navigation',()=>{
    const gallery=read('src/components/builder/storefront-product-gallery.tsx');
    const commerce=read('src/components/builder/storefront-commerce.tsx');
    expect(gallery).toContain("'use client'");
    expect(gallery).toContain('useState(0)');
    expect(gallery).toContain('data-gallery-interaction="thumbnail-selects-main"');
    expect(gallery).toContain('data-product-gallery-main-image="true"');
    expect(gallery).toContain('data-product-gallery-thumbnail={index}');
    expect(gallery).toContain('aria-pressed={active}');
    expect(gallery).toContain('onClick={()=>setSelectedIndex(index)}');
    expect(gallery).toContain('src={selected.src}');
    expect(commerce).toContain('<StorefrontProductGallery');
    expect(commerce).not.toContain('#product-image-2');
  });
});
