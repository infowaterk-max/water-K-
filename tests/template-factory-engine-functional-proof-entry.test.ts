import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Template Factory E13 functional proof entry',()=>{
  const entry=read('src/app/storefront-template-preview/engine-proof/checkout/page.tsx');

  it('resolves only the explicitly marked preview acceptance tenant and fails closed on ambiguity',()=>{
    expect(entry).toContain("process.env.VERCEL_ENV!=='preview'");
    expect(entry).toContain('requirePlatformOperator()');
    expect(entry).toContain(".eq('status','pilot')");
    expect(entry).toContain(".contains('storefront_config',{acceptance:'digital-commerce-guest-matrix'})");
    expect(entry).toContain('.limit(2)');
    expect(entry).toContain('data.length!==1');
    expect(entry).toContain('ENGINE_FUNCTIONAL_ACCEPTANCE_TARGET_AMBIGUOUS');
    expect(entry).not.toContain('.limit(1)');
    expect(entry).not.toContain('getCurrentWebshopInstance');
  });

  it('delegates signed checkout acceptance session creation to the existing canonical platform action',()=>{
    expect(entry).toContain("startPlatformPilotAcceptanceAction");
    expect(entry).toContain('action={startPlatformPilotAcceptanceAction}');
    expect(entry).toContain('name="instanceId"');
    expect(entry).toContain('name="flow" value="checkout"');
    expect(entry).toContain('E13 checkout proof indítása');
    expect(entry).not.toContain('createPilotAcceptanceToken');
    expect(entry).not.toContain('/api/pilot-access/start');
  });
});
