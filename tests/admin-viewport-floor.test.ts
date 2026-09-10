import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('admin viewport floor',()=>{
  it('overrides the legacy public-header height subtraction for admin pages',()=>{
    const globals=read('src/app/globals.css');
    const adminLayout=read('src/app/admin/layout.tsx');
    const floor=read('src/app/admin/admin-viewport-floor.css');
    expect(globals).toContain('min-height:calc(100vh - 76px)');
    expect(adminLayout).toContain("import './admin-viewport-floor.css';");
    expect(floor).toContain('.adminGrid{');
    expect(floor).toContain('min-height:100dvh!important');
  });

  it('continues the admin visual surface below short content without changing scroll ownership',()=>{
    const floor=read('src/app/admin/admin-viewport-floor.css');
    expect(floor).toContain('body:has(.adminGrid)');
    expect(floor).toContain('#f4f6f5');
    expect(floor).toContain('#172c29');
    expect(floor).toContain('#11231f');
    expect(floor).not.toContain('overflow:');
    expect(floor).not.toContain('position:fixed');
  });

  it('restores the Team Chat dock after the rejected shadow hypothesis',()=>{
    const communicationLayout=read('src/app/admin/kommunikacio/layout.tsx');
    const workstation=read('src/app/admin/digital-office-workstation.css');
    expect(communicationLayout).not.toContain('chat-dock-overflow-fix.css');
    expect(workstation).toContain('.digitalOfficeChatDock{position:fixed');
    expect(workstation).toContain('filter:drop-shadow');
  });
});
