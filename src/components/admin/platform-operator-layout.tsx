import type { ReactNode } from 'react';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';

export default async function PlatformOperatorLayout({children}:{children:ReactNode}){
  await requirePlatformOperator();
  return children;
}
