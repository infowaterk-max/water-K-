import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';
const root=process.cwd();const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('customer and sales functional UX closure',()=>{
 test('customer list includes guest purchasers and uses customer-facing terminology',()=>{const page=read('src/app/admin/ugyfelek/page.tsx');expect(page).toContain("const guests:CustomerRow[]");expect(page).toContain("role:'guest'");expect(page).toContain('Vendégvásárló');expect(page).toContain('Ügyfelek és partnerek');expect(page).toContain('Átlagos rendelési érték');expect(page).not.toContain('Shoporation');expect(page).not.toContain('Repeat rate');expect(page).not.toContain('V9 szegmensek');});
 test('customer value table resolves human-readable customer identity and Hungarian labels',()=>{const page=read('src/app/admin/ugyfelertek/page.tsx');expect(page).toContain("from('profiles')");expect(page).toContain("platinum:'Platina'");expect(page).toContain("at_risk:'Kockázatos'");expect(page).toContain('<th>Ügyfél</th>');expect(page).toContain('Értékpont');expect(page).not.toContain('<th>Score</th>');});
 test('payment follow-up only targets actual pending online payment orders',()=>{const page=read('src/app/admin/utanakovetes/page.tsx');expect(page).toContain("o.status==='pending_payment'");expect(page).toContain('status=pending_payment');expect(page).not.toContain("o.status==='pending'&&");expect(page).toContain('24 óránál régebbi online fizetések');});
 test('partner role controls surface failed writes and confirm destructive changes',()=>{const control=read('src/components/admin/customer-role-control.tsx');expect(control).toContain('if(!response.ok)throw new Error');expect(control).toContain('window.confirm');expect(control).toContain('role="status"');});
 test('sales screens avoid unexplained pipeline/forecast/margin jargon in primary UI',()=>{const page=read('src/app/admin/ertekesites/page.tsx'),actions=read('src/components/admin/commercial-actions.tsx');expect(page).toContain('Nyitott lehetőség');expect(page).toContain('Várható érték');expect(page).toContain('elvárt minimum árrés');expect(page).not.toContain('Súlyozott forecast');expect(actions).toContain('Árrés ellenőrzése és jóváhagyás');expect(actions).toContain('Ajánlattervezet létrehozása');});
});
