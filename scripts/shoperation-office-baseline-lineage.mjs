import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// U10A2: minimum source migration prerequisites for #1288, NOT the complete
// Office application DAG. Exact source parity is never Fresh Install proof.
// Ordered by migration identity; later dependency discovery can extend this.
export const OFFICE_BASELINE_MINIMUM_SOURCES=Object.freeze([
  '20260908022500_digital_office_privacy_foundation_v1.sql',
  '20260908023000_digital_office_privacy_membership_hardening_v1.sql',
  '20260908023500_digital_office_private_author_read_sync_v1.sql',
  '20260908024000_digital_office_rls_helper_exposure_closure_v1.sql',
  '20260909204503_digital_office_team_chat_2_foundation_v1.sql',
  '20260909204524_digital_office_team_chat_2_integrity_v1.sql',
  '20260909204547_digital_office_team_chat_owner_transfer_v1.sql',
  '20260909204825_team_chat_plan_split_v1.sql',
  '20260910061815_customer_email_plan_split_v1.sql',
  '20260910070000_communication_hub_2_0_foundation_v1.sql',
  '20260910070100_communication_hub_2_0_mailbox_default_assignment_v1.sql',
  '20260910070200_communication_hub_2_0_advanced_guards_and_object_links_v1.sql',
  '20261010093000_digital_office_strict_pro_sql_guard_v1.sql',
]);

const PROVENANCE=/^-- Shoperation-Office-Source: (\S+\.sql) sha256=([a-f0-9]{64})\r?\n/;
const sha256=data=>createHash('sha256').update(data).digest('hex');

export function evaluateOfficeBaselineLineage({
  root=process.cwd(),
  requiredSources=OFFICE_BASELINE_MINIMUM_SOURCES,
  baselineDirectory='supabase/customer-baseline/migrations',
  sourceDirectory='supabase/migrations',
}={}){
  const findings=[];
  const seen=new Map();
  const reported=[];
  const baselinePath=resolve(root,baselineDirectory);
  const sourcePath=resolve(root,sourceDirectory);
  const fileNames=existsSync(baselinePath)
    ? readdirSync(baselinePath).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort()
    : [];
  let priorSequence=0;
  let priorImportedOrdinal=46;

  if(!fileNames.length) findings.push({code:'OFFICE_BASELINE_EMPTY'});
  for(const file of fileNames){
    const ordinal=Number(file.slice(0,4));
    // Legacy 0001–0046 includes a documented pair of 0026 migrations.
    // Never reinterpret or renumber its historical filenames.
    if(ordinal<=46) continue;
    if(ordinal<=priorImportedOrdinal)
      findings.push({code:'OFFICE_BASELINE_NEW_ORDINAL_DRIFT',file,ordinal});
    priorImportedOrdinal=ordinal;
    const content=readFileSync(resolve(baselinePath,file),'utf8');
    const match=PROVENANCE.exec(content);
    if(!match) continue;
    const [,name,digest]=match;
    if(seen.has(name)){
      findings.push({code:'OFFICE_SOURCE_DUPLICATE',source:name,files:[seen.get(name).file,file]});
      continue;
    }
    seen.set(name,{file,ordinal,digest,body:content.slice(match[0].length)});
  }

  for(const name of requiredSources){
    const sourceFile=resolve(sourcePath,name);
    if(!existsSync(sourceFile)){
      findings.push({code:'OFFICE_SOURCE_FILE_MISSING',source:name});
      continue;
    }
    const sourceBody=readFileSync(sourceFile,'utf8');
    const located=seen.get(name);
    if(!located){
      findings.push({code:'OFFICE_BASELINE_SOURCE_MISSING',source:name});
      continue;
    }
    if(located.ordinal<=priorSequence)
      findings.push({code:'OFFICE_SOURCE_ORDER_DRIFT',source:name,file:located.file});
    priorSequence=located.ordinal;
    // Presence of a provenance marker alone must never be counted as SQL.
    if(located.digest!==sha256(sourceBody)||located.body!==sourceBody)
      findings.push({code:'OFFICE_SOURCE_BODY_DRIFT',source:name,file:located.file});
    else
      reported.push({source:name,baselineFile:located.file,sourceSha256:located.digest});
  }

  // Missing or forged source identities must not silently masquerade as parity.
  for(const [name,{file}] of seen){
    if(!requiredSources.includes(name))
      findings.push({code:'OFFICE_UNREVIEWED_SOURCE_PROVENANCE',source:name,file});
  }
  const sourceLineageStatus=findings.length?'BLOCKED':'SOURCE_PRESENT_UNPROVEN';
  return{
    contract:'shoporation.office-customer-baseline-lineage.v1',
    sourceLineageStatus,
    decision:findings.length?'BLOCK':'REVIEW',
    authoritative:false,
    releaseReady:false,
    realDatabaseProof:'NOT_EVALUATED',
    sourceScope:'MINIMUM_PREREQUISITES_NOT_FULL_DAG',
    baselineMigrationCount:fileNames.length,
    requiredSourceCount:requiredSources.length,
    matchedSourceCount:reported.length,
    matchedSources:reported,
    findings,
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const result=evaluateOfficeBaselineLineage();
  console.log(JSON.stringify(result,null,2));
  if(process.argv.includes('--require-office-pro-ready')){
    console.error('OFFICE_DB_PROOF_REQUIRED: static source parity never authorizes release');
    process.exitCode=1;
  }else if(process.argv.includes('--require-source-parity')&&result.sourceLineageStatus!=='SOURCE_PRESENT_UNPROVEN'){
    console.error('OFFICE_SOURCE_LINEAGE_BLOCKED: missing verified ordered baseline source SQL');
    process.exitCode=1;
  }
}
