import{describe,expect,it}from'vitest';import{readFileSync}from'node:fs';import{join}from'node:path';const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
describe('Core Engine authoritative checkout quote',()=>{
 it('quotes only active variants in the requested tenant',()=>{const sql=read('supabase/migrations/20260901161000_core_engine_checkout_quote.sql');expect(sql).toContain('pv.instance_id=p_instance_id');expect(sql).toContain('p.instance_id=p_instance_id');expect(sql).toContain('v_variant.stock_quantity<v_qty');});
 it('prices reseller customers on the server and scopes coupons',()=>{const sql=read('supabase/migrations/20260901161000_core_engine_checkout_quote.sql');expect(sql).toContain("v_role='reseller'");expect(sql).toContain('instance_id=p_instance_id and code=v_code');expect(sql).not.toContain('update public.coupons');});
 it('keeps quote RPC private to the service runtime',()=>{const sql=read('supabase/migrations/20260901161000_core_engine_checkout_quote.sql');expect(sql).toContain('from public,anon,authenticated');expect(sql).toContain('to service_role');});
});
