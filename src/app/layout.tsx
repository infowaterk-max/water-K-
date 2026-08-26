import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Water-K | Vízmegtartó technológia',
  description: 'Water-K vízmegtartó technológia kertészethez, gyephez és fákhoz.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>
        <header className="siteHeader">
          <div className="shell nav">
            <Link className="brand" href="/">Water-K</Link>
            <nav className="navLinks">
              <Link href="/#hogyan-mukodik">Hogyan működik?</Link>
              <Link href="/webaruhaz">Webáruház</Link>
              <Link href="/fiokom">Fiókom</Link>
              <Link className="cartLink" href="/kosar">Kosár</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="footer"><div className="shell"><strong>Water-K</strong><span> Saját fejlesztésű webáruház · WordPress és WooCommerce nélkül</span></div></footer>
      </body>
    </html>
  );
}
