import fs from'node:fs';
import path from'node:path';
import{describe,expect,it}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('campaign and office workspace mutation safety',()=>{
 it('campaign lifecycle actions require complete campaign evidence',()=>{
   const page=read('src/app/admin/kampanyok/page.tsx');
   expect(page).toContain('const canMutate=!loadError');
   expect(page).toContain('canMutate&&<form action={createCampaignAction}');
   expect(page).toContain('canMutate&&campaigns.map');
 });

 it('customer email and Team Chat use separate write surfaces and both fail closed',()=>{
   const email=read('src/app/admin/kommunikacio/iroda/page.tsx');
   const chat=read('src/app/admin/kommunikacio/chat/page.tsx');

   expect(email).toContain(".eq('conversation_type','customer')");
   expect(email).toContain('!loadError&&<form action={updateThreadAction}');
   expect(email).toContain('form action={markCustomerThreadReadAction}');
   expect(email).toContain('<OfficeCustomerEmailForm');
   expect(email).toContain('<form action={createTaskAction}');
   expect(email).not.toContain('createPrivateThreadAction');
   expect(email).not.toContain('OfficePrivateMessageForm');
   expect(email).not.toContain('managePrivateParticipantAction');

   expect(chat).toContain(".in('conversation_type',['internal_private','internal_group'])");
   expect(chat).toContain('{!loadError?<form action={createPrivateThreadAction}');
   expect(chat).toContain('managePrivateParticipantAction');
   expect(chat).toContain('transferPrivateThreadOwnerAction');
   expect(chat).toContain('{!archived&&!loadError&&<OfficePrivateMessageForm');
   expect(chat).not.toContain('OfficeCustomerEmailForm');
   expect(chat).not.toContain('customer_email');
 });
});
