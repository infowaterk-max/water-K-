export const MEDIA_PRESENTATION_CONTEXTS=['card','detail','mobile'] as const;
export type MediaPresentationContext=typeof MEDIA_PRESENTATION_CONTEXTS[number];
export type MediaPresentationTransform={zoom:number;offsetX:number;offsetY:number;rotation:number};
export type MediaPresentationSet=Record<MediaPresentationContext,MediaPresentationTransform>;
export type MediaPresentationPreset={id:string;name:string;presentation:MediaPresentationSet};

export const MEDIA_PREVIEW_META:Record<MediaPresentationContext,{label:string;aspectRatio:string;minWidth:number;description:string}>={
 card:{label:'Termékkártya',aspectRatio:'1 / 1',minWidth:640,description:'Kategória- és ajánlókártyák'},
 detail:{label:'Termékoldal',aspectRatio:'1 / 1',minWidth:1200,description:'Nagy termékgaléria'},
 mobile:{label:'Mobil',aspectRatio:'4 / 5',minWidth:720,description:'Keskeny képernyős terméknézet'},
};

export const DEFAULT_MEDIA_PRESENTATIONS:MediaPresentationSet={
 card:{zoom:1,offsetX:0,offsetY:0,rotation:0},
 detail:{zoom:1,offsetX:0,offsetY:0,rotation:0},
 mobile:{zoom:1,offsetX:0,offsetY:0,rotation:0},
};

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:min));
export function normalizeMediaPresentation(value:Partial<MediaPresentationTransform>|undefined):MediaPresentationTransform{
 return{
  zoom:Number(clamp(Number(value?.zoom??1),1,3).toFixed(3)),
  offsetX:Number(clamp(Number(value?.offsetX??0),-50,50).toFixed(3)),
  offsetY:Number(clamp(Number(value?.offsetY??0),-50,50).toFixed(3)),
  rotation:Number(clamp(Number(value?.rotation??0),-180,180).toFixed(2)),
 };
}
export function normalizeMediaPresentationSet(value?:Partial<Record<MediaPresentationContext,Partial<MediaPresentationTransform>>>):MediaPresentationSet{
 return{
  card:normalizeMediaPresentation(value?.card),
  detail:normalizeMediaPresentation(value?.detail),
  mobile:normalizeMediaPresentation(value?.mobile),
 };
}
export function mediaPresentationIsDefault(value:MediaPresentationSet){
 return MEDIA_PRESENTATION_CONTEXTS.every(context=>{const item=value[context];return item.zoom===1&&item.offsetX===0&&item.offsetY===0&&item.rotation===0});
}
