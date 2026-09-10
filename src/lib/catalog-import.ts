export type CatalogChange={id:string;stock?:number;grossPrice?:number;netPrice?:number;active?:boolean};
export type ParsedCatalogRow={line:number;change:CatalogChange;error?:string};

export type CatalogOnboardingMapping={
  name:string;sku:string;netPrice:string;grossPrice:string;
  slug?:string;stock?:string;category?:string;attributes?:string;
  shortDescription?:string;description?:string;variantLabel?:string;seoTitle?:string;seoDescription?:string;
};
export type CatalogOnboardingDraft={
  line:number;name:string;slug:string;sku:string;netPrice:number;grossPrice:number;stock:number;
  category?:string;categorySlug?:string;attributes:Record<string,string>;
  shortDescription?:string;description?:string;variantLabel?:string;seoTitle?:string;seoDescription?:string;
};
export type ParsedCatalogOnboardingRow={line:number;draft?:CatalogOnboardingDraft;error?:string};

function delimiterFor(text:string){
  const line=(text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0]??'');
  let commas=0,semicolons=0,quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){if(quoted&&line[i+1]==='"')i++;else quoted=!quoted;continue}
    if(!quoted&&ch===',')commas++;else if(!quoted&&ch===';')semicolons++;
  }
  return semicolons>commas?';':',';
}
function parseMatrix(text:string){
  const delimiter=delimiterFor(text),rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(ch===delimiter&&!quoted){row.push(cell);cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()!==''))rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  row.push(cell);if(row.some(v=>v.trim()!==''))rows.push(row);return rows;
}
const int=(value:string,min:number,max:number)=>{if(value.trim()==='')return undefined;const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:null};
const normalized=(value:string)=>value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
export function slugifyCatalogValue(value:string){return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)}
export function catalogCsvHeaders(text:string){const matrix=parseMatrix(text.replace(/^\uFEFF/,''));return matrix[0]?.map(h=>h.trim()).filter(Boolean)??[]}

export function suggestCatalogOnboardingMapping(headers:string[]):Partial<CatalogOnboardingMapping>{
  const byNormalized=new Map(headers.map(header=>[normalized(header),header]));
  const find=(...aliases:string[])=>aliases.map(alias=>byNormalized.get(alias)).find(Boolean);
  return{
    name:find('name','product_name','termeknev','termek_nev','title'),
    sku:find('sku','cikkszam','cikkszam_sku','variant_sku'),
    slug:find('slug','url_slug'),
    netPrice:find('net_price','netprice','net_price_huf','netto_ar','netto'),
    grossPrice:find('gross_price','grossprice','gross_price_huf','brutto_ar','brutto'),
    stock:find('stock','stock_quantity','keszlet'),
    category:find('category','category_name','kategoria'),
    attributes:find('attributes','attributes_json','tulajdonsagok','attributumok'),
    shortDescription:find('short_description','rovid_leiras'),
    description:find('description','leiras'),
    variantLabel:find('variant_label','valtozat','variant'),
    seoTitle:find('seo_title','meta_title','seo_cim'),
    seoDescription:find('seo_description','meta_description','meta_leiras')
  };
}

