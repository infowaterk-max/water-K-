import type { NextConfig } from 'next';

const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(self)'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'},
  {key:'Content-Security-Policy',value:"default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https:; img-src 'self' data: blob: https:; connect-src 'self' https:; upgrade-insecure-requests"},
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress:true,
  images: { remotePatterns: [], formats:['image/avif','image/webp'] },
  poweredByHeader:false,
  async headers(){return[{source:'/:path*',headers:securityHeaders}]},
};

export default nextConfig;
