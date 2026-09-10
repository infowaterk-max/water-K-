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

  it('removes the desktop max-height ceiling while preserving native mobile and touch Desktop-site ownership',()=>{
    const css=read('src/app/admin/kommunikacio/digital-office-height-final.css');
    expect(css).toContain('@media (min-width:1101px)');
    expect(css).toContain('.digitalOfficeWorkstation');
    expect(css).toContain('.teamChatWorkspace');
    expect(css).toContain('height:calc(100dvh - 150px)!important');
    expect(css).toContain('height:calc(100dvh - 185px)!important');
    expect(css).toContain('max-height:none!important');
    expect(css).toContain(':not([data-desktop-site-touch="true"])');
    expect(css).not.toContain('860px');
    expect(css).not.toContain('display:none');
  });

  it('restores the floating Team Chat dock styling from the rejected diagnostic',()=>{
    const officeLayout=read('src/app/admin/kommunikacio/layout.tsx');
    const workstation=read('src/app/admin/digital-office-workstation.css');
    expect(officeLayout).not.toContain('chat-dock-overflow-fix.css');
    expect(workstation).toContain('.digitalOfficeChatDock{position:fixed');
    expect(workstation).toContain('filter:drop-shadow');
  });
});
