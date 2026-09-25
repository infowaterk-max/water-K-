import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';
import {applyStorefrontTemplateDemoNotice,STOREFRONT_DEMO_CONTENT_NOTICE} from '@/lib/builder/storefront-template-route-integrity';

const account=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
const content=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='content')!;

describe('Playroom v20 canonical shell and content contract',()=>{
  it('uses one identical commerce header and footer across every page preset',()=>{
    const header=JSON.stringify(account.sections[0]);
    const footer=JSON.stringify(account.sections.at(-1));
    expect(account.sections[0]?.componentKey).toBe('system.commerce-header');
    for(const page of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){
      expect(JSON.stringify(page.sections[0]),page.pageType).toBe(header);
      expect(JSON.stringify(page.sections.at(-1)),page.pageType).toBe(footer);
    }
  });

  it('uses the generic readable information archetype for content pages',()=>{
    const ids=content.sections.map(section=>section.id);
    expect(ids).toContain('playroom-content-information-intro');
    expect(ids).toContain('playroom-content-information-body-section');
    expect(ids).not.toContain('playroom-content-feature-preset');
    const serialized=JSON.stringify(content);
    expect(serialized).toContain('content.page.title');
    expect(serialized).toContain('content.page.summary');
    expect(serialized).toContain('content.page.body');
    expect(serialized).toContain('whiteSpace');
    expect(serialized).toContain('pre-line');
  });

  it('renders demo notices with explicit high-contrast text independent of theme text tokens',()=>{
    const noticed=applyStorefrontTemplateDemoNotice(content);
    const serialized=JSON.stringify(noticed.sections[1]);
    expect(serialized).toContain(STOREFRONT_DEMO_CONTENT_NOTICE);
    expect(serialized).toContain('#ffd86b');
    expect(serialized).toContain('#211600');
    expect(serialized).toContain('MINTA TARTALOM');
  });
});