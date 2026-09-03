import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin decision reliability closure',()=>{
  test('admin catalog workflows use the whole tenant catalog rather than the viewer storefront channel',()=>{
    for(const file of[
      'src/app/admin/page.tsx',
      'src/app/admin/beszerzes/page.tsx',
      'src/app/admin/termekajanlasok/page.tsx',
      'src/app/admin/termekek/tomeges/page.tsx',
      'src/app/admin/termekek/import-export/page.tsx',
      'src/app/admin/indulas/actions.ts',
    ]){
      expect(read(file)).toContain('getProducts({includeAllChannels:true');
    }
  });

  test('merchant dashboard does not turn failed reads or missing costs into real business results',()=>{
    const page=read('src/app/admin/page.tsx');
    expect(page).toContain("orderLoadError?'—'");
    expect(page).toContain('advancedProfitComplete');
    expect(page).toContain('matchedProfitItems');
    expect(page).toContain('Hiányos önköltségadat miatt nem számolható biztosan.');
    expect(page).toContain("advancedLoadError?'—'");
  });

  test('analytics avoids a fake growth percentage without a prior-period base',()=>{
    const page=read('src/app/admin/elemzes/page.tsx');
    expect(page).toContain('growth=prev>0?');
    expect(page).toContain('Nincs biztos összehasonlítási alap.');
    expect(page).toContain('Termékenkénti fedezet');
    expect(page).toContain('<th>Önköltség</th>');
    expect(page).toContain('!loadError&&productRows.map');
  });

  test('campaign comparison requires complete frozen cost evidence before showing profit',()=>{
    const page=read('src/app/admin/kampanyok/page.tsx');
    expect(page).toContain('completeCost');
    expect(page).toContain('i.line_total_net_huf_snapshot==null||i.unit_cost_net_huf_snapshot==null');
    expect(page).toContain('items.length>=100000');
    expect(page).toContain('teljes önköltségadat kell');
  });

  test('monitoring and automation make read failures visible and block stale-state actions',()=>{
    const monitoring=read('src/app/admin/megfigyeles/page.tsx');
    const automation=read('src/app/admin/automatizalas/page.tsx');
    expect(monitoring).toContain('kpiError||issueError');
    expect(monitoring).toContain('A hiányzó értéket ne tekintsd hibamentes állapotnak.');
    expect(automation).toContain('canManage&&!loadError');
    expect(automation).toContain('Biztonsági okból a módosító műveleteket addig letiltjuk.');
    expect(automation).toContain('statusLabel');
  });

  test('action, returns and procurement screens fail closed on incomplete evidence',()=>{
    const actions=read('src/app/admin/intezkedesek/page.tsx');
    const returns=read('src/app/admin/visszaru/page.tsx');
    const procurement=read('src/app/admin/beszerzes/page.tsx');
    expect(actions).toContain('const canAct=canManage&&!error');
    expect(actions).toContain("proposalError?'—'");
    expect(returns).toContain('loadError=Boolean(error||itemError)');
    expect(returns).toContain('Adatbetöltés szükséges');
    expect(procurement).toContain('overdue=open.filter');
    expect(procurement).toContain('!loadError&&formVariants.length>0');
    expect(procurement).toContain('Lejárt kötelezettség');
  });

  test('basic marketing metrics do not show false zero values after partial read failure',()=>{
    const page=read('src/app/admin/marketing/page.tsx');
    expect(page).toContain("consentError?'—':subscribers.length");
    expect(page).toContain("recoveryError?'—':open.length");
  });
});
