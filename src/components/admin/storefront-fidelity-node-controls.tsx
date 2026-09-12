'use client';

import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  setStorefrontImageArtDirection,
  setStorefrontNodeTypography,
  setStorefrontNodeViewportStyle,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {inspectStorefrontFidelityBuilder} from '@/lib/builder/storefront-fidelity-inspector';
import {
  STOREFRONT_TYPOGRAPHY_FONT_TOKENS,
  sanitizeStorefrontTypographyValue,
  type StorefrontTypographyValue,
} from '@/lib/builder/storefront-fidelity-typography';
import {sanitizeStorefrontVisualStyleSlot,type StorefrontVisualStyleSlot} from '@/lib/builder/storefront-visual-style';
import type {StorefrontImageArtDirection,StorefrontImageArtDirectionSource} from '@/lib/builder/storefront-fidelity-engine';
import styles from './storefront-visual-builder.module.css';

const VIEWPORT_KEYS=['base','desktop','tablet','mobile'] as const;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const viewportLabel=(viewport:StorefrontViewport)=>viewport==='desktop'?'Desktop':viewport==='tablet'?'Tablet':'Mobil';

function directResponsiveRecord(value:unknown,viewport:StorefrontViewport){
  if(!isRecord(value))return{};
  const responsive=VIEWPORT_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  return isRecord(responsive?value[viewport]:value)?(responsive?value[viewport]:value) as Record<string,unknown>:{};
}

function directTypography(node:StorefrontComponentNode,viewport:StorefrontViewport):StorefrontTypographyValue{
  return sanitizeStorefrontTypographyValue(directResponsiveRecord(node.config.typography,viewport));
}

function directStyle(node:StorefrontComponentNode,viewport:StorefrontViewport):StorefrontVisualStyleSlot{
  return sanitizeStorefrontVisualStyleSlot(directResponsiveRecord(node.config.style,viewport));
}

function artDirection(node:StorefrontComponentNode):StorefrontImageArtDirection{
  if(!isRecord(node.config.artDirection))return{};
  const result:StorefrontImageArtDirection={};
  for(const key of VIEWPORT_KEYS){
    const source=node.config.artDirection[key];
    if(isRecord(source))result[key]={...source} as StorefrontImageArtDirectionSource;
  }
  return result;
}

function parseFocus(value:unknown){
  if(typeof value!=='string')return{x:50,y:50};
  const match=value.trim().match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if(!match)return{x:50,y:50};
  return{x:Math.max(0,Math.min(100,Number(match[1]))),y:Math.max(0,Math.min(100,Number(match[2])))};
}

function numberOrUndefined(value:string){
  if(value.trim()==='')return undefined;
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:undefined;
}

