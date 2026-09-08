export const STRUCTURED_PRODUCT_ENGINE_VERSION='shoporation.compare-spec-engine.v1' as const;

export type StructuredSpecValueType='text'|'number'|'boolean'|'enum'|'multi-value'|'measurement'|'range'|'date';
export type StructuredSpecScope='product'|'variant'|'both';
export type StructuredUnitFamily='length'|'mass'|'storage'|'frequency'|'power'|'capacity';

export type StructuredSpecGroup={key:string;label:string;order?:number};
export type StructuredSpecDefinition={
  key:string;
  label:string;
  groupKey:string;
  valueType:StructuredSpecValueType;
  scope:StructuredSpecScope;
  order?:number;
  keySpec?:boolean;
  comparable?:boolean;
  filterable?:boolean;
  unitFamily?:StructuredUnitFamily;
  enumOptions?:readonly string[];
};

export type StructuredSpecValue=
  |{type:'text';value:string}
  |{type:'number';value:number}
  |{type:'boolean';value:boolean}
  |{type:'enum';value:string}
  |{type:'multi-value';value:string[]}
  |{type:'measurement';value:number;unit:string}
  |{type:'range';min?:number;max?:number;unit?:string}
  |{type:'date';value:string};

export type StructuredSpecAssignments=Readonly<Record<string,StructuredSpecValue|null|undefined>>;
export type StructuredProductDocumentType='datasheet'|'manual'|'certificate'|'drawing'|'warranty';
export type StructuredProductDocument={id:string;type:StructuredProductDocumentType;label?:string;href:string;language?:string;version?:string};

export type StructuredResolvedSpecRow={
  specKey:string;
  label:string;
  displayValue:string;
  missing:boolean;
  missingLabel:string;
  value:StructuredSpecValue|null;
};
export type StructuredResolvedSpecGroup={groupKey:string;label:string;rows:StructuredResolvedSpecRow[]};
export type StructuredCompareItem={id:string;label:string;href?:string;productValues:StructuredSpecAssignments;variantValues?:StructuredSpecAssignments};
export type StructuredCompareCell={itemId:string;displayValue:string;missing:boolean;missingLabel:string;value:StructuredSpecValue|null};
export type StructuredCompareRow={specKey:string;label:string;hasDifference:boolean;cells:StructuredCompareCell[]};
export type StructuredCompareGroup={groupKey:string;label:string;rows:StructuredCompareRow[]};
export type StructuredFacetOption={key:string;label:string;count:number};
export type StructuredFacet={specKey:string;label:string;options:StructuredFacetOption[]};

const KEY_PATTERN=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const DATE_PATTERN=/^(\d{4})-(\d{2})-(\d{2})$/;
const DOCUMENT_LABELS:Record<StructuredProductDocumentType,string>={
  datasheet:'Adatlap',manual:'Használati útmutató',certificate:'Tanúsítvány',drawing:'Műszaki rajz',warranty:'Garancia',
};

const UNIT_SYSTEMS:Record<StructuredUnitFamily,{baseUnit:string;factors:Readonly<Record<string,number>>}>={
  length:{baseUnit:'mm',factors:{mm:1,cm:10,m:1000}},
  mass:{baseUnit:'g',factors:{g:1,kg:1000}},
  storage:{baseUnit:'GB',factors:{MB:0.001,GB:1,TB:1000}},
  frequency:{baseUnit:'Hz',factors:{Hz:1,kHz:1000,MHz:1000000,GHz:1000000000}},
  power:{baseUnit:'W',factors:{W:1,kW:1000}},
  capacity:{baseUnit:'mAh',factors:{mAh:1,Ah:1000}},
};

const finite=(value:number)=>Number.isFinite(value);
const cleanNumber=(value:number)=>Number(value.toFixed(9));
const cleanText=(value:string)=>value.trim();
const formatNumber=(value:number)=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:3}).format(value);
const ordered=<T extends{order?:number;label:string}>(items:readonly T[])=>[...items].sort((a,b)=>(a.order??999)-(b.order??999)||a.label.localeCompare(b.label,'hu'));

export class StructuredProductSpecificationRegistry{
  private readonly groups=new Map<string,Readonly<StructuredSpecGroup>>();
  private readonly specs=new Map<string,Readonly<StructuredSpecDefinition>>();

  constructor(input:{groups:readonly StructuredSpecGroup[];specs:readonly StructuredSpecDefinition[]}){
    for(const group of input.groups)this.registerGroup(group);
    for(const spec of input.specs)this.registerSpec(spec);
  }

  private registerGroup(group:StructuredSpecGroup){
    if(!KEY_PATTERN.test(group.key)||!group.label.trim())throw new Error('STRUCTURED_SPEC_GROUP_INVALID');
    if(this.groups.has(group.key))throw new Error('STRUCTURED_SPEC_GROUP_DUPLICATE');
    this.groups.set(group.key,Object.freeze({...group,label:group.label.trim()}));
  }

