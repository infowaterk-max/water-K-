import { requireStorefrontAccess } from '@/lib/storefront/access';
export default async function ConfirmationLayout({children}:{children:React.ReactNode}){await requireStorefrontAccess();return children}
