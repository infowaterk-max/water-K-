import{readFileSync}from'node:fs';
import{join}from'node:path';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('floating Team Chat dock overflow guard',()=>{
  it('loads the dock guard after the communication layout owners',()=>{
    const layout=read('src/app/admin/kommunikacio/layout.tsx');
    const app=layout.indexOf("import './communication-app-final.css';");
    const compat=layout.indexOf("import './mobile-desktop-compat.css';");
    const guard=layout.indexOf("import './chat-dock-overflow-fix.css';");
    expect(app).toBeGreaterThanOrEqual(0);
    expect(compat).toBeGreaterThan(app);
    expect(guard).toBeGreaterThan(compat);
  });

  it('keeps the floating dock while removing external shadow overflow',()=>{
    const css=read('src/app/admin/kommunikacio/chat-dock-overflow-fix.css');
    expect(css).toContain('.digitalOfficeShell .digitalOfficeChatDock');
    expect(css).toContain('filter:none!important');
    expect(css).toContain('box-shadow:none!important');
    expect(css).not.toContain('display:none');
  });
});
