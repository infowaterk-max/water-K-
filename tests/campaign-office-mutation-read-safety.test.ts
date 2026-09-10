import fs from'node:fs';
import path from'node:path';
import{describe,expect,it}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('campaign and office workspace mutation safety',()=>{
 it('campaign creation and lifecycle actions require the evidence each mutation actually depends on',()=>{
   const listPage=read('src/app/admin/kampanyok/page.tsx');
   const detailPage=read('src/app/admin/kampanyok/[id]/page.tsx');

   expect(listPage).toContain('const loadError=Boolean(ce||ve||oe||itemError||items.length>=100000),canCreateCampaign=!ce');
   expect(listPage).toContain('canCreateCampaign?<CampaignCreateForm/>');
   expect(listPage).toContain('Kampány létrehozása átmenetileg letiltva');

   expect(detailPage).toContain("if(campaignError)throw new Error('A kampány adatai most nem tölthetők be.');");
   expect(detailPage).toContain('const loadError=Boolean(recipientError||conversionError||eventError);');
   expect(detailPage).toContain('{!loadError?<CampaignActions campaignId={campaign.id} status={campaign.status}/>:');
   expect(detailPage).toContain('Kampányművelet átmenetileg letiltva.');
 });

 it('customer email and Team Chat use separate write surfaces and both fail closed',()=>{
   const email=read('src/app/admin/kommunikacio/iroda/page.tsx');
   const chat=read('src/app/admin/kommunikacio/chat/page.tsx');

   expect(email).toContain(".eq('conversation_type','customer')");
   expect(email).toContain('!loadError?<form action={updateThreadAction}');
   expect(email).toContain('form action={markCustomerThreadReadAction}');
   expect(email).toContain('<OfficeCustomerEmailForm');
   expect(email).toContain('<form action={createTaskAction}');
   expect(email).not.toContain('createPrivateThreadAction');
   expect(email).not.toContain('OfficePrivateMessageForm');
   expect(email).not.toContain('managePrivateParticipantAction');

   expect(chat).toContain(".in('conversation_type',['internal_private','internal_group'])");
   expect(chat).toContain('{!loadError?<form action={createPrivateThreadAction}');
   expect(chat).toContain('sendDirectMessageAction');
   expect(chat).toContain('managePrivateParticipantAction');
   expect(chat).toContain('transferPrivateThreadOwnerAction');
   expect(chat).toContain('!selectedThread.archived_at&&!loadError&&<div className="teamChatComposer"');
   expect(chat).not.toContain('OfficeCustomerEmailForm');
   expect(chat).not.toContain('customer_email');
 });
});
