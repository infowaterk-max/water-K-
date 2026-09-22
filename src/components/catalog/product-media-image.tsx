import type{CSSProperties}from'react';
import{DEFAULT_MEDIA_PRESENTATIONS,type MediaPresentationContext,type MediaPresentationSet}from'@/lib/catalog-media-presentation';

type Props={src:string;alt:string;presentation?:MediaPresentationSet;context?:MediaPresentationContext;className?:string;frameClassName?:string;style?:CSSProperties;frameStyle?:CSSProperties};
export function ProductMediaImage({src,alt,presentation,context='detail',className,frameClassName,style,frameStyle}:Props){
 const value=presentation?.[context]??DEFAULT_MEDIA_PRESENTATIONS[context];
 return <div className={frameClassName} style={{position:'relative',overflow:'hidden',...frameStyle}}><img className={className} src={src} alt={alt} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',transformOrigin:'center center',transform:`translate(${value.offsetX}%, ${value.offsetY}%) scale(${value.zoom}) rotate(${value.rotation}deg)`,...style}}/></div>;
}
