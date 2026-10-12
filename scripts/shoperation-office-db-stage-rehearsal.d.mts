export type OfficeStageTable='office_threads'|'office_messages'|'office_tasks';
export type OfficeStageAccess={table:OfficeStageTable;authenticatedSelect:boolean;authenticatedInsert:boolean;serviceSelect:boolean};
export type OfficeStageExposure={
  contract:string;capturedAt:string;tableAccess:OfficeStageAccess[];
  dependencies:{
    evaluateStoreCapabilityPresent:boolean;privateCurrentUserReaderPresent:boolean;
    participantTablePresent:boolean;normalizedPlanSyncPresent:boolean;normalizedGrantTablePresent:boolean;
  };
  rowCounts:Record<OfficeStageTable,number>;
};
export type OfficeStageRoleProof={id:string;status:'PASS'|'FAIL'|'NOT_RUN';projectId:string;sourceSha:string};
export type OfficeStageRehearsalInput={
  snapshot?:unknown;exposure?:OfficeStageExposure;projectId?:string;sourceSha?:string;
  roleProofs?:OfficeStageRoleProof[];
};
export type OfficeStageFinding={code:string;table?:string;caseId?:string;codes?:string[]};
export type OfficeStageRehearsal={
  contract:string;target:'staging';projectId:string|null;sourceSha:string|null;
  decision:'BLOCK'|'REVIEW';
  claim:'STAGING_REMEDIATION_NOT_READY'|'ROLE_MATRIX_METADATA_CANDIDATE_ONLY';
  authoritative:false;ddlApplied:false;currentRoleProofsVerified:false;
  forbiddenMigrationReplay:string[];findings:OfficeStageFinding[];
  stages:{id:string;task:string;requires:string[]}[];nextAction:string;
};
export declare const OFFICE_STAGING_PROJECT_ID:string;
export declare const REQUIRED_OFFICE_ROLE_PROOFS:readonly string[];
export declare const OFFICE_STAGE_EXPOSURE_READONLY_SQL:string;
export declare function evaluateOfficeDbStagingRehearsal(
  input?:OfficeStageRehearsalInput,options?:{now?:Date;maxAgeHours?:number}
):OfficeStageRehearsal;
