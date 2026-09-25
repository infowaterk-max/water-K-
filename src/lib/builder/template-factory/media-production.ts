import type {
  StorefrontTemplateFactoryMediaAspectRatio,
  StorefrontTemplateFactoryMediaAsset,
  StorefrontTemplateFactoryMediaRole,
  StorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/scaffold';

export const STOREFRONT_TEMPLATE_FACTORY_MEDIA_WORK_ORDER_VERSION='shoporation.template-factory-media-work-order.v1' as const;

export type StorefrontTemplateFactoryMediaWorkOrder={
  contract:typeof STOREFRONT_TEMPLATE_FACTORY_MEDIA_WORK_ORDER_VERSION;
  templateKey:string;
  templateVersion:number;
  displayName:string;
  referenceKey:string;
  assetKey:string;
  state:StorefrontTemplateFactoryMediaAsset['state'];
  role:StorefrontTemplateFactoryMediaRole;
  aspectRatio:StorefrontTemplateFactoryMediaAspectRatio;
  outputPath:string;
  alt:string;
  pageTypes:readonly string[];
  productionBrief:string;
  constraints:readonly string[];
};

const ratioLabel=(value:StorefrontTemplateFactoryMediaAspectRatio)=>value==='free'?'a kompozícióhoz igazodó szabad képarány':value+' képarány';

const rolePurpose:Record<StorefrontTemplateFactoryMediaRole,string>={
  hero:'cinematic hero artwork, az oldal fő vizuális fókusza',
  category:'image-led kategória vagy univerzum csempe',
  product:'prémium termék-/gyűjtői tárgy fotó vagy render',
  editorial:'hangulatos editorial jelenet, amely történetet és mélységet ad',
  background:'támogató atmoszférikus háttér vagy archívumjelenet',
  decorative:'visszafogott támogató dekoráció, amely nem hordoz üzleti állítást',
};

function palette(recipe:StorefrontTemplateFactoryRecipe){
  const tokens=recipe.globalStyles.tokens;
  return[
    tokens.background?'háttér '+tokens.background:'',
    tokens.surface?'felület '+tokens.surface:'',
    tokens.accent?'fő akcentus '+tokens.accent:'',
    tokens.accentSecondary?'másodlagos akcentus '+tokens.accentSecondary:'',
  ].filter(Boolean).join(', ');
}

export function createStorefrontTemplateFactoryMediaWorkOrder(
  recipe:StorefrontTemplateFactoryRecipe,
):readonly StorefrontTemplateFactoryMediaWorkOrder[]{
  return Object.freeze(recipe.media.assets.map(asset=>{
    const aspectRatio=asset.aspectRatio??'free';
    const constraints=Object.freeze([
      'Ne kerüljön a képbe felirat, logó, vízjel, ár, CTA, badge vagy más szerkeszthető UI-szöveg.',
      'A kép ne állítson valótlant termékritkaságról, készletről, exkluzivitásról, előrendelésről vagy más commerce-state-ről.',
      'A kompozíció hagyjon használható safe area-t reszponzív cropra és UI-overlayre.',
      'Kerüld a stockfotó-hatást, az üres geometriai placeholder megjelenést és a generikus sablonérzetet.',
      'Az output legyen webre optimalizálható, nagy felbontású, és a végleges állapotban package-owned lokális asset.',
    ]);
    const visualPalette=palette(recipe);
    const productionBrief=[
      recipe.displayName+' – '+rolePurpose[asset.role]+'.',
      'Elfogadott vizuális referencia: '+recipe.reference.key+'.',
      'Cél: '+ratioLabel(aspectRatio)+'; alt-szándék: „'+asset.alt+'”.',
      visualPalette?'Vizuális DNA / paletta: '+visualPalette+'.':'',
      'Használat: '+asset.pageTypes.join(', ')+'.',
      'Prémium, kész webshop-minőségű, vizuálisan karakteres és rétegzett eredményt készíts.',
      'A kép legyen önálló vizuális asset; minden szöveg és kereskedelmi állapot külön HTML/komponens authority marad.',
    ].filter(Boolean).join(' ');
    return Object.freeze({
      contract:STOREFRONT_TEMPLATE_FACTORY_MEDIA_WORK_ORDER_VERSION,
      templateKey:recipe.templateKey,
      templateVersion:recipe.templateVersion,
      displayName:recipe.displayName,
      referenceKey:recipe.reference.key,
      assetKey:asset.key,
      state:asset.state,
      role:asset.role,
      aspectRatio,
      outputPath:asset.src,
      alt:asset.alt,
      pageTypes:Object.freeze([...asset.pageTypes]),
      productionBrief,
      constraints,
    });
  }));
}

export function pendingStorefrontTemplateFactoryMediaWorkOrders(recipe:StorefrontTemplateFactoryRecipe){
  return createStorefrontTemplateFactoryMediaWorkOrder(recipe).filter(order=>order.state!=='ready');
}
