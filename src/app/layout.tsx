import type { Metadata } from 'next';
import { CartProvider } from '@/components/cart/cart-provider';
import { AnalyticsProvider } from '@/components/analytics/analytics-provider';
import { CookieConsent } from '@/components/analytics/cookie-consent';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import './globals.css';
import './store-v2.css';
import './flow-v2.css';
import './v6.css';
import './v7.css';
import './showcase.css';
import './commerce-showcase.css';
import './storefront-concept.css';
import './interaction-polish.css';
import './visual-completion.css';
import './account-workflow.css';
import './public-pages-polish.css';
import './final-ux-audit.css';
import './responsive-final.css';
import './block3-pilot-batch.css';

const deploymentHost=process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
const fallbackSiteUrl=process.env.NEXT_PUBLIC_SITE_URL?.trim()||(deploymentHost?`https://${deploymentHost}`:'http://localhost:3000');
const fallbackBrand={name:'Shoperation Webshop',tagline:'Modern webáruház és közvetlen ügyfélkiszolgálás.',logoUrl:null as string|null,primaryColor:null as string|null,supportEmail:null as string|null,supportPhone:null as string|null,publicSiteUrl:fallbackSiteUrl,emailFromName:'Shoperation Webshop'};

export async function generateMetadata():Promise<Metadata>{
  const instance=await getCurrentWebshopInstance();
  const brand=instance?.brand??fallbackBrand;
  const siteUrl=brand.publicSiteUrl?.trim()||fallbackSiteUrl;
  const safeSiteUrl=siteUrl.startsWith('http://')||siteUrl.startsWith('https://')?siteUrl:fallbackSiteUrl;
  const description=brand.tagline||`${brand.name} webáruház – közvetlen rendelés és ügyfélkiszolgálás.`;
  return{
    metadataBase:new URL(safeSiteUrl),
    title:{default:brand.name,template:`%s | ${brand.name}`},
    description,
    applicationName:brand.name,
    alternates:{canonical:'/'},
    openGraph:{type:'website',locale:'hu_HU',url:'/',siteName:brand.name,title:brand.name,description},
    twitter:{card:'summary_large_image',title:brand.name,description},
    robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1}},
  };
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const instance=await getCurrentWebshopInstance();
  const brand=instance?.brand??fallbackBrand;
  const accent=brand.primaryColor?({['--tenant-primary' as string]:brand.primaryColor} as React.CSSProperties):undefined;
  return <html lang="hu" style={accent}><body><AnalyticsProvider><CartProvider><a className="skipLink" href="#main-content">Ugrás a tartalomhoz</a><div id="main-content" tabIndex={-1}>{children}</div><CookieConsent/></CartProvider></AnalyticsProvider></body></html>;
}
