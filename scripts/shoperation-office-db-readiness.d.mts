export type OfficeDbTable='office_threads'|'office_messages'|'office_tasks';
export type OfficeDbPolicy={
  schemaname:string;tablename:string;policyname:string;
  permissive:string;roles:string|string[];cmd:string;qual:string;
};
export type OfficeDbFunction={schema:string;name:string;args?:string};
export type OfficeDbMigration={version:string;name:string};
export type OfficeDbSnapshot={
  contract:string;target:string;capturedAt:string;
  policies:OfficeDbPolicy[];functions:OfficeDbFunction[];migrations:OfficeDbMigration[];
};
export type OfficeDbFinding={code:string;table?:string;policy?:string;version?:string;capturedAt?:string|null;message?:string};
export type OfficeDbReadiness={
  contract:string;decision:'BLOCK'|'REVIEW';claim:'NOT_VERIFIED'|'DB_NOT_READY'|'METADATA_CANDIDATE_ONLY';
  target?:string|null;capturedAt?:string|null;authoritative?:boolean;
  requires?:string[];findings:OfficeDbFinding[];
};
export declare const OFFICE_TABLES:readonly OfficeDbTable[];
export declare const REQUIRED_OFFICE_MIGRATIONS:readonly string[];
export declare const OFFICE_CATALOG_READONLY_SQL:string;
export declare function evaluateOfficeDbReadiness(snapshot:unknown,options?:{now?:Date;maxAgeHours?:number}):OfficeDbReadiness;
