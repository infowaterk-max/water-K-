export type IntegrationState='ready'|'configured'|'blocked'|'not_configured';
export type IntegrationDescriptor={id:string;label:string;category:'payment'|'shipping'|'database'|'invoicing';state:IntegrationState;detail:string};

export function getIntegrationRegistry():IntegrationDescriptor[]{
  const khConfigured=Boolean(process.env.KH_MERCHANT_ID&&(process.env.KH_API_SECRET||process.env.KH_SECRET));
  const foxpostConfigured=Boolean(process.env.FOXPOST_API_KEY);
  const glsConfigured=Boolean(process.env.GLS_USERNAME&&process.env.GLS_PASSWORD);
  const mplConfigured=Boolean(process.env.MPL_API_KEY);
  const supabaseConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)&& (process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY));
  return [
    {id:'supabase',label:'Supabase',category:'database',state:supabaseConfigured?'ready':'not_configured',detail:supabaseConfigured?'Adatbázis, Auth és szerveroldali admin kapcsolat aktív.':'Hiányzik egy vagy több Supabase környezeti változó.'},
    {id:'kh',label:'K&H bankkártya',category:'payment',state:khConfigured?'configured':'not_configured',detail:khConfigured?'Kulcsok érzékelve; a hivatalos banki szerződés szerinti adapter aktiválásra vár.':'Bankkártyás fizetés nem jelenik meg a pénztárban.'},
    {id:'foxpost',label:'Foxpost',category:'shipping',state:foxpostConfigured?'configured':'not_configured',detail:foxpostConfigured?'API-kulcs érzékelve; shipment adapter bekötésre kész.':'Foxpost API-kulcs nincs beállítva.'},
    {id:'gls',label:'GLS',category:'shipping',state:glsConfigured?'configured':'not_configured',detail:glsConfigured?'Hitelesítő adatok érzékelve.':'GLS hitelesítő adatok nincsenek beállítva.'},
    {id:'mpl',label:'MPL',category:'shipping',state:mplConfigured?'configured':'not_configured',detail:mplConfigured?'API-kulcs érzékelve.':'MPL API-kulcs nincs beállítva.'},
    {id:'invoicing',label:'Számlázás',category:'invoicing',state:'blocked',detail:'Provider-független hook elkészítve; konkrét számlázó szolgáltató még nincs kiválasztva.'},
  ];
}
