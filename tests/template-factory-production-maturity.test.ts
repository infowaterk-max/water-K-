import {describe,expect,it} from 'vitest';
import {
  evaluateStorefrontTemplateProductionMaturity,
  storefrontTemplateProductionCapabilityCatalog,
  type StorefrontTemplateProductionCapability,
} from '@/lib/builder/template-factory/production-maturity';

describe('Template Production Brabus maturity v1',()=>{
  it('marks engine technical maturity ready only after every Brabus revalidation proof is PROVEN',()=>{
    const result=evaluateStorefrontTemplateProductionMaturity();
    expect(result.valid).toBe(true);
    expect(result.template3AuthoringReady).toBe(true);
    expect(result.blockingCapabilityIds).toEqual([]);
    const engines=result.capabilities.filter(item=>item.id.startsWith('ENGINE-')&&item.id.endsWith('-BRABUS-REVALIDATION'));
    expect(engines).toHaveLength(12);
    expect(engines.every(item=>item.state==='PROVEN')).toBe(true);
    expect(engines.every(item=>item.evidence.some(row=>row.kind==='test'&&row.executable))).toBe(true);
    expect(result.capabilities.find(item=>item.id==='FACTORY-TEMPLATE-GENOME')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-TEMPLATE-TYPE-SYSTEM')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-CONSTRAINT-PLANNER')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-MEDIA-PLANNER-COMPILER')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-DETERMINISTIC-LINEAGE')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-DISTINCTNESS-ANTI-CLONE')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='FACTORY-DYNAMIC-PRODUCTION-COMPILER')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='VX-PUBLISH-READINESS')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='VX-INHERITANCE-INTELLIGENCE')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='VX-VISUAL-DIFF-INTELLIGENCE')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='VX-SMART-INTENT')?.state).toBe('PROVEN');
    expect(result.capabilities.find(item=>item.id==='VX-SMART-AUTOFIX')?.state).toBe('PROVEN');
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

  it('marks technical Template #3 maturity ready only when every mandatory capability is PROVEN with executable evidence',()=>{
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
