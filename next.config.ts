import type { NextConfig } from 'next';

const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(self)'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'},
  // Next.js App Router streaming uses framework-generated inline bootstrap scripts/styles.
  // Without these explicit directives the browser blocks hydration and can render a blank page.
  {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https:; img-src 'self' data: blob: https:; connect-src 'self' https:; upgrade-insecure-requests"},
];

// Device Lab keeps the global anti-clickjacking policy intact. Only same-origin admin
// iframe navigations (or the explicit preview marker used for the initial load) can be framed.
const devicePreviewHeaders=[
  {key:'X-Frame-Options',value:'SAMEORIGIN'},
  {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self' https:; img-src 'self' data: blob: https:; connect-src 'self' https:; upgrade-insecure-requests"},
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress:true,
  images: { remotePatterns: [], formats:['image/avif','image/webp'] },
  poweredByHeader:false,
  async headers(){return[
    {source:'/:path*',headers:securityHeaders},
    {source:'/admin/:path*',has:[{type:'query',key:'__shoperation_device_preview',value:'1'}],headers:devicePreviewHeaders},
    {source:'/admin/:path*',has:[{type:'header',key:'sec-fetch-dest',value:'iframe'}],headers:devicePreviewHeaders},
  ]},
};

export default nextConfig;
