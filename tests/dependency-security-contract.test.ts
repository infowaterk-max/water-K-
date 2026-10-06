import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const readJson=(path:string)=>JSON.parse(readFileSync(path,'utf8'));

describe('dependency security contract',()=>{
  it('pins the patched source-map-js transitive dependency without broad dependency churn',()=>{
    const pkg=readJson('package.json');
    const lock=readJson('package-lock.json');
    const sourceMap=lock.packages['node_modules/source-map-js'];
    const postcss=lock.packages['node_modules/postcss'];

    expect(pkg.overrides?.['source-map-js']).toBe('1.2.2');
    expect(sourceMap).toMatchObject({
      version:'1.2.2',
      resolved:'https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.2.tgz',
      integrity:'sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==',
    });
    expect(postcss.version).toBe('8.5.28');
    expect(postcss.dependencies?.['source-map-js']).toBe('^1.2.1');
    expect(pkg.overrides?.postcss).toBe('>=8.5.23');
  });
});
