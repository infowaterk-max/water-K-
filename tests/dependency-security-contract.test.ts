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

  it('pins patched sharp/libvips native dependency family for CVE-2026-96889 without broad framework churn',()=>{
    const pkg=readJson('package.json');
    const lock=readJson('package-lock.json');
    const sharp=lock.packages['node_modules/sharp'];
    const linuxX64=lock.packages['node_modules/@img/sharp-linux-x64'];
    const libvipsLinuxX64=lock.packages['node_modules/@img/sharp-libvips-linux-x64'];
    const next=lock.packages['node_modules/next'];

    expect(pkg.overrides?.sharp).toBe('0.35.5');
    expect(sharp).toMatchObject({
      version:'0.35.5',
      resolved:'https://registry.npmjs.org/sharp/-/sharp-0.35.5.tgz',
      integrity:'sha512-Ywn4OnzGukp7CDMrp08RQ50YKmuwG47brZgIVPTvBaaAfQlRlygrRqSrxdCiL9M+LlzLBiJ68IR1QqvzHyjC7g==',
    });
    expect(sharp.optionalDependencies?.['@img/sharp-linux-x64']).toBe('0.35.5');
    expect(sharp.optionalDependencies?.['@img/sharp-libvips-linux-x64']).toBe('1.3.4');
    expect(linuxX64).toMatchObject({version:'0.35.5',optional:true});
    expect(libvipsLinuxX64).toMatchObject({version:'1.3.4',optional:true});
    expect(next.version).toBe('15.5.24');
    expect(next.optionalDependencies?.sharp).toBe('^0.34.3 || ^0.35.3');
  });

});