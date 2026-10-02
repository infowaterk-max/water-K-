import {describe,expect,it} from 'vitest';
import {
  evaluateStorefrontTemplateProductionMaturity,
  storefrontTemplateProductionCapabilityCatalog,
  type StorefrontTemplateProductionCapability,
} from '@/lib/builder/template-factory/production-maturity';

describe('Template Production Brabus maturity v1',()=>{
  it('blocks Template #3 while mandatory Brabus gaps remain',()=>{
    const result=evaluateStorefrontTemplateProductionMaturity();
    expect(result.valid).toBe(true);
    expect(result.template3AuthoringReady).toBe(false);
    expect(result.blockingCapabilityIds).toEqual(expect.arrayContaining([
      'VX-SMART-INTENT','VX-SMART-AUTOFIX',
      'FACTORY-DISTINCTNESS-ANTI-CLONE','FACTORY-DYNAMIC-PRODUCTION-COMPILER',
    ]));
    expect(result.blockingCapabilityIds).not.toContain('FACTORY-TEMPLATE-GENOME');
    expect(result.blockingCapabilityIds).not.toContain('FACTORY-TEMPLATE-TYPE-SYSTEM');
    expect(result.blockingCapabilityIds).not.toContain('FACTORY-CONSTRAINT-PLANNER');
    expect(result.blockingCapabilityIds).not.toContain('FACTORY-MEDIA-PLANNER-COMPILER');
    expect(result.blockingCapabilityIds).toContain('FACTORY-DISTINCTNESS-ANTI-CLONE');
    expect(result.blockingCapabilityIds).toContain('FACTORY-DYNAMIC-PRODUCTION-COMPILER');
    expect(result.capabilities.find(item=>item.id==='FACTORY-TEMPLATE-GENOME')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-TEMPLATE-TYPE-SYSTEM')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-CONSTRAINT-PLANNER')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-MEDIA-PLANNER-COMPILER')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-DISTINCTNESS-ANTI-CLONE')?.state).toBe('EVOLVE');
  });

  it('rejects documentation-only PROVEN claims',()=>{
    const bad:StorefrontTemplateProductionCapability={
      id:'BAD-DOCS',area:'template-factory',label:'Docs only',state:'PROVEN',authority:'builder-template-system',
      requiredForTemplate3:true,reason:'synthetic adversarial input',nextAction:'must fail',
      evidence:[{kind:'documentation',path:'docs/fake.md',authority:'builder-template-system',canonical:true,executable:false}],
    };
    const result=evaluateStorefrontTemplateProductionMaturity([bad]);
    expect(result.valid).toBe(false);
    expect(result.template3AuthoringReady).toBe(false);
    expect(result.issues.map(item=>item.code)).toEqual(expect.arrayContaining([
      'TEMPLATE_PRODUCTION_PROVEN_WITHOUT_IMPLEMENTATION','TEMPLATE_PRODUCTION_PROVEN_WITHOUT_TEST',
    ]));
  });

  it('rejects legacy or noncanonical PROVEN evidence',()=>{
    const bad:StorefrontTemplateProductionCapability={
      id:'BAD-LEGACY',area:'vx-builder',label:'Legacy only',state:'PROVEN',authority:'builder-template-system',
      requiredForTemplate3:true,reason:'synthetic adversarial input',nextAction:'must fail',
      evidence:[
        {kind:'implementation',path:'legacy/builder.tsx',authority:'builder-template-system',canonical:false,executable:true},
        {kind:'test',path:'tests/legacy-builder.test.ts',authority:'builder-template-system',canonical:false,executable:true},
      ],
    };
    expect(evaluateStorefrontTemplateProductionMaturity([bad]).valid).toBe(false);
  });

  it('unlocks Template #3 only when every mandatory capability is PROVEN with executable evidence',()=>{
    const promoted=storefrontTemplateProductionCapabilityCatalog().map(item=>({
      ...item,
      state:'PROVEN' as const,
      evidence:item.evidence.some(row=>row.kind==='implementation'||row.kind==='contract')&&item.evidence.some(row=>row.kind==='test')
        ?item.evidence
        :[
          ...item.evidence,
          {kind:'implementation' as const,path:`synthetic/${item.id}.ts`,authority:item.authority,canonical:true,executable:true},
          {kind:'test' as const,path:`tests/synthetic-${item.id}.test.ts`,authority:item.authority,canonical:true,executable:true},
        ],
    }));
    const result=evaluateStorefrontTemplateProductionMaturity(promoted);
    expect(result.valid).toBe(true);
    expect(result.template3AuthoringReady).toBe(true);
    expect(result.blockingCapabilityIds).toEqual([]);
  });
});
