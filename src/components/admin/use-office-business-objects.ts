'use client';

import{useEffect,useState}from'react';

export type OfficeBusinessObjectOption={value:string;label:string};
let cache:Promise<OfficeBusinessObjectOption[]>|null=null;
function load(){if(!cache){cache=fetch('/api/admin/office/business-objects',{cache:'no-store'}).then(async response=>{if(!response.ok)return[];const payload=(await response.json().catch(()=>({})))as{options?:OfficeBusinessObjectOption[]};return Array.isArray(payload.options)?payload.options:[]}).catch(()=>[])}return cache}
export function useOfficeBusinessObjects(enabled:boolean){const[options,setOptions]=useState<OfficeBusinessObjectOption[]>([]);useEffect(()=>{let active=true;if(!enabled){setOptions([]);return()=>{active=false}}load().then(items=>{if(active)setOptions(items)});return()=>{active=false}},[enabled]);return options}
