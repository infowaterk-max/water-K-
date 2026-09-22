import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin mobile navigation regression',()=>{
  test('route-level responsive CSS explicitly re-enables the admin navigation below 850px',()=>{
    const global=read('src/app/globals.css');
    const admin=read('src/app/admin/admin-responsive-final.css');
    expect(global).toContain('@media(max-width:850px)');
    expect(global).toContain('.adminSide{display:none}');
    expect(admin).toContain('@media(max-width:850px){.adminGrid{display:block}.adminSide{display:block;position:sticky');
    expect(admin).toContain('.adminNav{display:flex');
    expect(admin).toContain('overflow-x:auto');
  });

  test('keeps communication tablet rules from reshaping the desktop admin shell',()=>{
    const communication=read('src/app/admin/communication-pilot-fixes.css');
    const block3=read('src/app/admin/block3-pilot-batch.css');
    expect(communication).toContain('@media(max-width:1050px){\n  .launchActions');
    expect(communication).toContain('@media(max-width:850px){\n  body:has(.adminGrid)');
    expect(block3).toContain('@media(min-width:851px){');
    expect(block3).toContain('grid-template-columns:286px minmax(0,1fr)!important');
    expect(block3).toContain('overflow-y:auto!important');
    expect(block3).toContain('scrollbar-width:none!important');
    expect(block3).toContain('.adminSide::-webkit-scrollbar{display:none!important');
    expect(block3).toContain('.adminNav{display:grid!important');
  });
});
