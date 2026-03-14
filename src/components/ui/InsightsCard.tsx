import React from 'react';
import { COLOR_PALETTE, type AccentColor } from './colorSchemes';
import type { ColorTokens } from './colorSchemes';

type InsightsCardVariant = Extract<AccentColor, 'green' | 'blue' | 'red' | 'orange' | 'purple'>;

interface InsightsCardProps {
  title: string;
  variant?: InsightsCardVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

function deriveInsightColors(tokens: ColorTokens) {
  return { bg: tokens.bg50, heading: tokens.text800, body: tokens.text700, icon: tokens.text600 };
}

export default function InsightsCard({ title, variant = 'blue', children, className = '', icon }: InsightsCardProps) {
  const colors = deriveInsightColors(COLOR_PALETTE[variant]);

  const defaultIcon = (
    <svg
      className={`w-5 h-5 mt-0.5 shrink-0 ${colors.icon}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a7 7 0 00-4 12.83V18a2 2 0 002 2h4a2 2 0 002-2v-3.17A7 7 0 0012 2z" />
      <path d="M9 18h6" />
    </svg>
  );

  return (
    <div className={`p-4 rounded-lg ${colors.bg} ${className}`.trim()}>
      <div className="flex items-start gap-2 mb-2">
        {icon || defaultIcon}
        <h4 className={`font-semibold ${colors.heading}`}>{title}</h4>
      </div>
      <div className={`text-sm ${colors.body}`}>
        {children}
      </div>
    </div>
  );
}
