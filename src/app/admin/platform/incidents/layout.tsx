import{requirePlatformOperator}from'@/lib/auth/platform-operator';

export default async function PlatformIncidentLayout({children}:{children:React.ReactNode}){
  await requirePlatformOperator();
  return children;
}
