import {describe,expect,it} from 'vitest';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  inspectStorefrontAccessibility,
  inspectStorefrontFidelityDiagnostics,
  inspectStorefrontResponsiveLayout,
} from '@/lib/builder/storefront-fidelity-diagnostics';

const page=():StorefrontPageDocument=>({
  schemaVersion:1,
  pageKey:'diagnostics.home',
  pageType:'home',
  templateKey:'reference.diagnostics',
  templateVersion:1,
  sections:[
    {id:'hero',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'l'},children:[
      {id:'hero-grid',componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'m'},children:[
        {id:'hero-title',componentKey:'content.heading',componentVersion:1,config:{level:1,text:'Diagnosztikai referencia'}},
        {id:'hero-image',componentKey:'content.image',componentVersion:1,config:{src:'/hero.jpg',alt:'Termék vizuál',width:1200,height:800,fit:'cover',loading:'eager'}},
        {id:'hero-cta',componentKey:'content.button',componentVersion:1,config:{label:'Megnézem',href:'/termek'}},
      ]},
    ]},
  ],
});

describe('Storefront fidelity diagnostics',()=>{
  it('keeps a structurally safe reference page green without mutating it',()=>{
    const source=page();
    const before=structuredClone(source);
    const result=inspectStorefrontFidelityDiagnostics(source);
    expect(result.accessibility.ok).toBe(true);
    expect(result.accessibility.issues).toHaveLength(0);
    expect(result.layout.ok).toBe(true);
    expect(result.layout.issues).toHaveLength(0);
    expect(source).toEqual(before);
  });

  it('surfaces missing alt text and heading hierarchy problems',()=>{
    const source=page();
    const grid=source.sections[0].children?.[0];
    if(!grid?.children)throw new Error('TEST_GRID_MISSING');
    grid.children[0].config.level=3;
    grid.children[1].config.alt='';
    grid.children.push({id:'deep-heading',componentKey:'content.heading',componentVersion:1,config:{level:6,text:'Túl mély heading'}});
    const result=inspectStorefrontAccessibility(source);
    expect(result.issues.map(issue=>issue.code)).toEqual(expect.arrayContaining([
      'ACCESSIBILITY_IMAGE_ALT_MISSING',
      'ACCESSIBILITY_HEADING_STARTS_TOO_DEEP',
      'ACCESSIBILITY_HEADING_LEVEL_JUMP',
    ]));
  });

  it('detects responsive fixed-width overflow without inventing a second layout authority',()=>{
    const source=page();
    const grid=source.sections[0].children?.[0];
    if(!grid)throw new Error('TEST_GRID_MISSING');
    grid.config.style={mobile:{minWidth:'720px'}};
    const result=inspectStorefrontResponsiveLayout(source);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code:'LAYOUT_MIN_WIDTH_EXCEEDS_VIEWPORT',
      nodeId:'hero-grid',
      viewport:'mobile',
      severity:'error',
    }));
  });

  it('warns about mobile nowrap and extreme negative margins while preserving intentional styling as editable state',()=>{
    const source=page();
    const title=source.sections[0].children?.[0]?.children?.[0];
    if(!title)throw new Error('TEST_TITLE_MISSING');
    title.config.text='Ez egy kifejezetten hosszú, mobilon problémás címsor, amely nem törhet sort';
    title.config.style={mobile:{whiteSpace:'nowrap',marginLeft:'-120px'}};
    const result=inspectStorefrontResponsiveLayout(source);
    expect(result.ok).toBe(true);
    expect(result.issues.map(issue=>issue.code)).toEqual(expect.arrayContaining([
      'LAYOUT_MOBILE_NOWRAP_TEXT_RISK',
      'LAYOUT_NEGATIVE_MARGIN_CLIPPING_RISK',
    ]));
  });
});
