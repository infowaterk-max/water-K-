export const CONTEXT_PROFILE_ENGINE_VERSION='shoporation.context-profile-engine.v1' as const;
export const CONTEXT_TYPE_REGISTRY_VERSION=1 as const;

export type ContextFieldType='text'|'number'|'enum'|'multi-enum';
export type ContextFieldDefinition={key:string;label:string;type:ContextFieldType;required?:boolean;options?:readonly string[]};
export type ContextTypeDefinition={typeKey:string;label:string;fields:readonly ContextFieldDefinition[]};
export type ContextTypeRegistry={version:1;types:readonly ContextTypeDefinition[]};
export type ContextProfileOwnerScope='customer'|'guest-session';
export type ContextProfile={profileId:string;typeKey:string;label:string;ownerScope:ContextProfileOwnerScope;saved:boolean;attributes:Readonly<Record<string,unknown>>};
export type ContextProfileViolation={code:string;path:string;message:string};
export type ContextSessionTransition={activeProfileId:string|null;previousProfileId:string|null;cartPreserved:true;cartMutationAllowed:false;catalogMode:'soft-ranking';requiresCatalogReset:false};
export type ContextProfileSaveIntent={engineVersion:typeof CONTEXT_PROFILE_ENGINE_VERSION;operation:'save-profile';explicitUserActionRequired:true;persistenceAuthority:'server-context-profile-authority';profile:ContextProfile};
export type ContextDiscoveryCandidate={id:string;label:string;href:string;eligible:boolean;contextAttributes:Readonly<Record<string,unknown>>};
export type ContextDiscoveryResult={id:string;label:string;href:string;affinity:'strong'|'partial'|'neutral'|'mismatch';matched:number;mismatched:number;reasons:string[];excludedByContext:false};

const KEY=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FORBIDDEN_HEALTH_KEY=/(?:^|[._-])(health|medical|diagnosis|disease|condition|medication|medicine|allergy|allergies|veterinary|vet)(?:$|[._-])/i;
const safeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://');
const issue=(out:ContextProfileViolation[],code:string,path:string,message:string)=>out.push({code,path,message});

export const PET_CONTEXT_TYPE:ContextTypeDefinition=Object.freeze({
  typeKey:'pet',
  label:'Kisállat',
  fields:[
    {key:'species',label:'Faj',type:'enum',required:true,options:['dog','cat','other']},
    {key:'size',label:'Méret',type:'enum',options:['xs','s','m','l','xl']},
    {key:'life-stage',label:'Életszakasz',type:'enum',options:['young','adult','senior']},
    {key:'weight-kg',label:'Testsúly (kg)',type:'number'},
    {key:'preferences',label:'Preferenciák',type:'multi-enum',options:['dry','wet','snack','toy','care','outdoor','indoor']},
  ],
} as const);

export const DEFAULT_CONTEXT_TYPE_REGISTRY:ContextTypeRegistry=Object.freeze({version:CONTEXT_TYPE_REGISTRY_VERSION,types:[PET_CONTEXT_TYPE]});

export function validateContextTypeRegistry(registry:ContextTypeRegistry):ContextProfileViolation[]{
  const out:ContextProfileViolation[]=[];
  if(registry.version!==1)issue(out,'CONTEXT_REGISTRY_VERSION_UNSUPPORTED','version','Only context registry v1 is supported.');
  const typeKeys=new Set<string>();
  registry.types.forEach((type,index)=>{
    const path=`types.${index}`;
    if(!KEY.test(type.typeKey)||typeKeys.has(type.typeKey))issue(out,'CONTEXT_TYPE_KEY_INVALID',`${path}.typeKey`,'Context type key must be unique and lowercase key-safe.');typeKeys.add(type.typeKey);
    if(!type.label.trim())issue(out,'CONTEXT_TYPE_LABEL_REQUIRED',`${path}.label`,'Context type label is required.');
    const fieldKeys=new Set<string>();
    type.fields.forEach((field,fi)=>{
      const fp=`${path}.fields.${fi}`;
      if(!KEY.test(field.key)||fieldKeys.has(field.key))issue(out,'CONTEXT_FIELD_KEY_INVALID',`${fp}.key`,'Context field key must be unique and lowercase key-safe.');fieldKeys.add(field.key);
      if(FORBIDDEN_HEALTH_KEY.test(field.key))issue(out,'CONTEXT_HEALTH_FIELD_FORBIDDEN',`${fp}.key`,'Health, veterinary and medical fields are outside the context profile contract.');
      if(!field.label.trim())issue(out,'CONTEXT_FIELD_LABEL_REQUIRED',`${fp}.label`,'Context field label is required.');
      if((field.type==='enum'||field.type==='multi-enum')&&(!field.options?.length||new Set(field.options).size!==field.options.length))issue(out,'CONTEXT_FIELD_OPTIONS_INVALID',`${fp}.options`,'Enum fields require a non-empty unique option list.');
    });
  });
  return out;
}

