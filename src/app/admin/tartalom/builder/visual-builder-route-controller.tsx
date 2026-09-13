'use client';

import {useEffect,type ReactNode} from 'react';

const SMALL_VIEWPORT='(max-width: 1100px)';

function setMobilePanelsClosed(root:HTMLElement){
  const workspace=root.querySelector<HTMLElement>('[data-left-collapsed][data-inspector-open]');
  if(!workspace)return;
  if(workspace.dataset.leftCollapsed==='false')root.querySelector<HTMLButtonElement>('button[title="Bal panel"]')?.click();
  if(workspace.dataset.inspectorOpen==='true')root.querySelector<HTMLButtonElement>('button[title="Inspector"]')?.click();
}

export function VisualBuilderRouteController({children}:{children:ReactNode}){
  useEffect(()=>{
    const html=document.documentElement;
    const root=document.querySelector<HTMLElement>('[data-visual-builder-route]');
    const media=window.matchMedia(SMALL_VIEWPORT);
    html.classList.add('visual-builder-route-active');

    const normalize=()=>{
      if(!media.matches||!root)return;
      window.requestAnimationFrame(()=>setMobilePanelsClosed(root));
    };
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||!media.matches||!root)return;
      const workspace=root.querySelector<HTMLElement>('[data-left-collapsed][data-inspector-open]');
      if(!workspace)return;
      if(workspace.dataset.leftCollapsed==='false')root.querySelector<HTMLButtonElement>('button[title="Bal panel"]')?.click();
      if(workspace.dataset.inspectorOpen==='true')root.querySelector<HTMLButtonElement>('button[title="Inspector"]')?.click();
    };

    normalize();
    media.addEventListener('change',normalize);
    window.addEventListener('keydown',onKeyDown);
    return()=>{
      media.removeEventListener('change',normalize);
      window.removeEventListener('keydown',onKeyDown);
      html.classList.remove('visual-builder-route-active');
    };
  },[]);

  return <div className="visualBuilderRouteIsolation" data-visual-builder-route>{children}</div>;
}
