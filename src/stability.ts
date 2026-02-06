export type StabilityLevel = 'stable' | 'beta' | 'alpha' | 'deprecated';

export interface StabilityInfo {
  level: StabilityLevel;
  since: string;
  note?: string;
}

export const STABILITY = {
  auth: { level: 'stable', since: '0.1.0' },
  http: { level: 'stable', since: '0.1.0' },
  errors: { level: 'stable', since: '0.1.0' },
  leads: { level: 'stable', since: '0.1.0' },
  contacts: { level: 'stable', since: '0.1.0' },
  deals: { level: 'stable', since: '0.1.0' },
  leadsSearch: { level: 'beta', since: '0.2.0', note: 'Builder-style search helpers for Leads.' },
  webhooks: { level: 'beta', since: '0.1.0', note: 'Beta: minor breaking changes may occur in minor releases.' },
  bulk: { level: 'beta', since: '0.1.0', note: 'Beta: minor breaking changes may occur in minor releases.' },
  experimental: { level: 'alpha', since: '0.1.0', note: 'Alpha: opt-in only, may change anytime.' }
} as const satisfies Record<string, StabilityInfo>;

export function getStability(name: keyof typeof STABILITY): StabilityInfo {
  return STABILITY[name];
}
