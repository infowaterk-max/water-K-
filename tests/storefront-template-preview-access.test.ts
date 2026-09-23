import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const access=fs.readFileSync('src/lib/auth/template-preview-access.ts','utf8');

describe('Factory Product Owner preview access authority',()=>{
  it('is tenant-independent and accepts only authenticated platform or active owner/admin authority',()=>{
    expect(access).toContain("from('platform_operators')");
    expect(access).toContain(".in('role',['owner','admin','operator'])");
    expect(access).toContain("from('role_bindings')");
    expect(access).toContain("binding.role_code==='owner'||binding.role_code==='admin'");
    expect(access).toContain('!binding.revoked_at');
    expect(access).toContain('binding.valid_from<=now');
    expect(access).toContain('!binding.valid_until||binding.valid_until>now');
    expect(access).not.toContain('getCurrentWebshopInstance');
    expect(access).not.toContain('requireCurrentStoreContext');
    expect(access).not.toContain('requirePlanFeature');
  });

  it('never resurrects revoked RBAC through legacy membership',()=>{
    expect(access).toContain('if(bindings.length===0)');
    expect(access).toContain("from('webshop_instance_members')");
    expect(access).toContain(".in('role',['owner','admin'])");
    expect(access).toContain("profile?.role==='admin'");
  });

  it('fails closed when auth configuration, user identity, admin client or authority lookup fails',()=>{
    expect(access).toContain("redirect('/fiokom?reason=admin-config')");
    expect(access).toContain("redirect('/fiokom?reason=login&next=");
    expect(access).toContain("catch{redirect('/fiokom?reason=forbidden')}");
    expect(access).toContain("if(bindingError)redirect('/fiokom?reason=forbidden')");
    expect(access.trim().endsWith("redirect('/fiokom?reason=forbidden');\n}")).toBe(true);
  });
});
