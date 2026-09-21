import{describe,expect,it}from'vitest';
import{normalizeStorefrontReturnTarget,storefrontAuthHref,storefrontReturnPath}from'@/lib/auth/storefront-return-target';

describe('storefront auth return target authority',()=>{
 it('accepts same-origin relative storefront intents including query and hash',()=>{
  expect(normalizeStorefrontReturnTarget('/termek/teszt?variant=1#reviews')).toBe('/termek/teszt?variant=1#reviews');
  expect(normalizeStorefrontReturnTarget('/webaruhaz?kategoria=jatekok#talalatok')).toBe('/webaruhaz?kategoria=jatekok#talalatok');
  expect(storefrontReturnPath('/fiokom/visszakuldes','?from=order')).toBe('/fiokom/visszakuldes?from=order');
  expect(storefrontAuthHref('/fiokom/visszakuldes')).toBe('/fiokom?next=%2Ffiokom%2Fvisszakuldes');
 });
 it.each([
  'https://evil.example/steal',
  'http://evil.example/steal',
  '//evil.example/steal',
  '/\\evil.example/steal',
  'javascript:alert(1)',
  'data:text/html,boom',
  '',
 ])('rejects unsafe redirect target %s',value=>{
  expect(normalizeStorefrontReturnTarget(value)).toBeNull();
 });
});
