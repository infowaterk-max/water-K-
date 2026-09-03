import fs from 'node:fs';
import path from 'node:path';
import{describe,expect,test}from'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('customer order service UX',()=>{
  test('order detail explicitly scopes the order to the authenticated customer and reports partial failures',()=>{
    const page=read('src/app/fiokom/rendeles/[id]/page.tsx');
    expect(page).toContain(".eq('customer_id',user.id)");
    expect(page).toContain('orderError');
    expect(page).toContain('itemsError||eventsError');
    expect(page).toContain('A rendelést ne add le újra emiatt.');
  });

  test('return center does not turn database errors into empty-state claims',()=>{
    const page=read('src/app/fiokom/visszakuldes/page.tsx');
    expect(page).toContain('ordersError||casesError||itemsError');
    expect(page).toContain('Hiányos lista mellett ne add le ugyanazt az igényt újra.');
    expect(page).toContain("!casesError&&!(cases??[]).length");
  });

  test('confirmation and buying information use customer-facing wording',()=>{
    const confirmation=read('src/app/rendeles-sikeres/page.tsx');
    const info=read('src/app/szallitas-es-fizetes/page.tsx');
    expect(confirmation).toContain('orderStatusLabel(order.status)');
    expect(info).toContain('A véglegesítés előtt újra ellenőrizzük');
    expect(info).not.toContain('A szerver újraellenőrzi');
    expect(info).not.toContain('integrációs feladatokat');
  });
});
