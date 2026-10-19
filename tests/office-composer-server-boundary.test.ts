import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,it,expect} from 'vitest';

const file=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');

describe('Digital Office composer Server Action module boundary',()=>{
 it('exports only async functions from the use server module',()=>{
   const s=file('src/app/admin/kommunikacio/iroda/composer-actions.ts');
   expect(s.startsWith("'use server';")).toBe(true);
   expect(s).not.toMatch(/^export (?:const|let|var|class|\{|\*)/m);
   expect(s).toContain("import type {OfficeComposerActionState} from '@/lib/office/composer-state'");
   expect(s).not.toContain('export const officeComposerInitialState');
   expect(s).toContain('export async function saveNewEmailDraftAction');
   expect(s).toContain('export async function autosaveNewEmailDraftAction');
 });
 it('exposes initial state only from a client/server-neutral module',()=>{
   const s=file('src/lib/office/composer-state.ts');
   expect(s).toContain('export const officeComposerInitialState');
   expect(s).not.toContain("'use server'");
 });
 it('new and reply composers depend on action functions but not non-async server values',()=>{
   for(const name of ['office-new-email-composer.tsx','office-customer-email-form.tsx']){
     const s=file('src/components/admin/'+name);
     expect(s).toContain("from'@/lib/office/composer-state'");
     expect(s).toContain("from'@/app/admin/kommunikacio/iroda/composer-actions'");
     expect(s).not.toMatch(/officeComposerInitialState[^\n]*from'@\/app\/admin\/kommunikacio\/iroda\/composer-actions'/);
   }
 });
 it('catches failed Server Actions and exposes recoverable autosave errors',()=>{
   const s=file('src/components/admin/use-office-draft-autosave.ts');
   expect(s).toContain('const promise=Promise.resolve().then(()=>action(input))');
   expect(s).toContain("result={status:'error',message:'A piszkozat mentése megszakadt. Próbáld újra.'}");
   expect(s).toContain('queuedRef.current=false;');
   expect(s).toContain('inFlightRef.current=null;');
 });
 it('draft autosave uses shared state type, not a runtime server-module dependency',()=>{
   const s=file('src/components/admin/use-office-draft-autosave.ts');
   expect(s).toContain("import type{OfficeComposerActionState}from'@/lib/office/composer-state'");
 });
});
