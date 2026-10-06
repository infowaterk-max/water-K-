export {
  materializeReleaseUnit,
  reconcileReleaseUnitManifest,
  sealReleaseUnitManifest,
} from './lib/shoperation-release-unit-runtime.mjs';

import {materializeReleaseUnit} from './lib/shoperation-release-unit-runtime.mjs';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),value=name=>{const index=args.indexOf(name);return index>=0?args[index+1]??null:null;},has=name=>args.includes(name);
  const manifestPath=value('--manifest');
  if(!manifestPath)throw new Error('RELEASE_UNIT_MANIFEST_PATH_REQUIRED');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  const result=materializeReleaseUnit({
    manifest,
    sourceCommit:value('--source'),
    targetRef:value('--target-ref')??'refs/heads/main',
    updateRef:has('--apply-ref'),
    message:value('--message'),
  });
  console.log(JSON.stringify(result,null,2));
}
