import { Label } from '@primer/react';
import { FEATURE_LABEL_VARIANT, type FeatureLabelKey } from '../../ui/featureLabels';

export interface FeaturePill {
  label: string;
  feature: FeatureLabelKey;
}

export default function FeaturesUsed({ features }: { features: readonly FeaturePill[] }) {
  if (features.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted uppercase tracking-wider">Features used:</span>
      {features.map((pill) => (
        <Label key={pill.label} variant={FEATURE_LABEL_VARIANT[pill.feature]}>{pill.label}</Label>
      ))}
    </div>
  );
}
