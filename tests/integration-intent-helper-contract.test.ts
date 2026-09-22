import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root=process.cwd();
const migrations=fs.readdirSync(path.join(root,'supabase/migrations'))
  .filter(name=>name.endsWith('.sql'))
  .map(name=>fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8'))
  .join('\n');

describe('integration intent helper contract',()=>{
  test('checkout/payment SQL consumers have a real private enqueue helper definition',()=>{
    expect(migrations).toContain('create or replace function private.enqueue_order_integration_intent_v1');
    expect(migrations).toContain("INTEGRATION_INTENT_ORDER_NOT_FOUND");
    expect(migrations).toContain("status in ('pending','processing','succeeded')");
    expect(migrations).toContain("revoke all on function private.enqueue_order_integration_intent_v1(uuid,uuid,text,text,jsonb)");
  });
});
