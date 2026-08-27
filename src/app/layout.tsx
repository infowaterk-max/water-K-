import type { Metadata } from 'next';
import Link from 'next/link';
import { CartProvider } from '@/components/cart/cart-provider';
import './globals.css';
import './store-v2.css';
import './flow-v2.css';

export const metadata: Metadata = {
  title: 'Water-K | Vízmegtartó technológia',
  description: 'Water-K vízmegtartó technológia kertészethez, gyephez, dísznövényekhez és fákhoz.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <CartProvider>
          <header className="siteHeader">
            <div className="shell nav">
              <Link className="brand" href="/">Water-K</Link>
              <nav className="navLinks" aria-label="Fő navigáció">
                <Link href="/#hogyan-mukodik">Technológia</Link>
                <Link href="/webaruhaz">Webáruház</Link>
                <Link href="/fiokom">Fiókom</Link>
                <Link className="cartLink" href="/kosar">Kosár</Link>
              </nav>
            </div>
          </header>
          {children}
          <footer className="footer">
            <div className="shell splitFeature">
              <div><strong>Water-K</strong><p className="muted">Vízmegtartó technológia és saját fejlesztésű webáruház.</p></div>
              <div className="tagRow"><Link href="/webaruhaz">Webáruház</Link><Link href="/fiokom">Fiókom</Link><Link href="/kosar">Kosár</Link></div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
