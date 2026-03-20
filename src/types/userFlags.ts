export interface UserFlag {
  kind: string;
  label: string;
  severity: 'warning' | 'info';
}

export const FLAG_NO_PREMIUM_MODELS = 'no-premium-models';
export const FLAG_QUOTA_EXHAUSTION = 'quota-exhaustion';