  private registerSpec(spec:StructuredSpecDefinition){
    if(!KEY_PATTERN.test(spec.key)||!spec.label.trim()||!this.groups.has(spec.groupKey))throw new Error('STRUCTURED_SPEC_DEFINITION_INVALID');
    if(this.specs.has(spec.key))throw new Error('STRUCTURED_SPEC_DEFINITION_DUPLICATE');
    if(spec.unitFamily&&!['measurement','range'].includes(spec.valueType))throw new Error('STRUCTURED_SPEC_UNIT_FAMILY_INVALID');
    if(spec.valueType==='enum'&&(!spec.enumOptions?.length||new Set(spec.enumOptions).size!==spec.enumOptions.length))throw new Error('STRUCTURED_SPEC_ENUM_OPTIONS_INVALID');
    this.specs.set(spec.key,Object.freeze({...spec,label:spec.label.trim(),enumOptions:spec.enumOptions?[...spec.enumOptions]:undefined}));
  }

  getGroup(key:string){return this.groups.get(key);}
  getSpec(key:string){return this.specs.get(key);}
  listGroups(){return ordered([...this.groups.values()]);}
  listSpecs(groupKey?:string){return ordered([...this.specs.values()].filter(spec=>!groupKey||spec.groupKey===groupKey));}
}

function normalizeMeasurement(value:number,unit:string,family?:StructuredUnitFamily){
  if(!family)return{value:cleanNumber(value),unit};
  const system=UNIT_SYSTEMS[family];
  const factor=system.factors[unit];
  if(!factor)return{value:cleanNumber(value),unit};
  return{value:cleanNumber(value*factor),unit:system.baseUnit};
}

export function normalizeStructuredSpecValue(definition:StructuredSpecDefinition,value:StructuredSpecValue|null|undefined):StructuredSpecValue|null{
  if(!value||value.type!==definition.valueType)return null;
  switch(value.type){
    case'text':{const text=cleanText(value.value);return text?{type:'text',value:text}:null;}
    case'number':return finite(value.value)?{type:'number',value:cleanNumber(value.value)}:null;
    case'boolean':return{type:'boolean',value:value.value};
    case'enum':{const option=cleanText(value.value);return option&&(!definition.enumOptions||definition.enumOptions.includes(option))?{type:'enum',value:option}:null;}
    case'multi-value':{const values=[...new Set(value.value.map(cleanText).filter(Boolean))];return values.length?{type:'multi-value',value:values}:null;}
    case'measurement':{if(!finite(value.value)||!cleanText(value.unit))return null;const normalized=normalizeMeasurement(value.value,cleanText(value.unit),definition.unitFamily);return{type:'measurement',...normalized};}
    case'range':{
      if(value.min===undefined&&value.max===undefined)return null;
      if((value.min!==undefined&&!finite(value.min))||(value.max!==undefined&&!finite(value.max)))return null;
      const unit=cleanText(value.unit??'');
      const min=value.min===undefined?undefined:normalizeMeasurement(value.min,unit,definition.unitFamily).value;
      const max=value.max===undefined?undefined:normalizeMeasurement(value.max,unit,definition.unitFamily).value;
      const normalizedUnit=unit?normalizeMeasurement(value.min??value.max??0,unit,definition.unitFamily).unit:undefined;
      if(min!==undefined&&max!==undefined&&min>max)return null;
      return{type:'range',min,max,unit:normalizedUnit};
    }
    case'date':return DATE_PATTERN.test(value.value)?{type:'date',value:value.value}:null;
  }
}

export function resolveStructuredSpecValue(definition:StructuredSpecDefinition,productValues:StructuredSpecAssignments,variantValues:StructuredSpecAssignments={}):StructuredSpecValue|null{
  const product=normalizeStructuredSpecValue(definition,productValues[definition.key]);
  const variant=normalizeStructuredSpecValue(definition,variantValues[definition.key]);
  if(definition.scope==='product')return product;
  if(definition.scope==='variant')return variant;
  return variant??product;
}

export function formatStructuredSpecValue(value:StructuredSpecValue|null,missing='—'):string{
  if(!value)return missing;
  switch(value.type){
    case'text':case'enum':return value.value;
    case'number':return formatNumber(value.value);
    case'boolean':return value.value?'Igen':'Nem';
    case'multi-value':return value.value.join(', ');
    case'measurement':return`${formatNumber(value.value)} ${value.unit}`.trim();
    case'range':{
      const unit=value.unit?` ${value.unit}`:'';
      if(value.min!==undefined&&value.max!==undefined)return`${formatNumber(value.min)}–${formatNumber(value.max)}${unit}`;
      if(value.min!==undefined)return`≥ ${formatNumber(value.min)}${unit}`;
      return`≤ ${formatNumber(value.max??0)}${unit}`;
    }
    case'date':{const match=DATE_PATTERN.exec(value.value);return match?`${match[1]}. ${match[2]}. ${match[3]}.`:value.value;}
  }
}

