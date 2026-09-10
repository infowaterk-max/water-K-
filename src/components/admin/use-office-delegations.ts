'use client';

import{useEffect,useState}from'react';

export type OfficeDelegationOption={delegationId:string;userId:string;label:string;scopeType:'all'|'topic'|'mailbox';scopeValue:string|null};
export function useOfficeDelegations(permission:'office.thread.reply'|'office.email.compose',threadId?:string){const[options,setOptions]=useState<OfficeDelegationOption[]>([]);useEffect(()=>{let active=true;const params=new URLSearchParams({permission});if(threadId)params.set('threadId',threadId);fetch(`/api/admin/office/delegations?${params.toString()}`,{cache:'no-store'}).then(async response=>{if(!response.ok)return{options:[]};return await response.json() as{options?:OfficeDelegationOption[]}}).then(payload=>{if(active)setOptions(Array.isArray(payload.options)?payload.options:[])}).catch(()=>{if(active)setOptions([])});return()=>{active=false}},[permission,threadId]);return options}
