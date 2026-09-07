import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {FREQUENT_TASKS,MERCHANT_NAVIGATION,PLATFORM_NAVIGATION} from '../src/lib/navigation/admin-ia';

const root=process.cwd();

function walk(dir:string):string[]{
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

function routePattern(pageFile:string){
  const relative=path.relative(path.join(root,'src/app'),pageFile).replaceAll(path.sep,'/').replace(/\/page\.tsx$/,'');
  const segments=relative.split('/').filter(segment=>!/^\(.+\)$/.test(segment)&&!segment.startsWith('@'));
  const pattern=segments.map(segment=>{
    if(/^\[\[\.\.\..+\]\]$/.test(segment))return '(?:/.*)?';
    if(/^\[\.\.\..+\]$/.test(segment))return '/.+';
    if(/^\[.+\]$/.test(segment))return '/[^/]+';
    return `/${segment.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`;
  }).join('');
  return new RegExp(`^${pattern||'/'}$`);
}

const adminPages=walk(path.join(root,'src/app/admin')).filter(file=>file.endsWith(`${path.sep}page.tsx`)||file.endsWith('/page.tsx'));
const adminRoutePatterns=adminPages.map(routePattern);

function normalizeAdminTarget(target:string){
  return target.split('#')[0].split('?')[0].replace(/\/$/,'')||'/';
}

function hasAdminPage(target:string){
  const normalized=normalizeAdminTarget(target);
  return adminRoutePatterns.some(pattern=>pattern.test(normalized));
}

function staticAdminTargets(source:string){
  const patterns=[
    /href\s*:\s*['"](\/admin[^'"]*)['"]/g,
    /href\s*=\s*['"](\/admin[^'"]*)['"]/g,
    /href\s*=\s*\{\s*['"](\/admin[^'"]*)['"]\s*\}/g,
    /redirect\(\s*['"](\/admin[^'"]*)['"]\s*\)/g,
    /router\.(?:push|replace)\(\s*['"](\/admin[^'"]*)['"]\s*\)/g,
  ];
  const targets:string[]=[];
  for(const pattern of patterns){for(const match of source.matchAll(pattern))targets.push(match[1]);}
  return targets;
}

const expectedMerchantDestinations:Record<string,string>={
  'overview-home':'/admin',analytics:'/admin/elemzes',growth:'/admin/novekedes',executive:'/admin/vezetoi','action-center':'/admin/intezkedesek','control-tower':'/admin/iranyitokozpont',cashflow:'/admin/cashflow',
  orders:'/admin/rendelesek',returns:'/admin/visszaru',products:'/admin/termekek',recommendations:'/admin/termekajanlasok','import-export':'/admin/termekek/import-export',bulk:'/admin/termekek/tomeges',
  customers:'/admin/ugyfelek',crm:'/admin/ertekesites','customer-value':'/admin/ugyfelertek','follow-up':'/admin/utanakovetes','inventory-analysis':'/admin/keszlet-elemzes',procurement:'/admin/beszerzes',
  'marketing-basics':'/admin/marketing',campaigns:'/admin/kampanyok',coupons:'/admin/kuponok',reviews:'/admin/velemenyek',automation:'/admin/automatizalas',office:'/admin/kommunikacio',blocklist:'/admin/kommunikacio/tiltolista',support:'/admin/ugyfelszolgalat',content:'/admin/tartalom',
  launch:'/admin/indulas','commerce-settings':'/admin/beallitasok/fizetes-szallitas',integrations:'/admin/integraciok',team:'/admin/csapat',audit:'/admin/audit',plan:'/admin/csomag',settings:'/admin/beallitasok',pilot:'/admin/pilot-acceptance',
};

const expectedPlatformDestinations:Record<string,string>={
  'platform-stores':'/admin/platform/webaruhazak','platform-home':'/admin/platform','platform-actions':'/admin/intezkedesek','platform-safeguards':'/admin/biztositekok','platform-releases':'/admin/kiadasok','platform-rollout':'/admin/rollout','platform-postcheck':'/admin/utoellenorzes','platform-recovery':'/admin/helyreallitas','platform-observability':'/admin/megfigyeles','platform-operations':'/admin/muveletek','platform-log':'/admin/naplo',
};

describe('admin link integrity',()=>{
  it('pins every canonical merchant and platform menu item to its intended admin destination',()=>{
    const merchant=Object.fromEntries(MERCHANT_NAVIGATION.flatMap(section=>section.items).map(item=>[item.id,item.href]));
    const platform=Object.fromEntries(PLATFORM_NAVIGATION.map(item=>[item.id,item.href]));
    expect(merchant).toEqual(expectedMerchantDestinations);
    expect(platform).toEqual(expectedPlatformDestinations);
    expect(new Set(Object.values(merchant)).size).toBe(Object.values(merchant).length);
    expect(new Set(Object.keys(merchant)).size).toBe(Object.keys(merchant).length);
    expect(new Set(Object.keys(platform)).size).toBe(Object.keys(platform).length);
  });

  it('requires every canonical and quick-task admin destination to resolve to a real Next.js page',()=>{
    const destinations=[...Object.values(expectedMerchantDestinations),...Object.values(expectedPlatformDestinations),...FREQUENT_TASKS.map(item=>item.href)];
    const missing=[...new Set(destinations)].filter(target=>!hasAdminPage(target));
    expect(missing).toEqual([]);
  });

  it('audits every static admin href and redirect in runtime source against an existing page route',()=>{
    const sourceFiles=walk(path.join(root,'src')).filter(file=>/\.(?:ts|tsx)$/.test(file));
    const missing:{file:string;target:string}[]=[];
    for(const file of sourceFiles){
      const source=fs.readFileSync(file,'utf8');
      for(const target of staticAdminTargets(source)){
        if(!hasAdminPage(target))missing.push({file:path.relative(root,file),target});
      }
    }
    expect(missing).toEqual([]);
  });

  it('forces a full browser navigation for every mobile admin destination',()=>{
    const mobile=fs.readFileSync(path.join(root,'src/components/navigation/admin-mobile-navigation.tsx'),'utf8');
    expect(mobile).toContain('function forceNavigate(event:MouseEvent<HTMLAnchorElement>,href:string)');
    expect(mobile).toContain('event.preventDefault();');
    expect(mobile).toContain('event.stopPropagation();');
    expect(mobile).toContain('window.location.assign(href);');
    expect(mobile).toContain('<a key={item.id} href={item.href} data-admin-target={item.href} onClick={event=>forceNavigate(event,item.href)}');
    expect(mobile).toContain('quickItems.map(item=><a key={item.id} href={item.href} data-admin-target={item.href} onClick={event=>forceNavigate(event,item.href)}');
    expect(mobile).toContain('href="/admin/csomag" data-admin-target="/admin/csomag" onClick={event=>forceNavigate(event,\'/admin/csomag\')}');
    expect(mobile).not.toContain('onClick={onNavigate}');
    expect(mobile).not.toContain('quickItems.map(item=><Link');
  });

  it('keeps the analyst action-center route on the real action-center page',()=>{
    const page=fs.readFileSync(path.join(root,'src/app/admin/intezkedesek/page.tsx'),'utf8');
    expect(page).toContain("requireCurrentStoreContext('analytics.read')");
    expect(page).toContain('<h1 className="sectionTitle">Intézkedési központ</h1>');
    expect(page).not.toContain("redirect('/admin')");
  });
});
