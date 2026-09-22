import type{ReactNode}from'react';
import{StorefrontContentShell}from'@/components/content/storefront-content-shell';
import{requireStorefrontBrowseAccess}from'@/lib/storefront/access';

export default async function ProductLayout({children}:{children:ReactNode}){
 await requireStorefrontBrowseAccess();
 return <StorefrontContentShell pageKey="product">{children}</StorefrontContentShell>;
}
