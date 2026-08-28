import type { Metadata } from 'next';
import Link from 'next/link';
import { CartProvider } from '@/components/cart/cart-provider';
import { AnalyticsProvider } from '@/components/analytics/analytics-provider';
import { CookieConsent } from '@/components/analytics/cookie-consent';
import './globals.css';
import './store-v2.css';
import './flow-v2.css';
import './v6.css';
import './v7.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://water-k-native.vercel.app';

export const metadata: Metadata = {
  metadataBase:new URL(siteUrl),
  title:{default:'Water-K | Vízmegtartó technológia',template:'%s | Water-K'},
  description:'Water-K vízmegtartó technológia kertészethez, gyephez, dísznövényekhez és fákhoz. Magyar fejlesztésű webáruház, közvetlen rendelés.',
  applicationName:'Water-K',
  keywords:['Water-K','vízmegtartó','hidrogél','talaj vízmegtartás','gyep','kertészet','dísznövény','öntözés'],
  alternates:{canonical:'/'},
  openGraph:{type:'website',locale:'hu_HU',url:'/',siteName:'Water-K',title:'Water-K | Vízmegtartó technológia',description:'Vízmegtartó technológia kertészethez, gyephez, dísznövényekhez és fákhoz.'},
  twitter:{card:'summary_large_image',title:'Water-K | Vízmegtartó technológia',description:'Tudatosabb vízhasználat kertészetben és otthon.'},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1}},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <AnalyticsProvider>
          <CartProvider>
            <a className="skipLink" href="#main-content">Ugrás a tartalomhoz</a>
            <header className="siteHeader">
              <div className="shell nav">
                <Link className="brand" href="/">Water-K</Link>
                <nav className="navLinks" aria-label="Fő navigáció">
                  <Link href="/#hogyan-mukodik">Technológia</Link>
                  <Link href="/webaruhaz">Webáruház</Link>
                  <Link href="/gyik">GYIK</Link>
                  <Link href="/kapcsolat">Kapcsolat</Link>
                  <Link href="/fiokom">Fiókom</Link>
                  <Link className="cartLink" href="/kosar">Kosár</Link>
                </nav>
              </div>
            </header>
            <div id="main-content" tabIndex={-1}>{children}</div>
            <footer className="footer">
              <div className="shell splitFeature">
                <div><strong>Water-K</strong><p className="muted">Vízmegtartó technológia és saját fejlesztésű webáruház.</p></div>
                <div className="tagRow"><Link href="/webaruhaz">Webáruház</Link><Link href="/szallitas-es-fizetes">Szállítás és fizetés</Link><Link href="/gyik">GYIK</Link><Link href="/kapcsolat">Kapcsolat</Link><Link href="/aszf">ÁSZF</Link><Link href="/adatvedelem">Adatkezelés</Link><Link href="/fiokom">Fiókom</Link></div>
              </div>
            </footer>
            <CookieConsent/>
          </CartProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
