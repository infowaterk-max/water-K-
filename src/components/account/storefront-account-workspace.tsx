'use client';
import type{ReactNode}from'react';

export function StorefrontAccountWorkspace({navigation,children}:{navigation:ReactNode;children:ReactNode}){
 return <div className="storefrontAccountWorkspace" data-account-navigation-authority="platform-ia">
  <aside className="storefrontAccountSidebar" aria-label="Fiók navigáció">{navigation}</aside>
  <div className="storefrontAccountRouteContent">{children}</div>
 </div>;
}
