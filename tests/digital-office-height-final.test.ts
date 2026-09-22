import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Digital Office height completion',()=>{
  it('keeps the fix scoped to Digital Office instead of the global admin shell',()=>{
    const adminLayout=read('src/app/admin/layout.tsx');
    const officeLayout=read('src/app/admin/kommunikacio/layout.tsx');
    expect(adminLayout).not.toContain('admin-viewport-floor.css');
    expect(officeLayout).toContain("import './digital-office-height-final.css';");
  });

  it('uses measured flex remainder instead of viewport subtraction or height caps',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-height-final.css');
    expect(css).toContain('@media (min-width:851px)');
    expect(css).toContain('.adminContentShell:has(> .digitalOfficeShell)');
    expect(css).toContain('display:flex!important');
    expect(css).toContain('flex:1 1 auto!important');
    expect(css).toContain('.digitalOfficeWorkstationPage');
    expect(css).toContain('.teamChatWorkspace');
    expect(css).toContain('height:auto!important');
    expect(css).toContain('max-height:none!important');
    expect(css).not.toContain('height:clamp(');
    expect(css).not.toContain('height:calc(');
  });

  it('removes touch Desktop-site double-counting without changing native mobile',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-height-final.css');
    expect(css).toContain('.adminGrid[data-desktop-site-touch="true"] .digitalOfficeShell');
    expect(css).toContain('min-height:0!important');
    expect(css).not.toContain('@media (max-width:850px)');
  });

  it('keeps the original floating Team Chat dock styling',()=>{
    const officeLayout=read('src/app/admin/kommunikacio/layout.tsx');
    const workstation=read('src/app/admin/digital-office-workstation.css');
    expect(officeLayout).not.toContain('chat-dock-overflow-fix.css');
    expect(workstation).toContain('.digitalOfficeChatDock{position:fixed');
    expect(workstation).toContain('filter:drop-shadow');
  });
});