function parseAttributes(raw:string){
  const value=raw.trim();if(!value)return{value:{}as Record<string,string>};
  let entries:[string,string][]=[];
  if(value.startsWith('{')){
    try{const parsed=JSON.parse(value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return{error:'Az attribútum JSON objektum legyen.'};entries=Object.entries(parsed).map(([k,v])=>[k,String(v)]);}catch{return{error:'Hibás attribútum JSON.'}}
  }else{
    entries=value.split('|').filter(Boolean).map(part=>{const at=part.indexOf('=');return at<1?['','']:[part.slice(0,at),part.slice(at+1)]});
  }
  const result:Record<string,string>={};
  for(const[k0,v0]of entries){const k=k0.trim(),v=v0.trim();if(!k||!v)return{error:'Az attribútum formátuma kulcs=érték legyen.'};if(k.length>120||v.length>500)return{error:'Túl hosszú attribútum.'};result[k]=v;}
  return{value:result};
}

export function parseCatalogOnboardingCsv(text:string,mapping:CatalogOnboardingMapping):ParsedCatalogOnboardingRow[]{
  const matrix=parseMatrix(text.replace(/^\uFEFF/,''));if(matrix.length<2)return[];
  const headers=matrix[0].map(h=>h.trim());
  const index=(header?:string)=>header?headers.indexOf(header):-1;
  const required:[keyof CatalogOnboardingMapping,string][]=[['name','Terméknév'],['sku','SKU'],['netPrice','Nettó ár'],['grossPrice','Bruttó ár']];
  const missing=required.filter(([key])=>index(mapping[key])<0).map(([,label])=>label);
  if(missing.length)return[{line:1,error:`Hiányzó kötelező oszlop-hozzárendelés: ${missing.join(', ')}`}];
  const seenSku=new Set<string>(),seenSlug=new Set<string>();
  return matrix.slice(1).map((cells,rowIndex)=>{
    const line=rowIndex+2,cell=(header?:string)=>{const i=index(header);return i>=0?(cells[i]??'').trim():''};
    const name=cell(mapping.name),sku=cell(mapping.sku),slug=slugifyCatalogValue(cell(mapping.slug)||name);
    const net=int(cell(mapping.netPrice),0,10000000),gross=int(cell(mapping.grossPrice),0,10000000),stock=int(cell(mapping.stock),0,100000);
    const category=cell(mapping.category),attributes=parseAttributes(cell(mapping.attributes)),errors:string[]=[];
    if(!name||name.length>200)errors.push('Hibás vagy hiányzó terméknév');
    if(!sku||sku.length>120)errors.push('Hibás vagy hiányzó SKU');
    if(!slug)errors.push('Nem képezhető slug');
    if(net===undefined||net===null)errors.push('Hibás vagy hiányzó nettó ár');
    if(gross===undefined||gross===null)errors.push('Hibás vagy hiányzó bruttó ár');
    if(stock===null)errors.push('Hibás készlet');
    if(category.length>120)errors.push('Túl hosszú kategórianév');
    if(attributes.error)errors.push(attributes.error);
    const skuKey=sku.toLowerCase();if(sku&&seenSku.has(skuKey))errors.push('Duplikált SKU az importban');else if(sku)seenSku.add(skuKey);
    if(slug&&seenSlug.has(slug))errors.push('Duplikált slug az importban');else if(slug)seenSlug.add(slug);
    if(errors.length)return{line,error:errors.join(', ')};
    const shortDescription=cell(mapping.shortDescription),description=cell(mapping.description),variantLabel=cell(mapping.variantLabel),seoTitle=cell(mapping.seoTitle),seoDescription=cell(mapping.seoDescription);
    if(shortDescription.length>1000)return{line,error:'Túl hosszú rövid leírás'};
    if(description.length>20000)return{line,error:'Túl hosszú leírás'};
    if(seoTitle.length>200)return{line,error:'Túl hosszú SEO cím'};
    if(seoDescription.length>500)return{line,error:'Túl hosszú meta description'};
    return{line,draft:{line,name,slug,sku,netPrice:net as number,grossPrice:gross as number,stock:stock??0,
      category:category||undefined,categorySlug:category?slugifyCatalogValue(category):undefined,attributes:attributes.value??{},
      shortDescription:shortDescription||undefined,description:description||undefined,variantLabel:variantLabel||undefined,seoTitle:seoTitle||undefined,seoDescription:seoDescription||undefined}};
  });
}

export function parseCatalogCsv(text:string):ParsedCatalogRow[]{const matrix=parseMatrix(text.replace(/^\uFEFF/,''));if(matrix.length<2)return[];const headers=matrix[0].map(h=>h.trim().toLowerCase());const idx=(...names:string[])=>headers.findIndex(h=>names.includes(h));const idI=idx('id','variant_id'),stockI=idx('stock','stock_quantity'),grossI=idx('gross_price','grossprice','gross_price_huf'),netI=idx('net_price','netprice','net_price_huf'),activeI=idx('active');return matrix.slice(1).map((cells,index)=>{const id=idI>=0?(cells[idI]??'').trim():'';const change:CatalogChange={id};const errors:string[]=[];if(!id)errors.push('Hiányzó id');if(stockI>=0){const v=int(cells[stockI]??'',0,100000);if(v===null)errors.push('Hibás készlet');else if(v!==undefined)change.stock=v}if(grossI>=0){const v=int(cells[grossI]??'',0,10000000);if(v===null)errors.push('Hibás bruttó ár');else if(v!==undefined)change.grossPrice=v}if(netI>=0){const v=int(cells[netI]??'',0,10000000);if(v===null)errors.push('Hibás nettó ár');else if(v!==undefined)change.netPrice=v}if(activeI>=0&&(cells[activeI]??'').trim()!==''){const raw=(cells[activeI]??'').trim().toLowerCase();if(['true','1','igen','yes'].includes(raw))change.active=true;else if(['false','0','nem','no'].includes(raw))change.active=false;else errors.push('Hibás aktív érték')}if(Object.keys(change).length===1)errors.push('Nincs módosítható adat');return{line:index+2,change,error:errors.length?errors.join(', '):undefined}});}
