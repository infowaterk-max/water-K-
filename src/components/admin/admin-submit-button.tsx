'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

type Props={children:ReactNode;pendingLabel?:string;className?:string;form?:string;name?:string;value?:string;disabled?:boolean};

export function AdminSubmitButton({children,pendingLabel='Mentés…',className='btn btnPrimary',form,name,value,disabled=false}:Props){
  const{pending}=useFormStatus();
  return <button className={className} type="submit" form={form} name={name} value={value} disabled={disabled||pending}>{pending?pendingLabel:children}</button>;
}
