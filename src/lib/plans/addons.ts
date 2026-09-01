export type AddonCode =
  | 'ai-assistant'
  | 'advanced-export'
  | 'priority-support'
  | 'custom-integration';

export type AddonDefinition = {
  code: AddonCode;
  name: string;
  description: string;
  compatiblePlans: readonly ('alap' | 'pro')[];
};

export const ADDONS: Record<AddonCode, AddonDefinition> = {
  'ai-assistant': {
    code: 'ai-assistant',
    name: 'AI asszisztens',
    description: 'Használatalapú mesterséges intelligencia funkciók és üzleti segítség külön aktiválható kerettel.',
    compatiblePlans: ['alap', 'pro'],
  },
  'advanced-export': {
    code: 'advanced-export',
    name: 'Haladó export',
    description: 'Bővített adat- és riportexport külső feldolgozáshoz.',
    compatiblePlans: ['alap', 'pro'],
  },
  'priority-support': {
    code: 'priority-support',
    name: 'Kiemelt támogatás',
    description: 'Gyorsabb támogatási csatorna és magasabb szolgáltatási prioritás.',
    compatiblePlans: ['alap', 'pro'],
  },
  'custom-integration': {
    code: 'custom-integration',
    name: 'Egyedi integráció',
    description: 'Ügyfélspecifikus külső rendszerkapcsolat és adatcsere.',
    compatiblePlans: ['pro'],
  },
};

export function isAddonCode(value: unknown): value is AddonCode {
  return typeof value === 'string' && value in ADDONS;
}

export function parseAddonList(value: string | undefined): AddonCode[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((item) => item.trim()).filter(isAddonCode))];
}
