import { createHash } from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd();
const manifest=JSON.parse(readFileSync(resolve(root,'supabase/customer-baseline/manifest.json'),'utf8'));
const migrationFiles=readdirSync(resolve(root,manifest.baselineMigrationDirectory))
  .filter((name)=>name.endsWith('.sql')).sort()
  .map((name)=>`${manifest.baselineMigrationDirectory}/${name}`);
const files=[
  ...migrationFiles,
  manifest.authBootstrapFile,
  manifest.seedFile,
  'supabase/customer-baseline/target-preflight.sql',
  'supabase/customer-baseline/target-postflight.sql',
];

const hash=createHash('sha256');
for(const path of files){
  const content=readFileSync(resolve(root,path));
  hash.update(path);
  hash.update('\0');
  hash.update(content);
  hash.update('\0');
}
console.log(hash.digest('hex'));
