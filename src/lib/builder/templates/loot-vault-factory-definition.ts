import type {StorefrontFactoryDefinition} from '@/lib/builder/storefront-template-factory';
import {GAMING_STOREFRONT_FACTORY_RECIPE} from '@/lib/builder/storefront-template-factory-recipes';
import {PLANS} from '@/lib/plans/catalog';

/**
 * Loot Vault is the first Template Factory v1 canary.
 *
 * Media is intentionally empty at this stage. The accepted reference contract is
 * frozen first; representative assets are populated in the visual build step.
 * Therefore Product Owner readiness MUST remain false until the media pack is complete.
 */
export const LOOT_VAULT_FACTORY_DEFINITION:StorefrontFactoryDefinition=Object.freeze({
  templateKey:'gaming.loot-vault',
  templateVersion:2,
  displayName:'Loot Vault',
  demoNamespace:'gaming-loot-vault-v2',
  minPlan:'alap',
  requiredFeatures:PLANS.alap.features,
  category:GAMING_STOREFRONT_FACTORY_RECIPE,
  dna:Object.freeze({
    character:'warm-cinematic-fandom-collector-storefront',
    tokens:Object.freeze({
      background:'#0a0908',
      surface:'#17130f',
      surfaceMuted:'#211a14',
      text:'#f7ead7',
      mutedText:'#b8aa96',
      border:'#3e3022',
      primary:'#14100c',
      primaryContrast:'#f7ead7',
      accent:'#c68b42',
      accentSecondary:'#6c3b35',
      accentTertiary:'#315f5d',
      headingFont:'editorial-serif',
      bodyFont:'system-sans',
      spacingScale:'comfortable',
      radiusScale:'soft',
    }),
  }),
  reference:Object.freeze({
    referenceKey:'gaming.loot-vault.accepted-reference-2026-09-06',
    requiredMediaRoles:Object.freeze(['hero','category','product','editorial'] as const),
    minimumRepresentativeMedia:14,
    forbidPlaceholderSvg:true,
  }),
  media:Object.freeze([]),
  copy:Object.freeze({
    tagline:'Fandom. Gyűjtemény. Történetek.',
    heroEyebrow:'Loot Vault',
    heroTitle:'A történetek nem érnek véget.',
    heroCopy:'Fedezd fel a kedvenc univerzumaidat. Gyűjts. Játssz. Légy részese.',
    heroCta:'Válaszd ki az univerzumodat',
    catalogTitle:'Gyűjtői termékek',
    catalogCopy:'Figurák, ruházat, kiegészítők, relikviák és limitált kiadások egy helyen.',
    productEyebrow:'Loot Vault',
    editorialEyebrow:'Gyűjtőknek. Rajongóknak. Mindenkinek.',
    editorialTitle:'Több mint termékek. Egy közösség.',
    editorialCopy:'A gyűjtés történetekről, kedvenc univerzumokról és valódi tárgyakról szól.',
    editorialCta:'Fedezd fel a kollekciókat',
  }),
  navigation:Object.freeze({
    primary:Object.freeze([
      {label:'Univerzumok',href:'/webaruhaz'},
      {label:'Figurák',href:'/webaruhaz?category=figurak'},
      {label:'Ruházat',href:'/webaruhaz?category=ruhazat'},
      {label:'Kiegészítők',href:'/webaruhaz?category=kiegeszitok'},
      {label:'Limitált kiadások',href:'/webaruhaz?filter=limited'},
      {label:'Előrendelések',href:'/webaruhaz?filter=preorder'},
    ]),
    footer:Object.freeze([
      {id:'shop',title:'Felfedezés',items:Object.freeze([
        {label:'Univerzumok',href:'/webaruhaz'},
        {label:'Limitált kiadások',href:'/webaruhaz?filter=limited'},
        {label:'Előrendelések',href:'/webaruhaz?filter=preorder'},
      ])},
      {id:'support',title:'Segítség',items:Object.freeze([
        {label:'Szállítás',href:'/oldal/szallitas'},
        {label:'GYIK',href:'/gyik'},
        {label:'Kapcsolat',href:'/kapcsolat'},
      ])},
    ]),
  }),
  demoFixtures:Object.freeze([]),
});
