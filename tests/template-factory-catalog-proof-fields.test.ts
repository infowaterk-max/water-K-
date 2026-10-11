import {afterEach,describe,expect,it,vi} from 'vitest';
import {GET} from '@/app/api/visual-fidelity/templates/route';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
describe('Factory candidate QA catalog preserves compiler proof identity',()=>{
 afterEach(()=>vi.unstubAllEnvs());
 it('passes exact Loot Vault compiler provenance and complete showroom evidence without inventing approval',async()=>{
   vi.stubEnv('VISUAL_FIDELITY_QA','1');
   const response=await GET();
   expect(response.status).toBe(200);
   const body=await response.json();
   expect(body.contract).toBe('shoporation.template-factory-quality-catalog.v1');
   const result=body.templates.find((t:{templateKey:string;factoryCandidate?:boolean})=>t.templateKey==='gaming.loot-vault'&&t.factoryCandidate);
   const compiled=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
   expect(result).toBeTruthy();
   expect(result.templateVersion).toBe(compiled.package.manifest.templateVersion);
   expect(result.provenance).toEqual(compiled.report.provenance);
   expect(result.provenance.targetTemplateKey).toBe(result.templateKey);
   expect(result.provenance.targetTemplateVersion).toBe(result.templateVersion);
   expect(result.showroomEvidence).toEqual(compiled.report.showroomEvidence);
   expect(result.showroomEvidence).toHaveLength(20);
   expect(result.showroomEvidence.every((r:{pageKey:string|null;schemaVersion:number|null;presentationAuthority:string|null;navigationPresent:boolean;entrypointPresent:boolean})=>Boolean(r.pageKey)&&r.schemaVersion===1&&Boolean(r.presentationAuthority)&&r.navigationPresent&&r.entrypointPresent)).toBe(true);
   expect(result.handoffReady).toBeUndefined();
   expect(result.productOwnerApproved).toBeUndefined();
 });
 it('does not assign Factory provenance to non-Factory templates',async()=>{
   vi.stubEnv('VISUAL_FIDELITY_QA','1');
   const response=await GET();const body=await response.json();
   for(const template of body.templates.filter((t:{factoryCandidate?:boolean})=>!t.factoryCandidate)){
     expect(template.provenance).toBeUndefined();
     expect(template.showroomEvidence).toBeUndefined();
   }
 });
 it('does not expose the internal Factory catalog when QA mode is disabled',async()=>{
   vi.stubEnv('VISUAL_FIDELITY_QA','0');
   expect((await GET()).status).toBe(404);
 });
});
