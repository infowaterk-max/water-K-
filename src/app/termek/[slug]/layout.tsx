import { requireStorefrontBrowseAccess } from '@/lib/storefront/access';
export default async function ProductLayout({children}:{children:React.ReactNode}){await requireStorefrontBrowseAccess();return children}
