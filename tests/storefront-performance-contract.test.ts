import {describe,expect,it} from 'vitest';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {evaluateStorefrontPerformance,measureStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';

const node=(id:string,componentKey:string,config:Record<string,unknown>={},children:StorefrontComponentNode[]=[]):StorefrontComponentNode=>({id,componentKey,componentVersion:1,config,...(children.length?{children}:{})});
const page=(sections:StorefrontComponentNode[]):StorefrontPageDocument=>({schemaVersion:1,pageKey:'performance.test',pageType:'home',templateKey:'performance.test',templateVersion:1,sections});

describe('storefront performance contract',()=>{
  it('measures structural, media, layer and style complexity',()=>{
    const document=page([
      node('hero','layout.section',{style:{base:{padding:'1rem',background:'#fff'},mobile:{padding:'.5rem'}}},[
        node('layer','visual.layer',{},[
          node('image','content.image',{src:'/hero.jpg',loading:'eager',artDirection:{mobile:{src:'/hero-mobile.jpg'}},style:{base:{width:'100%',height:'100%'}}}),
        ]),
      ]),
    ]);
    expect(measureStorefrontPerformance(document)).toEqual({sectionCount:1,nodeCount:3,maxDepth:3,imageNodeCount:1,eagerImageCount:1,artDirectedImageCount:1,visualLayerCount:1,styleDeclarationCount:5});
    expect(evaluateStorefrontPerformance(document).ok).toBe(true);
  });

  it('warns before the hard ceiling and fails only after the hard ceiling',()=>{
    const warningDocument=page(Array.from({length:25},(_,index)=>node(`section-${index}`,'layout.section')));
    const warning=evaluateStorefrontPerformance(warningDocument);
    expect(warning.ok).toBe(true);
    expect(warning.issues.some(issue=>issue.metric==='sectionCount'&&issue.severity==='warning')).toBe(true);

    const failingDocument=page(Array.from({length:37},(_,index)=>node(`section-${index}`,'layout.section')));
    const failing=evaluateStorefrontPerformance(failingDocument);
    expect(failing.ok).toBe(false);
    expect(failing.issues.some(issue=>issue.metric==='sectionCount'&&issue.severity==='error')).toBe(true);
  });

  it('prevents templates from marking every image as eager',()=>{
    const document=page([
      node('gallery','layout.section',{},Array.from({length:5},(_,index)=>node(`image-${index}`,'content.image',{src:`/image-${index}.jpg`,loading:'eager'}))),
    ]);
    const result=evaluateStorefrontPerformance(document);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({metric:'eagerImageCount',severity:'error',actual:5,limit:4}));
  });
});
