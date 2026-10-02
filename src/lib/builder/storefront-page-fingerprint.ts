import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PAGE_FINGERPRINT_VERSION='shoporation.storefront-page-fingerprint.v1' as const;

export const canonicalizeStorefrontFingerprintJson=(value:unknown):string=>{
  if(Array.isArray(value))return '['+value.map(canonicalizeStorefrontFingerprintJson).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value as Record<string,unknown>).sort()
      .map(key=>JSON.stringify(key)+':'+canonicalizeStorefrontFingerprintJson((value as Record<string,unknown>)[key]))
      .join(',')+'}';
  }
  return JSON.stringify(value)??'null';
};

const bytesToHex=(bytes:Uint8Array)=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');

export async function sha256StorefrontCanonicalJson(value:unknown):Promise<string>{
  const subtle=globalThis.crypto?.subtle;
  if(!subtle)throw new Error('STOREFRONT_PAGE_FINGERPRINT_CRYPTO_UNAVAILABLE');
  const bytes=new TextEncoder().encode(canonicalizeStorefrontFingerprintJson(value));
  return bytesToHex(new Uint8Array(await subtle.digest('SHA-256',bytes)));
}

export async function fingerprintStorefrontPageDocument(document:StorefrontPageDocument):Promise<string>{
  return sha256StorefrontCanonicalJson({
    templateKey:document.templateKey,
    templateVersion:document.templateVersion,
    pageType:document.pageType,
    page:document,
  });
}
