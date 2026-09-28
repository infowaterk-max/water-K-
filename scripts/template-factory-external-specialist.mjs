import {spawn,spawnSync} from 'node:child_process';
import {closeSync,openSync,readFileSync} from 'node:fs';

const contractTests=[
  'tests/storefront-template-quality-gate-v2.test.ts',
  'tests/template-factory-scaffold-v1.test.ts',
  'tests/template-factory-loot-vault-v2.test.ts',
  'tests/storefront-template-factory-workflow-coverage.test.ts',
  'tests/storefront-responsive-isolation.test.ts',
  'tests/storefront-visual-style-capabilities.test.ts',
  'tests/storefront-fidelity-typography.test.ts',
  'tests/storefront-visual-builder-fidelity-operations.test.ts',
  'tests/storefront-fidelity-layout.test.ts',
  'tests/storefront-responsive-layout-depth.test.ts',
  'tests/visual-builder-workspace-ui.test.ts',
  'tests/roadmap-catchup-foundation.test.ts',
  'tests/storefront-runtime-backbone.test.tsx',
  'tests/special-commerce-wave6-cross-engine-acceptance.test.ts',
  'tests/special-commerce-wave7-template2-adoption.test.ts',
  'tests/storefront-targeted-page-change.test.ts',
  'tests/pilot-acceptance-access.test.ts',
  'tests/storefront-real-route-template-authority.test.ts',
  'tests/storefront-product-route-authority.test.ts',
  'tests/storefront-preview-demo-content-routing.test.ts',
  'tests/storefront-form-wizard-engine.test.ts',
  'tests/storefront-auth-surface.test.ts',
  'tests/storefront-auth-intent-checkout.test.ts',
  'tests/storefront-auth-return-target.test.ts',
  'tests/storefront-guest-order-claim.test.ts',
  'tests/storefront-shared-commerce-account-hardening.test.ts',
  'tests/storefront-public-information-routes.test.ts',
  'tests/storefront-catalog-discovery-route.test.ts',
  'tests/customer-account-runtime-hardening.test.ts',
  'tests/storefront-system-surfaces.test.ts',
  'tests/storefront-social-settings.test.ts',
  'tests/storefront-template-preview-runtime.test.ts',
  'tests/storefront-visual-builder-fidelity-engine.test.ts',
  'tests/playroom-v20-canonical-shell-content.test.ts',
  'tests/storefront-playroom-v20-canonical-authority.test.ts',
  'tests/storefront-playroom-v20-functional-acceptance.test.ts',
  'tests/storefront-template-route-integrity.test.ts',
  'tests/storefront-template-demo-content-persistence.test.ts',
  'tests/storefront-account-capability-navigation.test.tsx',
  'tests/storefront-commerce-header.test.tsx',
  'tests/storefront-runtime-primitives.test.tsx',
  'tests/cart-style-quantity-control.test.tsx',
];

const tests=spawnSync('npx',['vitest','run',...contractTests],{stdio:'inherit',env:process.env});
if((tests.status??1)!==0)process.exit(tests.status??1);

const logPath='/tmp/template-factory-quality-next.log';
const log=openSync(logPath,'w');
const server=spawn('npm',['run','start','--','-H','127.0.0.1','-p','3000'],{stdio:['ignore',log,log],env:process.env});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ready=false;
try{
  for(let attempt=0;attempt<75;attempt+=1){
    try{const response=await fetch('http://127.0.0.1:3000/api/visual-fidelity/templates');if(response.ok){ready=true;break}}catch{}
    await sleep(2000);
  }
  if(!ready){
    let tail='';try{tail=readFileSync(logPath,'utf8').slice(-12000)}catch{}
    console.error('TEMPLATE_FACTORY_QA_RUNTIME_NOT_READY: '+tail);
    process.exitCode=1;
  }else{
    const proof=spawnSync(process.execPath,['scripts/template-factory-quality-gate.mjs'],{stdio:'inherit',env:process.env});
    if((proof.status??1)!==0)process.exitCode=proof.status??1;
  }
}finally{
  if(!server.killed)server.kill('SIGTERM');
  closeSync(log);
}
