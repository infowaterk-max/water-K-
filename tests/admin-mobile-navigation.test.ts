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
});
