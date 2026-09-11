import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Roadmap Block 21 — scope guard',()=>{
  it('contains no Block 22 interaction implementation in the Block 21 modules',()=>{
    const schema=read('src/lib/builder/storefront-page-schema.ts');
    const catalog=read('src/lib/builder/storefront-template-catalog.ts');
    const authority=read('src/lib/builder/storefront-template-authority.ts');
    const joined=`${schema}\n${catalog}\n${authority}`;
    expect(joined).not.toContain('onDragStart');
    expect(joined).not.toContain('onDrop');
    expect(joined).not.toContain('ResizeObserver');
    expect(joined).not.toContain('contentEditable');
    expect(joined).not.toContain('<canvas');
    expect(joined).not.toContain('supabase.rpc(');
  });

  it('does not introduce a Block 21 migration or customer-baseline mutation',()=>{
    const migrations=fs.readdirSync(path.join(root,'supabase/migrations'));
    const baseline=fs.readdirSync(path.join(root,'supabase/customer-baseline/migrations'));
    expect(migrations.some(name=>name.includes('block21')||name.includes('page_schema_templates'))).toBe(false);
    expect(baseline).toContain('0004_storefront_runtime_persistence.sql');
    expect(baseline).toContain('0005_storefront_template_installation.sql');
  });
});
