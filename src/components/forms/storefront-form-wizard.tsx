'use client';

import {useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';

export type StorefrontFormWizardOption={value:string;label:string};
export type StorefrontFormWizardField={
  name:string;
  label:string;
  kind:'text'|'email'|'select'|'textarea';
  required?:boolean;
  minLength?:number;
  maxLength?:number;
  placeholder?:string;
  rows?:number;
  defaultValue?:string;
  options?:readonly StorefrontFormWizardOption[];
};
export type StorefrontFormWizardStep={
  id:string;
  title:string;
  copy?:string;
  fields:readonly StorefrontFormWizardField[];
};
export type StorefrontFormWizardStyles={
  form?:CSSProperties;
  step?:CSSProperties;
  grid?:CSSProperties;
  label?:CSSProperties;
  field?:CSSProperties;
  actions?:CSSProperties;
  progress?:CSSProperties;
  progressItem?:CSSProperties;
  primaryButton?:CSSProperties;
  secondaryButton?:CSSProperties;
  feedback?:CSSProperties;
};
type Feedback={kind:'success'|'error';message:string}|null;

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const value=(form:HTMLFormElement,name:string)=>String(new FormData(form).get(name)??'').trim();

function validateField(form:HTMLFormElement,field:StorefrontFormWizardField):string|null{
  const current=value(form,field.name);
  if(field.required&&!current)return `${field.label}: kitöltése kötelező.`;
  if(!current)return null;
  if(field.kind==='email'&&!emailPattern.test(current))return `${field.label}: adj meg érvényes e-mail-címet.`;
  if(field.minLength&&current.length<field.minLength)return `${field.label}: legalább ${field.minLength} karakter szükséges.`;
  if(field.maxLength&&current.length>field.maxLength)return `${field.label}: legfeljebb ${field.maxLength} karakter lehet.`;
  return null;
}

function validateFields(form:HTMLFormElement,fields:readonly StorefrontFormWizardField[]){
  return Object.fromEntries(fields.flatMap(field=>{const issue=validateField(form,field);return issue?[[field.name,issue]]:[]}));
}

function payload(form:HTMLFormElement){
  const data=new FormData(form),result:Record<string,string>={};
  for(const[key,raw]of data.entries())result[key]=String(raw).trim();
  return result;
}

export function StorefrontFormWizard({
  steps,endpoint,submitLabel='Küldés',busyLabel='Küldés…',nextLabel='Tovább',backLabel='Vissza',
  successMessage,styles={},honeypotName='website',
}:{
  steps:readonly StorefrontFormWizardStep[];
  endpoint:string;
  submitLabel?:string;
  busyLabel?:string;
  nextLabel?:string;
  backLabel?:string;
  successMessage:(result:Record<string,unknown>)=>string;
  styles?:StorefrontFormWizardStyles;
  honeypotName?:string;
}){
  const formRef=useRef<HTMLFormElement|null>(null);
  const[stepIndex,setStepIndex]=useState(0),[errors,setErrors]=useState<Record<string,string>>({}),[ready,setReady]=useState(false);
  const[busy,setBusy]=useState(false),[feedback,setFeedback]=useState<Feedback>(null);
  const step=steps[stepIndex]??steps[0];
  const finalStep=stepIndex===steps.length-1;

  const refresh=()=>{
    const form=formRef.current;if(!form||!step){setReady(false);return}
    const next=validateFields(form,step.fields);setErrors(next);setReady(Object.keys(next).length===0);
    if(feedback?.kind==='error')setFeedback(null);
  };

  useEffect(()=>{refresh();},[stepIndex]);

  const next=()=>{
    const form=formRef.current;if(!form||!step)return;
    const nextErrors=validateFields(form,step.fields);setErrors(nextErrors);
    if(Object.keys(nextErrors).length)return;
    setStepIndex(current=>Math.min(steps.length-1,current+1));
  };

  const back=()=>{setErrors({});setFeedback(null);setStepIndex(current=>Math.max(0,current-1));};

  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(busy)return;
    const form=event.currentTarget;
    const allErrors=Object.assign({},...steps.map(item=>validateFields(form,item.fields))) as Record<string,string>;
    setErrors(allErrors);
    if(Object.keys(allErrors).length){
      const firstInvalid=steps.findIndex(item=>item.fields.some(field=>allErrors[field.name]));
      if(firstInvalid>=0)setStepIndex(firstInvalid);
      setFeedback({kind:'error',message:'Az űrlap még nem küldhető el. Ellenőrizd a jelzett mezőket.'});
      return;
    }
    setBusy(true);setFeedback(null);
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload(form))});
      const result=await response.json().catch(()=>({})) as Record<string,unknown>;
      if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Az űrlap nem küldhető el.');
      setFeedback({kind:'success',message:successMessage(result)});
      form.reset();setStepIndex(0);setErrors({});setReady(false);
    }catch(reason){setFeedback({kind:'error',message:reason instanceof Error?reason.message:'Az űrlap nem küldhető el.'});}
    finally{setBusy(false)}
  };

  if(!step||!steps.length)return null;
  const fieldStyle:CSSProperties={width:'100%',minHeight:'2.9rem',padding:'.72rem .82rem',border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'var(--shoporation-radius-s,.375rem)',background:'var(--shoporation-color-background,#0b0a1a)',color:'var(--shoporation-color-text,#fff)',font:'inherit',...(styles.field??{})};
  const labelStyle:CSSProperties={display:'grid',gap:'.38rem',fontSize:'.82rem',fontWeight:700,color:'var(--shoporation-color-text,#fff)',...(styles.label??{})};

  return <form ref={formRef} noValidate onInput={refresh} onSubmit={submit} data-storefront-form-wizard="shared-v1" style={{display:'grid',gap:'var(--shoporation-space-s,1rem)',...(styles.form??{})}}>
    <nav aria-label="Űrlap lépései" style={{display:'grid',gridTemplateColumns:`repeat(${steps.length},minmax(0,1fr))`,gap:'.45rem',...(styles.progress??{})}}>
      {steps.map((item,index)=><span key={item.id} aria-current={index===stepIndex?'step':undefined} style={{padding:'.48rem .6rem',border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'var(--shoporation-radius-s,.375rem)',fontSize:'.75rem',fontWeight:index===stepIndex?900:650,opacity:index<=stepIndex?1:.6,...(styles.progressItem??{})}}><strong>{index+1}.</strong> {item.title}</span>)}
    </nav>

    {steps.map((item,index)=><fieldset key={item.id} hidden={index!==stepIndex} aria-labelledby={`wizard-step-${item.id}`} style={{border:0,padding:0,margin:0,display:index===stepIndex?'grid':'none',gap:'var(--shoporation-space-s,1rem)',...(styles.step??{})}}>
      <legend id={`wizard-step-${item.id}`} style={{fontWeight:900,fontSize:'1rem',padding:0}}>{item.title}</legend>
      {item.copy?<p style={{margin:0,color:'var(--shoporation-color-muted-text,#b8b4c7)',lineHeight:1.5}}>{item.copy}</p>:null}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(14rem,1fr))',gap:'var(--shoporation-space-s,1rem)',...(styles.grid??{})}}>
        {item.fields.map(field=><label key={field.name} style={labelStyle}>{field.label}
          {field.kind==='select'?<select name={field.name} defaultValue={field.defaultValue??field.options?.[0]?.value??''} aria-invalid={Boolean(errors[field.name])||undefined} aria-describedby={errors[field.name]?`${field.name}-error`:undefined} style={fieldStyle}>{(field.options??[]).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>
          :field.kind==='textarea'?<textarea name={field.name} required={field.required} minLength={field.minLength} maxLength={field.maxLength} rows={field.rows??6} placeholder={field.placeholder} aria-invalid={Boolean(errors[field.name])||undefined} aria-describedby={errors[field.name]?`${field.name}-error`:undefined} style={{...fieldStyle,resize:'vertical'}}/>
          :<input name={field.name} type={field.kind} required={field.required} minLength={field.minLength} maxLength={field.maxLength} placeholder={field.placeholder} aria-invalid={Boolean(errors[field.name])||undefined} aria-describedby={errors[field.name]?`${field.name}-error`:undefined} style={fieldStyle}/>}
          {errors[field.name]?<small id={`${field.name}-error`} role="alert" style={{color:'var(--shoporation-color-danger,#ff6b6b)',fontWeight:650}}>{errors[field.name]}</small>:null}
        </label>)}
      </div>
    </fieldset>)}

    <input name={honeypotName} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:'absolute',left:'-9999px',width:1,height:1}}/>
    <div style={{display:'flex',gap:'.65rem',flexWrap:'wrap',...(styles.actions??{})}}>
      {stepIndex>0?<button type="button" onClick={back} style={{minHeight:'2.9rem',padding:'.72rem 1.1rem',border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'var(--shoporation-radius-s,.375rem)',background:'transparent',color:'inherit',fontWeight:800,...(styles.secondaryButton??{})}}>{backLabel}</button>:null}
      {finalStep?<button type="submit" disabled={busy||!ready} style={{minHeight:'2.9rem',padding:'.72rem 1.1rem',border:'1px solid var(--shoporation-color-primary,#5c7cfa)',borderRadius:'var(--shoporation-radius-s,.375rem)',background:'var(--shoporation-color-primary,#5c7cfa)',color:'var(--shoporation-color-primary-contrast,#fff)',fontWeight:900,cursor:busy?'wait':ready?'pointer':'not-allowed',opacity:ready&&!busy?1:.48,...(styles.primaryButton??{})}}>{busy?busyLabel:submitLabel}</button>
      :<button type="button" disabled={!ready} onClick={next} style={{minHeight:'2.9rem',padding:'.72rem 1.1rem',border:'1px solid var(--shoporation-color-primary,#5c7cfa)',borderRadius:'var(--shoporation-radius-s,.375rem)',background:'var(--shoporation-color-primary,#5c7cfa)',color:'var(--shoporation-color-primary-contrast,#fff)',fontWeight:900,cursor:ready?'pointer':'not-allowed',opacity:ready?1:.48,...(styles.primaryButton??{})}}>{nextLabel}</button>}
    </div>
    {feedback?<p role={feedback.kind==='error'?'alert':'status'} aria-live="polite" style={{margin:0,fontWeight:700,color:feedback.kind==='error'?'var(--shoporation-color-danger,#ff6b6b)':'var(--shoporation-color-text,#fff)',...(styles.feedback??{})}}>{feedback.message}</p>:null}
  </form>;
}
