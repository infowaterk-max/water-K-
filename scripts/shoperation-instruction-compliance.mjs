import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const plan=readJson('quality/development/active-plan.json');
const ledger=readJson('quality/development/instruction-ledger.v1.json');
const issues=[];
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

if(ledger.contract!=='shoporation.instruction-compliance.v1')issues.push({code:'PO_INSTRUCTION_LEDGER_CONTRACT_INVALID'});
if(ledger.taskId!==plan.taskId)issues.push({code:'PO_INSTRUCTION_TASK_MISMATCH',expected:plan.taskId,actual:ledger.taskId});
if(!Array.isArray(ledger.instructions)||!ledger.instructions.length)issues.push({code:'PO_INSTRUCTION_LEDGER_EMPTY'});

for(const item of ledger.instructions??[]){
  const row={id:item.id,state:item.state,checks:[],regressionTests:item.regressionTests??[]};
  if(!item.id||!String(item.request??'').trim())issues.push({code:'PO_INSTRUCTION_ID_OR_REQUEST_MISSING',id:item.id??null});
  if(item.state!=='implemented'&&item.state!=='accepted-frozen')issues.push({code:'PO_INSTRUCTION_NOT_IMPLEMENTED',id:item.id,state:item.state});
  if(!Array.isArray(item.acceptanceCriteria)||!item.acceptanceCriteria.length)issues.push({code:'PO_INSTRUCTION_ACCEPTANCE_CRITERIA_MISSING',id:item.id});
  if(!Array.isArray(item.checks)||!item.checks.length)issues.push({code:'PO_INSTRUCTION_EVIDENCE_CHECK_MISSING',id:item.id});
  if(!Array.isArray(item.regressionTests)||!item.regressionTests.length)issues.push({code:'PO_INSTRUCTION_REGRESSION_MISSING',id:item.id});
  for(const test of item.regressionTests??[])if(!existsSync(test))issues.push({code:'PO_INSTRUCTION_REGRESSION_FILE_MISSING',id:item.id,file:test});

  for(const check of item.checks??[]){
    let passed=false,actual=null;
    try{
      if(check.kind==='file-exists'){
        passed=existsSync(check.file);
      }else if(check.kind==='file-contains'){
        actual=existsSync(check.file)?read(check.file):null;
        passed=typeof actual==='string'&&actual.includes(check.value);
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
    row.checks.push({kind:check.kind,file:check.file,nodeId:check.nodeId??null,path:check.path??null,passed});
    if(!passed)issues.push({
      code:'PO_INSTRUCTION_EVIDENCE_FAILED',
      id:item.id,
      check:{kind:check.kind,file:check.file,nodeId:check.nodeId??null,path:check.path??null,expected:check.equals??check.value??true},
      actual:typeof actual==='string'?actual.slice(0,300):actual,
    });
  }
  rows.push(row);
}

const report={contract:'shoporation.instruction-compliance-report.v1',taskId:plan.taskId,instructionCount:ledger.instructions?.length??0,rows,issues,decision:issues.length?'BLOCK':'PASS'};
mkdirSync('artifacts/shoperation-development-guard',{recursive:true});
writeFileSync('artifacts/shoperation-development-guard/instruction-compliance.json',JSON.stringify(report,null,2)+'\n');
console.log(`Product Owner Instruction Compliance: ${report.decision}; instructions=${report.instructionCount}; issues=${issues.length}.`);
for(const issue of issues)console.error(JSON.stringify(issue));
if(process.argv.includes('--check')&&issues.length)process.exit(1);
