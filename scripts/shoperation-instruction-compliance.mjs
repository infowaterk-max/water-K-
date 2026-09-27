import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {authorityRule,predecessorIssues,publishGuardContext} from './lib/shoperation-guard-context.mjs';

const GUARD_ID='GUARD-INSTRUCTION-COMPLIANCE';
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const plan=readJson('quality/development/active-plan.json');
const ledger=readJson('quality/development/instruction-ledger.v1.json');
const issues=[...predecessorIssues(GUARD_ID)];
const rows=[];
const read=file=>readFileSync(file,'utf8');
const at=(value,path)=>String(path??'').split('.').filter(Boolean).reduce((current,key)=>{
  if(current===null||current===undefined)return undefined;
  const index=/^\d+$/.test(key)?Number(key):key;
  return current[index];
},value);
const all=(nodes,out=[])=>{for(const node of nodes??[]){out.push(node);all(node.children??[],out)}return out;};
const templateNode=(file,pageType,nodeId)=>{
  const pkg=readJson(file);
  const page=(pkg.pages??[]).find(item=>item.pageType===pageType);
  return page?all(page.sections??[]).find(node=>node.id===nodeId):undefined;
};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const textOf=item=>[item.request,...(item.acceptanceCriteria??[]),...(item.checks??[]).flatMap(check=>[check.pageType,check.file,check.nodeId])].filter(Boolean).join(' ').toLocaleLowerCase('hu-HU');

const PROTECTED={
  checkout:{
    ruleIds:['TF-AUTH-005'],
    detect:/\bcheckout\b|p[eé]nzt[aá]r|pageType.?checkout|\/penztar|components\/checkout/i,
    runtimeEvidence:[
      {file:'src/app/penztar/page.tsx',value:'<CheckoutForm'},
      {file:'src/app/penztar/page.tsx',value:'<StorefrontCheckoutShell'},
      {file:'src/components/checkout/storefront-checkout-shell.tsx',value:'data-storefront-live-checkout="shared-e13"'},
      {file:'src/components/checkout/checkout-form.tsx',value:'data-checkout-ux="guided-accordion"'},
    ],
    forbiddenTemplateBehavior:/form|field|input|shipping|payment|submit|step|accordion/i,
  },
  cart:{
    ruleIds:['TF-AUTH-005'],
    detect:/\bcart\b|kos[aá]r|pageType.?cart|components\/cart/i,
    runtimeEvidence:[],
    forbiddenTemplateBehavior:/quantity|remove|coupon|submit|stepper|add-to-cart/i,
  },
  account:{
    ruleIds:['TF-AUTH-005'],
    detect:/\baccount\b|fi[oó]k|pageType.?account|components\/account/i,
    runtimeEvidence:[],
    forbiddenTemplateBehavior:/login|logout|profile|order|return|download/i,
  },
};

if(ledger.contract!=='shoporation.instruction-compliance.v1')issues.push({code:'PO_INSTRUCTION_LEDGER_CONTRACT_INVALID'});
if(ledger.taskId!==plan.taskId)issues.push({code:'PO_INSTRUCTION_TASK_MISMATCH',expected:plan.taskId,actual:ledger.taskId});
if(!Array.isArray(ledger.instructions)||!ledger.instructions.length)issues.push({code:'PO_INSTRUCTION_LEDGER_EMPTY'});

