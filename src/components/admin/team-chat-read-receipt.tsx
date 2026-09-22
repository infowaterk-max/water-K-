'use client';

import{useEffect,useRef}from'react';
import{markThreadReadAction}from'@/app/admin/kommunikacio/chat/actions';

export function TeamChatReadReceipt({threadId,unread}:{threadId:string;unread:boolean}){
  const sent=useRef(false);
  useEffect(()=>{
    if(!unread||sent.current)return;
    sent.current=true;
    const form=new FormData();form.set('threadId',threadId);
    void markThreadReadAction(form);
  },[threadId,unread]);
  return null;
}
