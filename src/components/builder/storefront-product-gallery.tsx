'use client';

import {useState,type CSSProperties} from 'react';

export type StorefrontProductGalleryImage={
  src:string;
  alt:string;
  objectPosition:string;
  filter?:string;
};

export type StorefrontProductGalleryStyleSlots=Partial<Record<
  'root'|'main'|'mainImage'|'thumbnails'|'thumbnail'|'thumbnailActive'|'thumbnailImage',
  CSSProperties
>>;

export function StorefrontProductGallery({
  images,
  thumbnailPosition,
  aspectRatio,
  viewport,
  rootStyle,
  styleSlots={},
}:{
  images:readonly StorefrontProductGalleryImage[];
  thumbnailPosition:string;
  aspectRatio:string;
  viewport:'desktop'|'tablet'|'mobile';
  rootStyle?:CSSProperties;
  styleSlots?:StorefrontProductGalleryStyleSlots;
}){
  const visible=images.slice(0,4);
  const[selectedIndex,setSelectedIndex]=useState(0);
  const resolvedIndex=selectedIndex>=0&&selectedIndex<visible.length?selectedIndex:0;
  const selected=visible[resolvedIndex]??null;
  const mobile=viewport==='mobile';
  const left=thumbnailPosition==='left';
  const vertical=left&&!mobile;

  const main=<div
    id="product-main"
    data-product-gallery-main="true"
    data-product-gallery-selected-index={resolvedIndex}
    style={{
      aspectRatio,
      background:'var(--shoporation-color-surface-muted,#eee9e2)',
      overflow:'hidden',
      ...styleSlots.main,
    }}
  >
    {selected?<img
      data-product-gallery-main-image="true"
      src={selected.src}
      alt={selected.alt}
      loading="eager"
      style={{
        display:'block',
        width:'100%',
        height:'100%',
        objectFit:'cover',
        objectPosition:selected.objectPosition,
        filter:selected.filter||undefined,
        ...styleSlots.mainImage,
      }}
    />:null}
  </div>;

  const thumbnails=visible.length>1?<div
    data-product-gallery-thumbnails={vertical?'vertical':'horizontal'}
    style={{
      display:'grid',
      gridTemplateColumns:vertical?'1fr':left?'repeat(4,minmax(0,1fr))':`repeat(${Math.max(1,visible.length)},minmax(0,1fr))`,
      gap:'.5rem',
      ...styleSlots.thumbnails,
    }}
  >
    {visible.map((item,index)=>{
      const active=index===resolvedIndex;
      return <a
        key={`${item.src}:${index}`}
        data-product-gallery-thumbnail={index}
        href={index===0?'#product-main':`#product-image-${index+1}`}
        aria-label={`${index+1}. termékkép`}
        aria-current={active?'true':undefined}
        onClick={event=>{event.preventDefault();setSelectedIndex(index)}}
        style={{
          display:'block',
          aspectRatio:'1 / 1',
          border:active?'1px solid var(--shoporation-color-text,#111)':'1px solid var(--shoporation-color-border,#ddd)',
          overflow:'hidden',
          ...styleSlots.thumbnail,
          ...(active?styleSlots.thumbnailActive:{}),
        }}
      >
        <img
          src={item.src}
          alt={item.alt}
          loading={index===0?'eager':'lazy'}
          style={{
            display:'block',
            width:'100%',
            height:'100%',
            objectFit:'cover',
            objectPosition:item.objectPosition,
            filter:item.filter||undefined,
            ...styleSlots.thumbnailImage,
          }}
        />
      </a>;
    })}
  </div>:null;

  return <div
    data-storefront-commerce="product-gallery"
    data-presentation="editorial-thumbnails"
    data-gallery-authority="single-main-with-thumbnails"
    data-thumbnail-position={thumbnailPosition}
    data-gallery-interaction="thumbnail-selects-main"
    style={{
      display:'grid',
      gridTemplateColumns:vertical?'clamp(3.1rem,7vw,4.5rem) minmax(0,1fr)':'1fr',
      gap:'.65rem',
      alignItems:'start',
      ...rootStyle,
      ...styleSlots.root,
    }}
  >
    {vertical?thumbnails:main}
    {vertical?main:thumbnails}
  </div>;
}
