export type CartCommerceGroupType='composition'|'configuration';
export type CartCommerceGroupMeta={
  type:CartCommerceGroupType;
  id:string;
  engineVersion:string;
  definitionKey:string;
  definitionVersion:number;
  itemKey:string;
  slotId?:string|null;
};
export type CartItem={
  productId:string;
  variantId?:string|null;
  slug:string;
  name:string;
  unitPrice:number;
  quantity:number;
  image?:string;
  minimumQuantity?:number;
  orderMultiple?:number;
  lineId?:string;
  commerceGroup?:CartCommerceGroupMeta;
};
export type Cart={items:CartItem[]};
export type CartCommerceGroupRequest={
  type:CartCommerceGroupType;
  id:string;
  engineVersion:string;
  definitionKey:string;
  definitionVersion:number;
  items:Array<{itemKey:string;variant_id:string;quantity:number;slotId?:string|null}>;
};
export const cartTotal=(cart:Cart)=>cart.items.reduce((sum,item)=>sum+item.unitPrice*item.quantity,0);

export function buildCartCommerceGroups(cart:Cart):CartCommerceGroupRequest[]{
  const groups=new Map<string,CartCommerceGroupRequest>();
  for(const item of cart.items){
    const meta=item.commerceGroup;
    if(!meta||!item.variantId)continue;
    const key=`${meta.type}:${meta.id}`;
    let group=groups.get(key);
    if(!group){
      group={type:meta.type,id:meta.id,engineVersion:meta.engineVersion,definitionKey:meta.definitionKey,definitionVersion:meta.definitionVersion,items:[]};
      groups.set(key,group);
    }
    if(group.engineVersion!==meta.engineVersion||group.definitionKey!==meta.definitionKey||group.definitionVersion!==meta.definitionVersion)continue;
    const existing=group.items.find(candidate=>candidate.itemKey===meta.itemKey&&candidate.variant_id===item.variantId&&(candidate.slotId??null)===(meta.slotId??null));
    if(existing)existing.quantity+=item.quantity;
    else group.items.push({itemKey:meta.itemKey,variant_id:item.variantId,quantity:item.quantity,slotId:meta.slotId??null});
  }
  return[...groups.values()].sort((a,b)=>`${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
}