function validateFieldValue(field:ContextFieldDefinition,value:unknown){
  if(value===undefined||value===null||value==='')return !field.required;
  if(field.type==='text')return typeof value==='string'&&value.trim().length>0;
  if(field.type==='number')return typeof value==='number'&&Number.isFinite(value)&&value>=0;
  if(field.type==='enum')return typeof value==='string'&&Boolean(field.options?.includes(value));
  return Array.isArray(value)&&value.every(item=>typeof item==='string'&&Boolean(field.options?.includes(item)))&&new Set(value).size===value.length;
}

export function validateContextProfile(input:{registry:ContextTypeRegistry;profile:ContextProfile}):ContextProfileViolation[]{
  const out=validateContextTypeRegistry(input.registry);if(out.length)return out;
  const {profile}=input;
  if(!ID.test(profile.profileId))issue(out,'CONTEXT_PROFILE_ID_INVALID','profileId','Profile id must be a stable identifier.');
  if(!profile.label.trim())issue(out,'CONTEXT_PROFILE_LABEL_REQUIRED','label','Profile label is required.');
  const type=input.registry.types.find(candidate=>candidate.typeKey===profile.typeKey);
  if(!type){issue(out,'CONTEXT_PROFILE_TYPE_UNKNOWN','typeKey','Profile type is not registered.');return out;}
  const allowed=new Set(type.fields.map(field=>field.key));
  for(const key of Object.keys(profile.attributes))if(!allowed.has(key)||FORBIDDEN_HEALTH_KEY.test(key))issue(out,'CONTEXT_PROFILE_ATTRIBUTE_FORBIDDEN',`attributes.${key}`,'Profile contains an unregistered or health-related attribute.');
  type.fields.forEach(field=>{if(!validateFieldValue(field,profile.attributes[field.key]))issue(out,'CONTEXT_PROFILE_ATTRIBUTE_INVALID',`attributes.${field.key}`,'Profile attribute is missing or invalid for its field definition.');});
  if(profile.ownerScope==='guest-session'&&profile.saved)issue(out,'CONTEXT_GUEST_SAVED_STATE_INVALID','saved','Guest-session profiles cannot claim persisted saved state without server persistence.');
  return out;
}

export function switchActiveContext(input:{profiles:readonly ContextProfile[];currentProfileId?:string|null;nextProfileId?:string|null}):ContextSessionTransition|null{
  const next=input.nextProfileId??null;
  if(next!==null&&!input.profiles.some(profile=>profile.profileId===next))return null;
  return{activeProfileId:next,previousProfileId:input.currentProfileId??null,cartPreserved:true,cartMutationAllowed:false,catalogMode:'soft-ranking',requiresCatalogReset:false};
}

export function buildContextProfileSaveIntent(input:{registry:ContextTypeRegistry;profile:ContextProfile}):ContextProfileSaveIntent|null{
  if(validateContextProfile(input).length)return null;
  return{engineVersion:CONTEXT_PROFILE_ENGINE_VERSION,operation:'save-profile',explicitUserActionRequired:true,persistenceAuthority:'server-context-profile-authority',profile:{...input.profile,attributes:{...input.profile.attributes}}};
}

function comparable(value:unknown):string[]{
  if(Array.isArray(value))return value.filter(item=>typeof item==='string'||typeof item==='number'||typeof item==='boolean').map(String);
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return[String(value)];
  return[];
}

export function buildContextAwareDiscovery(input:{registry:ContextTypeRegistry;profile:ContextProfile|null;candidates:readonly ContextDiscoveryCandidate[]}):ContextDiscoveryResult[]{
  if(input.profile&&validateContextProfile({registry:input.registry,profile:input.profile}).length)return[];
  const profileAttributes=input.profile?.attributes??{};
  return input.candidates.filter(candidate=>candidate.eligible&&safeHref(candidate.href)).map(candidate=>{
    let matched=0,mismatched=0;const reasons:string[]=[];
    for(const[key,profileValue]of Object.entries(profileAttributes)){
      const wanted=comparable(profileValue),actual=comparable(candidate.contextAttributes[key]);if(!wanted.length||!actual.length)continue;
      const overlap=wanted.some(value=>actual.includes(value));if(overlap){matched+=1;reasons.push(`${key}: egyező kontextus`);}else{mismatched+=1;reasons.push(`${key}: eltérő kontextus`);}
    }
    const affinity:ContextDiscoveryResult['affinity']=matched>0&&mismatched===0?'strong':matched>0?'partial':mismatched>0?'mismatch':'neutral';
    return{id:candidate.id,label:candidate.label,href:candidate.href,affinity,matched,mismatched,reasons,excludedByContext:false as const};
  }).sort((a,b)=>b.matched-a.matched||a.mismatched-b.mismatched||a.label.localeCompare(b.label,'hu')||a.id.localeCompare(b.id));
}

export const CONTEXT_RUNTIME_CONTRACT=Object.freeze({customerIsContext:false,activeContextHardLocksCatalog:false,contextSwitchClearsCart:false,guestSaveRequiresExplicitAction:true,previewUsesProductionRules:true,demoOnlyProfilesAllowed:false,healthOrVeterinaryDataAllowed:false} as const);
export const CONTEXT_PROFILE_TEMPLATE_SWITCH_MUTATION_BOUNDARY=Object.freeze({storefrontPageDrafts:true,contextProfiles:false,activeContext:false,products:false,variants:false,pricing:false,inventory:false,carts:false,customers:false,orders:false} as const);
