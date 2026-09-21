import {STOREFRONT_DEMO_CONTENT_NOTICE} from '@/lib/builder/storefront-template-route-integrity';

export function TemplateDemoContentNotice(){
  return <aside role="note" aria-label="Minta tartalom figyelmeztetés" style={{margin:'0 0 24px',padding:'14px 16px',border:'1px solid #d9a53b',borderRadius:12,background:'#fff4d8',color:'#5d4212',fontWeight:700,lineHeight:1.5}}>
    ⚠ {STOREFRONT_DEMO_CONTENT_NOTICE}
  </aside>;
}
