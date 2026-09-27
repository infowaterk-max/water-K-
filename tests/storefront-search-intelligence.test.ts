import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {smartStorefrontSearchMatch,storefrontSearchSuggestions} from '@/lib/storefront/search-intelligence';

describe('storefront search intelligence',()=>{
  it('recognizes platform and gamer synonyms without AI',()=>{
    expect(smartStorefrontSearchMatch('ps5',['PlayStation játék','Kooperatív'])).toBe(true);
    expect(smartStorefrontSearchMatch('gamepad',['Prémium kontroller','Xbox'])).toBe(true);
    expect(smartStorefrontSearchMatch('coop',['Kooperatív kaland','PC'])).toBe(true);
  });

  it('tolerates one-character typos and adjacent transpositions',()=>{
    expect(smartStorefrontSearchMatch('kontroler',['Kontroller','Kiegészítő'])).toBe(true);
    expect(smartStorefrontSearchMatch('nitnendo',['Nintendo Switch','Konzol'])).toBe(true);
    expect(smartStorefrontSearchMatch('playstaton',['PlayStation','Játék'])).toBe(true);
  });

  it('does not turn fuzzy search into arbitrary matching',()=>{
    expect(smartStorefrontSearchMatch('monitor',['Kontroller','Xbox','Verseny'])).toBe(false);
    expect(smartStorefrontSearchMatch('kaland',['Arcade verseny','PC'])).toBe(false);
  });

  it('deduplicates autocomplete suggestions and wires them into ShopCatalog',()=>{
    expect(storefrontSearchSuggestions(['PlayStation','playstation','Xbox','Kontroller'],10)).toEqual(['PlayStation','Xbox','Kontroller']);
    const source=readFileSync('src/components/catalog/shop-catalog.tsx','utf8');
    expect(source).toContain('smartStorefrontSearchMatch');
    expect(source).toContain('storefrontSearchSuggestions');
    expect(source).toContain('shop-search-suggestions');
  });
});
