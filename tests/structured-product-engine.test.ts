import {describe,expect,it} from 'vitest';
import {
  StructuredProductSpecificationRegistry,
  buildStructuredFacetIndex,
  buildStructuredProductComparison,
  buildStructuredSpecGroups,
  normalizeStructuredProductDocuments,
  resolveStructuredSpecValue,
  type StructuredCompareItem,
  type StructuredSpecAssignments,
} from '@/lib/commerce/structured-product';

const registry=new StructuredProductSpecificationRegistry({
  groups:[{key:'core',label:'Fő adatok',order:1},{key:'display',label:'Kijelző',order:2}],
  specs:[
    {key:'weight',label:'Tömeg',groupKey:'core',valueType:'measurement',scope:'product',unitFamily:'mass',keySpec:true,comparable:true,filterable:true,order:1},
    {key:'storage',label:'Tárhely',groupKey:'core',valueType:'measurement',scope:'variant',unitFamily:'storage',keySpec:true,comparable:true,filterable:true,order:2},
    {key:'wireless',label:'Vezeték nélküli',groupKey:'core',valueType:'boolean',scope:'product',comparable:true,filterable:true,order:3},
    {key:'finish',label:'Felület',groupKey:'core',valueType:'enum',scope:'both',enumOptions:['Black','Silver'],comparable:true,filterable:true,order:4},
    {key:'features',label:'Funkciók',groupKey:'core',valueType:'multi-value',scope:'product',comparable:true,filterable:true,order:5},
    {key:'refresh',label:'Képfrissítés',groupKey:'display',valueType:'measurement',scope:'product',unitFamily:'frequency',keySpec:true,comparable:true,order:1},
    {key:'release',label:'Megjelenés',groupKey:'display',valueType:'date',scope:'product',comparable:true,order:2},
    {key:'brightness',label:'Fényerő-tartomány',groupKey:'display',valueType:'range',scope:'product',comparable:true,order:3},
  ],
});

const baseProductValues:StructuredSpecAssignments={
  weight:{type:'measurement',value:1,unit:'kg'},
  wireless:{type:'boolean',value:true},
  finish:{type:'enum',value:'Black'},
  features:{type:'multi-value',value:['Wi‑Fi','Bluetooth']},
  refresh:{type:'measurement',value:120,unit:'Hz'},
  release:{type:'date',value:'2026-09-08'},
};
const baseVariantValues:StructuredSpecAssignments={storage:{type:'measurement',value:1,unit:'TB'}};
const item=(id:string,overrides:Partial<StructuredCompareItem>={}):StructuredCompareItem=>({id,label:id,productValues:baseProductValues,variantValues:baseVariantValues,...overrides});

describe('Compare & Spec Engine v1',()=>{
  it('keeps product and variant scope separate while allowing variant override only for both-scope specs',()=>{
    expect(resolveStructuredSpecValue(registry.getSpec('storage')!,item('a').productValues,item('a').variantValues)).toEqual({type:'measurement',value:1000,unit:'GB'});
    expect(resolveStructuredSpecValue(registry.getSpec('weight')!,item('a').productValues,{weight:{type:'measurement',value:5,unit:'kg'}})).toEqual({type:'measurement',value:1000,unit:'g'});
    expect(resolveStructuredSpecValue(registry.getSpec('finish')!,item('a').productValues,{finish:{type:'enum',value:'Silver'}})).toEqual({type:'enum',value:'Silver'});
  });

  it('normalizes compatible units so semantically equal values are not marked as differences',()=>{
    const comparison=buildStructuredProductComparison({registry,items:[item('a'),item('b',{productValues:{...baseProductValues,weight:{type:'measurement',value:1000,unit:'g'}}})]});
    const weight=comparison.flatMap(group=>group.rows).find(row=>row.specKey==='weight');
    expect(weight?.hasDifference).toBe(false);
    expect(weight?.cells.map(cell=>cell.displayValue)).toEqual(['1000 g','1000 g']);
  });

  it('builds grouped key specs and explicit missing-data evidence',()=>{
    const groups=buildStructuredSpecGroups({registry,productValues:item('a').productValues,variantValues:{},keySpecsOnly:true,includeMissing:true});
    const rows=groups.flatMap(group=>group.rows);
    expect(rows.find(row=>row.specKey==='weight')?.displayValue).toBe('1000 g');
    expect(rows.find(row=>row.specKey==='storage')).toMatchObject({displayValue:'—',missing:true,missingLabel:'Nincs megadva'});
  });

  it('builds structured facets from the same registry instead of a separate attribute system',()=>{
    const facets=buildStructuredFacetIndex({registry,items:[item('a'),item('b',{variantValues:{storage:{type:'measurement',value:512,unit:'GB'}},productValues:{...baseProductValues,finish:{type:'enum',value:'Silver'}}})]});
    expect(facets.find(facet=>facet.specKey==='storage')?.options.map(option=>option.label)).toEqual(['1000 GB','512 GB']);
    expect(facets.find(facet=>facet.specKey==='finish')?.options).toEqual(expect.arrayContaining([expect.objectContaining({label:'Black',count:1}),expect.objectContaining({label:'Silver',count:1})]));
  });

  it('supports difference-only compare rows and preserves missing values as explicit cells',()=>{
    const comparison=buildStructuredProductComparison({registry,items:[item('a'),item('b',{variantValues:{},productValues:{...baseProductValues,wireless:{type:'boolean',value:false}}})],differencesOnly:true});
    const rows=comparison.flatMap(group=>group.rows);
    expect(rows.some(row=>row.specKey==='wireless'&&row.hasDifference)).toBe(true);
    expect(rows.find(row=>row.specKey==='storage')?.cells[1]).toMatchObject({displayValue:'—',missing:true});
    expect(rows.some(row=>row.specKey==='weight')).toBe(false);
  });

  it('normalizes only safe technical documents and applies canonical document labels',()=>{
    const documents=normalizeStructuredProductDocuments([{id:'manual',type:'manual',href:'/docs/manual.pdf'},{id:'cert',type:'certificate',href:'https://example.com/cert.pdf'},{id:'unsafe',type:'datasheet',href:'javascript:alert(1)'},{id:'manual',type:'warranty',href:'/duplicate.pdf'}]);
    expect(documents).toHaveLength(2);
    expect(documents[0]).toMatchObject({displayLabel:'Használati útmutató'});
    expect(documents[1]).toMatchObject({displayLabel:'Tanúsítvány'});
  });

  it('fails closed on duplicate definitions and invalid enum/unit contracts',()=>{
    expect(()=>new StructuredProductSpecificationRegistry({groups:[{key:'x',label:'X'},{key:'x',label:'X2'}],specs:[]})).toThrow('STRUCTURED_SPEC_GROUP_DUPLICATE');
    expect(()=>new StructuredProductSpecificationRegistry({groups:[{key:'x',label:'X'}],specs:[{key:'mode',label:'Mode',groupKey:'x',valueType:'enum',scope:'product',enumOptions:[]}]})).toThrow('STRUCTURED_SPEC_ENUM_OPTIONS_INVALID');
  });
});
