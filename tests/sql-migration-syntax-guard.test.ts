import{readdirSync,readFileSync,statSync}from'node:fs';import{join}from'node:path';import{describe,expect,it}from'vitest';
const roots=['supabase/migrations','supabase/customer-baseline/migrations'];
function walk(dir:string):string[]{return readdirSync(dir).flatMap(name=>{const path=join(dir,name),stat=statSync(path);return stat.isDirectory()?walk(path):path.endsWith('.sql')?[path]:[]})}
describe('SQL migration syntax-sensitive guard',()=>{
  it('rejects malformed single-dollar PL/pgSQL body delimiters across production and customer-baseline migrations',()=>{
    const offenders:string[]=[];
    for(const file of roots.flatMap(walk)){
      const source=readFileSync(file,'utf8'),lines=source.split(/\r?\n/);
      lines.forEach((line,index)=>{
        if(/^\s*as\s+\$(?!\$|[A-Za-z_][A-Za-z0-9_]*\$)\s*$/i.test(line)||/^\s*\$;\s*$/.test(line))offenders.push(`${file}:${index+1}:${line.trim()}`);
      });
    }
    expect(offenders,'Malformed PL/pgSQL dollar quote delimiter detected').toEqual([]);
  });
});
