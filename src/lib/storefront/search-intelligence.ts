export const normalizeStorefrontSearch=(value:string)=>value
  .toLocaleLowerCase('hu-HU')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .trim();

const SEARCH_ALIAS_GROUPS:readonly (readonly string[])[]=[
  ['playstation','ps','ps4','ps5'],
  ['xbox','xboxone','seriesx','seriess'],
  ['nintendo','switch','nintendoswitch'],
  ['pc','szamitogep','computer'],
  ['kontroller','controller','gamepad'],
  ['fejhallgato','headset','audio'],
  ['verseny','racing','race'],
  ['kaland','adventure'],
  ['kooperativ','coop','co-op'],
  ['arcade','arkad'],
  ['arena','kompetitiv','competitive'],
] as const;

const aliasIndex=new Map<string,readonly string[]>();
for(const rawGroup of SEARCH_ALIAS_GROUPS){
  const group=[...new Set(rawGroup.map(normalizeStorefrontSearch).filter(Boolean))];
  for(const token of group)aliasIndex.set(token,group);
}

function withinOneEdit(a:string,b:string){
  if(a===b)return true;
  if(Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length){
    let mismatch=-1;
    for(let i=0;i<a.length;i++){
      if(a[i]===b[i])continue;
      if(mismatch!==-1){
        const transposed=i===mismatch+1
          &&a[mismatch]===b[i]
          &&a[i]===b[mismatch]
          &&a.slice(i+1)===b.slice(i+1);
        return transposed;
      }
      mismatch=i;
    }
    return mismatch!==-1;
  }
  const [shorter,longer]=a.length<b.length?[a,b]:[b,a];
  let i=0,j=0,skipped=false;
  while(i<shorter.length&&j<longer.length){
    if(shorter[i]===longer[j]){i++;j++;continue;}
    if(skipped)return false;
    skipped=true;
    j++;
  }
  return true;
}

const tokens=(value:string)=>normalizeStorefrontSearch(value).split(/[^a-z0-9]+/).filter(Boolean);

function tokenMatches(queryToken:string,words:readonly string[],full:string){
  const aliases=aliasIndex.get(queryToken)??[queryToken];
  return aliases.some(alias=>{
    if(full.includes(alias))return true;
    return words.some(word=>{
      if(word===alias||word.startsWith(alias)||alias.startsWith(word))return true;
      return alias.length>=4&&word.length>=4&&withinOneEdit(alias,word);
    });
  });
}

export function smartStorefrontSearchMatch(query:string,values:readonly string[]){
  const queryTokens=tokens(query);
  if(!queryTokens.length)return true;
  const words=tokens(values.filter(Boolean).join(' '));
  const full=words.join(' ');
  return queryTokens.every(token=>tokenMatches(token,words,full));
}

export function storefrontSearchSuggestions(values:readonly string[],limit=24){
  const seen=new Set<string>(),result:string[]=[];
  for(const value of values){
    const clean=value.trim();
    if(!clean)continue;
    const key=normalizeStorefrontSearch(clean);
    if(!key||seen.has(key))continue;
    seen.add(key);
    result.push(clean);
    if(result.length>=limit)break;
  }
  return result;
}

export const STOREFRONT_SEARCH_ALIAS_GROUPS=SEARCH_ALIAS_GROUPS;