function semanticValue(value:StructuredSpecValue|null):string{
  if(!value)return'missing';
  if(value.type==='multi-value')return`multi:${[...value.value].sort().join('|')}`;
  if(value.type==='range')return`range:${value.min??''}:${value.max??''}:${value.unit??''}`;
  if(value.type==='measurement')return`measurement:${cleanNumber(value.value)}:${value.unit}`;
  return`${value.type}:${String(value.value)}`;
}

export function buildStructuredSpecGroups(input:{
  registry:StructuredProductSpecificationRegistry;
  productValues:StructuredSpecAssignments;
  variantValues?:StructuredSpecAssignments;
  keySpecsOnly?:boolean;
  includeMissing?:boolean;
  missingLabel?:string;
}):StructuredResolvedSpecGroup[]{
  const missingLabel=input.missingLabel??'Nincs megadva';
  const displayMissing='—';
  const groups:StructuredResolvedSpecGroup[]=[];
  for(const group of input.registry.listGroups()){
    const rows:StructuredResolvedSpecRow[]=input.registry.listSpecs(group.key).filter(spec=>!input.keySpecsOnly||spec.keySpec).flatMap(spec=>{
      const value=resolveStructuredSpecValue(spec,input.productValues,input.variantValues);
      if(!value&&input.includeMissing===false)return[];
      const row:StructuredResolvedSpecRow={specKey:spec.key,label:spec.label,displayValue:formatStructuredSpecValue(value,displayMissing),missing:!value,missingLabel,value};
      return[row];
    });
    if(rows.length)groups.push({groupKey:group.key,label:group.label,rows});
  }
  return groups;
}

export function buildStructuredProductComparison(input:{
  registry:StructuredProductSpecificationRegistry;
  items:readonly StructuredCompareItem[];
  differencesOnly?:boolean;
  includeMissing?:boolean;
  missingLabel?:string;
}):StructuredCompareGroup[]{
  const missingLabel=input.missingLabel??'Nincs megadva';
  const groups:StructuredCompareGroup[]=[];
  for(const group of input.registry.listGroups()){
    const rows:StructuredCompareRow[]=input.registry.listSpecs(group.key).filter(spec=>spec.comparable!==false).flatMap(spec=>{
      const cells:StructuredCompareCell[]=input.items.map(item=>{
        const value=resolveStructuredSpecValue(spec,item.productValues,item.variantValues);
        return{itemId:item.id,displayValue:formatStructuredSpecValue(value),missing:!value,missingLabel,value};
      });
      if(input.includeMissing===false&&cells.every(cell=>cell.missing))return[];
      const hasDifference=new Set(cells.map(cell=>semanticValue(cell.value))).size>1;
      if(input.differencesOnly&&!hasDifference)return[];
      const row:StructuredCompareRow={specKey:spec.key,label:spec.label,hasDifference,cells};
      return[row];
    });
    if(rows.length)groups.push({groupKey:group.key,label:group.label,rows});
  }
  return groups;
}

function facetEntries(_definition:StructuredSpecDefinition,value:StructuredSpecValue):{key:string;label:string}[]{
  if(value.type==='multi-value')return value.value.map(item=>({key:`text:${item}`,label:item}));
  return[{key:semanticValue(value),label:formatStructuredSpecValue(value)}];
}

export function buildStructuredFacetIndex(input:{registry:StructuredProductSpecificationRegistry;items:readonly StructuredCompareItem[]}):StructuredFacet[]{
  const facets:StructuredFacet[]=[];
  for(const spec of input.registry.listSpecs().filter(item=>item.filterable)){
    const options=new Map<string,{label:string;count:number}>();
    for(const item of input.items){
      const value=resolveStructuredSpecValue(spec,item.productValues,item.variantValues);
      if(!value)continue;
      for(const entry of new Map(facetEntries(spec,value).map(candidate=>[candidate.key,candidate])).values()){
        const current=options.get(entry.key);
        options.set(entry.key,{label:entry.label,count:(current?.count??0)+1});
      }
    }
    if(options.size)facets.push({specKey:spec.key,label:spec.label,options:[...options].map(([key,value])=>({key,...value})).sort((a,b)=>a.label.localeCompare(b.label,'hu'))});
  }
  return facets;
}

export function normalizeStructuredProductDocuments(documents:readonly StructuredProductDocument[]):Array<StructuredProductDocument&{displayLabel:string}>{
  const seen=new Set<string>();
  return documents.flatMap(document=>{
    const id=cleanText(document.id);const href=cleanText(document.href);
    if(!id||seen.has(id)||!(href.startsWith('/')||href.startsWith('https://')))return[];
    seen.add(id);
    return[{...document,id,href,label:document.label?.trim()||undefined,displayLabel:document.label?.trim()||DOCUMENT_LABELS[document.type]}];
  });
}
