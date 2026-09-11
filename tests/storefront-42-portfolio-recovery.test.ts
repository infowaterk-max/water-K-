import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_TEMPLATE_CATALOG,
  STOREFRONT_TEMPLATE_LAUNCH_TARGET,
  STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,
} from '@/lib/builder/storefront-template-catalog';

const EXPECTED_IMPLEMENTED_IDENTITIES=[
  'outdoor.alpine-lodge@1',
  'beauty.beauty-lab@1',
  'tech.creator-station@1',
  'beauty.derma-studio@1',
  'fashion.editorial-atelier@1',
  'home.gallery-edit@1',
  'home.warm-minimal@1',
  'jewelry.heritage-atelier@1',
  'gaming.loot-vault@1',
  'food.market-pantry@1',
  'jewelry.modern-luxe@1',
  'fashion.monarche@1',
  'pet.my-pack@1',
  'sport.performance-lab@1',
  'gaming.playroom@1',
  'gaming.rig-forge@1',
  'beauty.ritual-house@1',
  'tech.spec-lab@1',
  'sport.sport-hub@1',
  'jewelry.statement-lab@1',
  'fashion.street-drop@1',
  'food.table-gift@1',
  'tech.tech-deck@1',
  'industrial.tool-depot@1',
  'sport.trail-expedition@1',
] as const;

const catalogIdentities=()=>STOREFRONT_TEMPLATE_CATALOG.map(
  template=>`${template.templateKey}@${template.templateVersion}`,
);

describe('Storefront 42 portfolio recovery gate',()=>{
  it('advances only when a concrete package is added',()=>{
    expect(STOREFRONT_TEMPLATE_LAUNCH_TARGET).toBe(42);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.implemented).toBe(25);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining).toBe(17);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.fabricatedEntriesAllowed).toBe(false);
  });

  it('locks the exact concrete package identities after Warm Minimal',()=>{
    expect([...catalogIdentities()].sort()).toEqual([...EXPECTED_IMPLEMENTED_IDENTITIES].sort());
  });

  it('keeps launch arithmetic tied to concrete source-controlled packages',()=>{
    expect(STOREFRONT_TEMPLATE_CATALOG).toHaveLength(EXPECTED_IMPLEMENTED_IDENTITIES.length);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining).toBe(
      STOREFRONT_TEMPLATE_LAUNCH_TARGET-EXPECTED_IMPLEMENTED_IDENTITIES.length,
    );
  });
});