export function StorefrontFidelityNodeControls({document,node,viewport,configurable,onApply}:{
  document:StorefrontPageDocument;
  node:StorefrontComponentNode;
  viewport:StorefrontViewport;
  configurable:readonly string[];
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const inspector=inspectStorefrontFidelityBuilder(document);
  const advanced=inspector.editMode==='advanced'||inspector.editMode==='expert';
  const expert=inspector.editMode==='expert';
  const supportsTypography=configurable.includes('typography')&&['content.heading','content.text','content.button'].includes(node.componentKey);
  const supportsStyle=configurable.includes('style');
  const supportsArtDirection=node.componentKey==='content.image'&&configurable.includes('artDirection');
  const typography=directTypography(node,viewport);
  const visualStyle=directStyle(node,viewport);
  const applyTypography=(patch:Partial<StorefrontTypographyValue>)=>{
    const next={...typography,...patch};
    for(const[key,value]of Object.entries(next))if(value===undefined)delete(next as Record<string,unknown>)[key];
    onApply(setStorefrontNodeTypography(document,node.id,viewport,next),`${viewportLabel(viewport)} tipográfia módosítva.`);
  };
  const applyStyle=(patch:StorefrontVisualStyleSlot)=>{
    const next={...visualStyle,...patch};
    for(const[key,value]of Object.entries(next))if(value===''||value===undefined)delete next[key];
    onApply(setStorefrontNodeViewportStyle(document,node.id,viewport,next),`${viewportLabel(viewport)} vizuális stílus módosítva.`);
  };
  const currentArt=artDirection(node);
  const source=(currentArt[viewport]??{}) as StorefrontImageArtDirectionSource;
  const focus=parseFocus(source.objectPosition??node.config.objectPosition);
  const applyArt=(patch:Partial<StorefrontImageArtDirectionSource>)=>{
    const nextSource={...source,...patch};
    for(const[key,value]of Object.entries(nextSource))if(value===''||value===undefined)delete(nextSource as Record<string,unknown>)[key];
    onApply(setStorefrontImageArtDirection(document,node.id,{...currentArt,[viewport]:nextSource}),`${viewportLabel(viewport)} képkivágás módosítva.`);
  };

  if(!advanced)return <div className={styles.fieldGroup}><strong>Haladó elemvezérlés</strong><p className={styles.emptyHint}>A responsive tipográfia, képfókusz és részletes vizuális beállítások a Haladó vagy Expert szerkesztési módban érhetők el.</p></div>;

  return <>
    {supportsTypography?<div className={styles.fieldGroup}>
      <strong>{viewportLabel(viewport)} tipográfia</strong>
      <p className={styles.emptyHint}>Csak ezt a nézetet módosítja; az üres mező az örökölt értéket használja.</p>
      <label className={styles.field}><span>Betűcsalád</span><select value={typography.fontToken??''} onChange={event=>applyTypography({fontToken:event.target.value?event.target.value as StorefrontTypographyValue['fontToken']:undefined})}><option value="">Örökölt</option>{STOREFRONT_TYPOGRAPHY_FONT_TOKENS.map(token=><option key={token} value={token}>{token}</option>)}</select></label>
      <label className={styles.field}><span>Betűméret (rem)</span><input type="number" min="0.625" max="12" step="0.05" value={typography.fontSizeRem??''} onChange={event=>applyTypography({fontSizeRem:numberOrUndefined(event.target.value)})}/></label>
      <label className={styles.field}><span>Vastagság</span><select value={typography.fontWeight??''} onChange={event=>applyTypography({fontWeight:numberOrUndefined(event.target.value)})}><option value="">Örökölt</option>{[300,400,500,600,650,700,750,800,900].map(weight=><option key={weight} value={weight}>{weight}</option>)}</select></label>
      <label className={styles.field}><span>Sormagasság</span><input type="number" min="0.75" max="2.5" step="0.05" value={typography.lineHeight??''} onChange={event=>applyTypography({lineHeight:numberOrUndefined(event.target.value)})}/></label>
      <label className={styles.field}><span>Betűköz (em)</span><input type="number" min="-0.12" max="0.5" step="0.01" value={typography.letterSpacingEm??''} onChange={event=>applyTypography({letterSpacingEm:numberOrUndefined(event.target.value)})}/></label>
      <label className={styles.field}><span>Max. szövegszélesség (ch)</span><input type="number" min="4" max="100" step="1" value={typography.maxWidthCh??''} onChange={event=>applyTypography({maxWidthCh:numberOrUndefined(event.target.value)})}/></label>
      <label className={styles.field}><span>Igazítás</span><select value={typography.textAlign??''} onChange={event=>applyTypography({textAlign:event.target.value?event.target.value as StorefrontTypographyValue['textAlign']:undefined})}><option value="">Örökölt</option><option value="left">Bal</option><option value="center">Közép</option><option value="right">Jobb</option></select></label>
      <label className={styles.field}><span>Szövegtranszformáció</span><select value={typography.textTransform??''} onChange={event=>applyTypography({textTransform:event.target.value?event.target.value as StorefrontTypographyValue['textTransform']:undefined})}><option value="">Örökölt</option><option value="none">Nincs</option><option value="uppercase">Nagybetű</option><option value="lowercase">Kisbetű</option><option value="capitalize">Szavak nagybetűvel</option></select></label>
      <label className={styles.field}><span>Sortördelés</span><select value={typography.textWrap??''} onChange={event=>applyTypography({textWrap:event.target.value?event.target.value as StorefrontTypographyValue['textWrap']:undefined})}><option value="">Örökölt</option><option value="normal">Normál</option><option value="balance">Balance</option><option value="pretty">Pretty</option></select></label>
      <label className={styles.switchField}><span>Kézi sortörések megőrzése</span><input type="checkbox" checked={typography.preserveLineBreaks??false} onChange={event=>applyTypography({preserveLineBreaks:event.target.checked})}/><i aria-hidden="true"/></label>
    </div>:null}

    {supportsArtDirection?<div className={styles.fieldGroup}>
      <strong>{viewportLabel(viewport)} kép és fókusz</strong>
      <p className={styles.emptyHint}>A kép ugyanaz az elem marad; csak az adott nézet forrása, kivágása és fókusza változik.</p>
      <label className={styles.field}><span>Nézetspecifikus képforrás</span><input value={source.src??''} placeholder="Örökölt kép" onChange={event=>applyArt({src:event.target.value||undefined})}/></label>
      <label className={styles.field}><span>Kitöltés</span><select value={source.objectFit??''} onChange={event=>applyArt({objectFit:event.target.value?event.target.value as 'cover'|'contain':undefined})}><option value="">Örökölt</option><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
      <label className={styles.field}><span>Fókusz X · {Math.round(focus.x)}%</span><input type="range" min="0" max="100" step="1" value={focus.x} onChange={event=>applyArt({objectPosition:`${event.target.value}% ${focus.y}%`})}/></label>
      <label className={styles.field}><span>Fókusz Y · {Math.round(focus.y)}%</span><input type="range" min="0" max="100" step="1" value={focus.y} onChange={event=>applyArt({objectPosition:`${focus.x}% ${event.target.value}%`})}/></label>
    </div>:null}

    {expert&&supportsStyle?<div className={styles.fieldGroup}>
      <strong>{viewportLabel(viewport)} Expert stílus</strong>
      <p className={styles.emptyHint}>Allowlistelt CSS-tulajdonságok. A veszélyes vagy nem támogatott értékeket a közös sanitizer eldobja.</p>
      <label className={styles.field}><span>Szélesség</span><input value={String(visualStyle.width??'')} placeholder="Örökölt" onChange={event=>applyStyle({width:event.target.value})}/></label>
      <label className={styles.field}><span>Max. szélesség</span><input value={String(visualStyle.maxWidth??'')} placeholder="Örökölt" onChange={event=>applyStyle({maxWidth:event.target.value})}/></label>
      <label className={styles.field}><span>Min. magasság</span><input value={String(visualStyle.minHeight??'')} placeholder="Örökölt" onChange={event=>applyStyle({minHeight:event.target.value})}/></label>
      <label className={styles.field}><span>Padding</span><input value={String(visualStyle.padding??'')} placeholder="Örökölt" onChange={event=>applyStyle({padding:event.target.value})}/></label>
      <label className={styles.field}><span>Margin</span><input value={String(visualStyle.margin??'')} placeholder="Örökölt" onChange={event=>applyStyle({margin:event.target.value})}/></label>
      <label className={styles.field}><span>Sarokkerekítés</span><input value={String(visualStyle.borderRadius??'')} placeholder="Örökölt" onChange={event=>applyStyle({borderRadius:event.target.value})}/></label>
      <label className={styles.field}><span>Háttérszín</span><input value={String(visualStyle.backgroundColor??'')} placeholder="Örökölt" onChange={event=>applyStyle({backgroundColor:event.target.value})}/></label>
      <label className={styles.field}><span>Szövegszín</span><input value={String(visualStyle.color??'')} placeholder="Örökölt" onChange={event=>applyStyle({color:event.target.value})}/></label>
      <label className={styles.field}><span>Átlátszóság</span><input type="number" min="0" max="1" step="0.05" value={visualStyle.opacity??''} onChange={event=>applyStyle({opacity:numberOrUndefined(event.target.value)??''})}/></label>
      <label className={styles.field}><span>Z-index</span><input type="number" min="-1" max="20" step="1" value={visualStyle.zIndex??''} onChange={event=>applyStyle({zIndex:numberOrUndefined(event.target.value)??''})}/></label>
    </div>:null}
  </>;
}