for(const item of ledger.instructions??[]){
  const row={id:item.id,state:item.state,checks:[],regressionTests:item.regressionTests??[],protectedSubjects:[],authorityRuleIds:item.authorityRuleIds??[]};
  if(!item.id||!String(item.request??'').trim())issues.push({code:'PO_INSTRUCTION_ID_OR_REQUEST_MISSING',id:item.id??null});
  if(item.state!=='implemented'&&item.state!=='accepted-frozen')issues.push({code:'PO_INSTRUCTION_NOT_IMPLEMENTED',id:item.id,state:item.state});
  if(!Array.isArray(item.acceptanceCriteria)||!item.acceptanceCriteria.length)issues.push({code:'PO_INSTRUCTION_ACCEPTANCE_CRITERIA_MISSING',id:item.id});
  if(!Array.isArray(item.checks)||!item.checks.length)issues.push({code:'PO_INSTRUCTION_EVIDENCE_CHECK_MISSING',id:item.id});
  if(!Array.isArray(item.regressionTests)||!item.regressionTests.length)issues.push({code:'PO_INSTRUCTION_REGRESSION_MISSING',id:item.id});
  for(const test of item.regressionTests??[])if(!existsSync(test))issues.push({code:'PO_INSTRUCTION_REGRESSION_FILE_MISSING',id:item.id,file:test});

  const sourceText=textOf(item);
  for(const [subject,contract] of Object.entries(PROTECTED)){
    if(!contract.detect.test(sourceText))continue;
    row.protectedSubjects.push(subject);
    for(const ruleId of contract.ruleIds){
      const rule=authorityRule(ruleId);
      if(!rule)issues.push({code:'PO_INSTRUCTION_AUTHORITY_RULE_MISSING',id:item.id,subject,ruleId});
      if(!(item.authorityRuleIds??[]).includes(ruleId))issues.push({code:'PO_INSTRUCTION_AUTHORITY_ACK_REQUIRED',id:item.id,subject,ruleId});
    }
    const behaviorNodeChecks=(item.checks??[]).filter(check=>
      String(check.kind??'').startsWith('template-node-')
      &&contract.forbiddenTemplateBehavior.test(String(check.nodeId??''))
    );
    if(behaviorNodeChecks.length)issues.push({
      code:'PO_PROTECTED_BEHAVIOR_PROVEN_BY_TEMPLATE_NODE',
      id:item.id,
      subject,
      ruleIds:contract.ruleIds,
      nodeIds:behaviorNodeChecks.map(check=>check.nodeId),
    });
    for(const required of contract.runtimeEvidence){
      const hasAuthorityEvidence=(item.checks??[]).some(check=>
        check.kind==='authority-source-contains'
        &&check.file===required.file
        &&check.value===required.value
        &&contract.ruleIds.includes(check.authorityRuleId)
      );
      if(!hasAuthorityEvidence)issues.push({
        code:'PO_INSTRUCTION_SHARED_AUTHORITY_EVIDENCE_REQUIRED',
        id:item.id,
        subject,
        required,
        ruleIds:contract.ruleIds,
      });
    }
  }

  for(const check of item.checks??[]){
    let passed=false,actual=null;
    try{
      if(check.kind==='file-exists'){
        passed=existsSync(check.file);
      }else if(check.kind==='file-contains'||check.kind==='authority-source-contains'){
        actual=existsSync(check.file)?read(check.file):null;
        passed=typeof actual==='string'&&actual.includes(check.value);
        if(check.kind==='authority-source-contains'&&!authorityRule(check.authorityRuleId)){
          passed=false;
          issues.push({code:'PO_INSTRUCTION_AUTHORITY_EVIDENCE_RULE_UNKNOWN',id:item.id,ruleId:check.authorityRuleId});
        }
      }else if(check.kind==='file-not-contains'){
        actual=existsSync(check.file)?read(check.file):null;
        passed=typeof actual==='string'&&!actual.includes(check.value);
      }else if(check.kind==='json-value'){
        actual=existsSync(check.file)?at(readJson(check.file),check.path):undefined;
        passed=eq(actual,check.equals);
      }else if(check.kind==='template-node-present'){
        actual=existsSync(check.file)?templateNode(check.file,check.pageType,check.nodeId):undefined;
        passed=Boolean(actual);
      }else if(check.kind==='template-node-absent'){
        actual=existsSync(check.file)?templateNode(check.file,check.pageType,check.nodeId):undefined;
        passed=!actual;
      }else if(check.kind==='template-node-value'){
        const node=existsSync(check.file)?templateNode(check.file,check.pageType,check.nodeId):undefined;
        actual=node?at(node,check.path):undefined;
        passed=eq(actual,check.equals);
      }else{
        issues.push({code:'PO_INSTRUCTION_CHECK_KIND_UNKNOWN',id:item.id,kind:check.kind});
      }
    }catch(error){
      actual=error instanceof Error?error.message:String(error);
      passed=false;
    }
    row.checks.push({kind:check.kind,file:check.file,nodeId:check.nodeId??null,path:check.path??null,authorityRuleId:check.authorityRuleId??null,passed});
    if(!passed)issues.push({
      code:'PO_INSTRUCTION_EVIDENCE_FAILED',
      id:item.id,
      check:{kind:check.kind,file:check.file,nodeId:check.nodeId??null,path:check.path??null,expected:check.equals??check.value??true},
      actual:typeof actual==='string'?actual.slice(0,300):actual,
    });
  }
  rows.push(row);
}

const report={contract:'shoporation.instruction-compliance-report.v2',guardId:GUARD_ID,taskId:plan.taskId,instructionCount:ledger.instructions?.length??0,rows,issues,decision:issues.length?'BLOCK':'PASS'};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/instruction-compliance.json',JSON.stringify(report,null,2)+'\n');
publishGuardContext(GUARD_ID,report);
console.log(`Product Owner Instruction Compliance: ${report.decision}; instructions=${report.instructionCount}; issues=${issues.length}.`);
for(const issue of issues)console.error(JSON.stringify(issue));
if(process.argv.includes('--check')&&issues.length)process.exit(1);
