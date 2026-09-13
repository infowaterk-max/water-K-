'use client';

import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';

const SMALL_VIEWPORT='(max-width: 1100px)';
const PHONE_VIEWPORT='(max-width: 900px)';

function resolveWorkspace(root:HTMLElement|null){
  const workspace=root?.querySelector<HTMLElement>('[data-left-collapsed][data-inspector-open]')??null;
  const leftToggle=root?.querySelector<HTMLButtonElement>('button[title="Bal panel"]')??null;
  const inspectorToggle=root?.querySelector<HTMLButtonElement>('button[title="Inspector"]')??null;
  return{workspace,leftToggle,inspectorToggle};
}

function findViewportButton(root:HTMLElement,label:'Desktop'|'Tablet'|'Mobil'){
  return Array.from(root.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Szerkesztési nézet"] button')).find(button=>button.textContent?.trim()===label)??null;
}

export function VisualBuilderRouteController({children}:{children:ReactNode}){
  const rootRef=useRef<HTMLDivElement>(null);
  const phoneInitializedRef=useRef(false);
  const[drawerOpen,setDrawerOpen]=useState(false);

  const closePanels=useCallback(()=>{
    const{workspace,leftToggle,inspectorToggle}=resolveWorkspace(rootRef.current);
    if(!workspace)return;
    if(workspace.dataset.leftCollapsed==='false')leftToggle?.click();
    if(workspace.dataset.inspectorOpen==='true')inspectorToggle?.click();
  },[]);

  useEffect(()=>{
    const html=document.documentElement;
    const root=rootRef.current;
    if(!root)return;
    const smallMedia=window.matchMedia(SMALL_VIEWPORT);
    const phoneMedia=window.matchMedia(PHONE_VIEWPORT);
    html.classList.add('visual-builder-route-active');

    const syncDrawer=()=>{
      const{workspace}=resolveWorkspace(root);
      if(!smallMedia.matches||!workspace){setDrawerOpen(false);return;}
      setDrawerOpen(workspace.dataset.leftCollapsed==='false'||workspace.dataset.inspectorOpen==='true');
    };
    const selectPhoneViewport=()=>{
      if(!phoneMedia.matches){phoneInitializedRef.current=false;return;}
      if(phoneInitializedRef.current)return;
      const mobileButton=findViewportButton(root,'Mobil');
      if(!mobileButton)return;
      phoneInitializedRef.current=true;
      if(mobileButton.getAttribute('aria-pressed')!=='true')mobileButton.click();
    };
    const normalize=()=>{
      const{workspace,leftToggle,inspectorToggle}=resolveWorkspace(root);
      if(smallMedia.matches&&workspace){
        if(workspace.dataset.leftCollapsed==='false')leftToggle?.click();
        if(workspace.dataset.inspectorOpen==='true')inspectorToggle?.click();
      }
      selectPhoneViewport();
      window.requestAnimationFrame(syncDrawer);
    };
    const onRootClick=(event:MouseEvent)=>{
      if(!smallMedia.matches)return;
      const{workspace,leftToggle,inspectorToggle}=resolveWorkspace(root);
      if(!workspace)return;
      const button=(event.target as Element|null)?.closest<HTMLButtonElement>('button')??null;
      if(button===leftToggle&&workspace.dataset.leftCollapsed==='true'&&workspace.dataset.inspectorOpen==='true')inspectorToggle?.click();
      if(button===inspectorToggle&&workspace.dataset.inspectorOpen==='false'&&workspace.dataset.leftCollapsed==='false')leftToggle?.click();
      window.requestAnimationFrame(syncDrawer);
    };
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&smallMedia.matches)closePanels();};
    const observer=new MutationObserver(records=>{
      const{workspace,leftToggle,inspectorToggle}=resolveWorkspace(root);
      if(smallMedia.matches&&workspace){
        for(const record of records){
          if(record.target!==workspace)continue;
          if(record.attributeName==='data-inspector-open'&&workspace.dataset.inspectorOpen==='true'&&workspace.dataset.leftCollapsed==='false')leftToggle?.click();
          if(record.attributeName==='data-left-collapsed'&&workspace.dataset.leftCollapsed==='false'&&workspace.dataset.inspectorOpen==='true')inspectorToggle?.click();
        }
      }
      selectPhoneViewport();
      window.requestAnimationFrame(syncDrawer);
    });

    observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-left-collapsed','data-inspector-open','aria-pressed']});
    root.addEventListener('click',onRootClick,true);
    smallMedia.addEventListener('change',normalize);
    phoneMedia.addEventListener('change',normalize);
    window.addEventListener('keydown',onKeyDown);
    window.requestAnimationFrame(normalize);

    return()=>{
      observer.disconnect();
      root.removeEventListener('click',onRootClick,true);
      smallMedia.removeEventListener('change',normalize);
      phoneMedia.removeEventListener('change',normalize);
      window.removeEventListener('keydown',onKeyDown);
      html.classList.remove('visual-builder-route-active');
    };
  },[closePanels]);

  return <div ref={rootRef} className="visualBuilderRouteIsolation" data-visual-builder-route>
    {children}
    {drawerOpen?<button type="button" className="visualBuilderDrawerScrim" aria-label="Szerkesztőpanel bezárása" onClick={closePanels}/>:null}
  </div>;
}
