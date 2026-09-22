import { requireStorefrontAccess } from '@/lib/storefront/access';
export default async function ProductLayout({children}:{children:React.ReactNode}){await requireStorefrontAccess();return children}
