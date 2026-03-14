/**
 * Shared color palette for accent-colored UI components.
 * All class strings are explicit so Tailwind never purges needed classes.
 */

export type AccentColor =
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'emerald'
  | 'violet'
  | 'red';

export interface ColorTokens {
  bg50: string;
  border200: string;
  text500: string;
  text600: string;
  text700: string;
  text800: string;
  text900: string;
  hoverBg100: string;
  ring500: string;
  groupHoverText600: string;
  groupHoverText700: string;
}

export const COLOR_PALETTE: Record<AccentColor, ColorTokens> = {
  blue: {
    bg50: 'bg-blue-50',
    border200: 'border-blue-200',
    text500: 'text-blue-500',
    text600: 'text-blue-600',
    text700: 'text-blue-700',
    text800: 'text-blue-800',
    text900: 'text-blue-900',
    hoverBg100: 'hover:bg-blue-100',
    ring500: 'focus-visible:ring-blue-500',
    groupHoverText600: 'group-hover:text-blue-600',
    groupHoverText700: 'group-hover:text-blue-700',
  },
  green: {
    bg50: 'bg-green-50',
    border200: 'border-green-200',
    text500: 'text-green-500',
    text600: 'text-green-600',
    text700: 'text-green-700',
    text800: 'text-green-800',
    text900: 'text-green-900',
    hoverBg100: 'hover:bg-green-100',
    ring500: 'focus-visible:ring-green-500',
    groupHoverText600: 'group-hover:text-green-600',
    groupHoverText700: 'group-hover:text-green-700',
  },
  purple: {
    bg50: 'bg-purple-50',
    border200: 'border-purple-200',
    text500: 'text-purple-500',
    text600: 'text-purple-600',
    text700: 'text-purple-700',
    text800: 'text-purple-800',
    text900: 'text-purple-900',
    hoverBg100: 'hover:bg-purple-100',
    ring500: 'focus-visible:ring-purple-500',
    groupHoverText600: 'group-hover:text-purple-600',
    groupHoverText700: 'group-hover:text-purple-700',
  },
  orange: {
    bg50: 'bg-orange-50',
    border200: 'border-orange-200',
    text500: 'text-orange-500',
    text600: 'text-orange-600',
    text700: 'text-orange-700',
    text800: 'text-orange-800',
    text900: 'text-orange-900',
    hoverBg100: 'hover:bg-orange-100',
    ring500: 'focus-visible:ring-orange-500',
    groupHoverText600: 'group-hover:text-orange-600',
    groupHoverText700: 'group-hover:text-orange-700',
  },
  teal: {
    bg50: 'bg-teal-50',
    border200: 'border-teal-200',
    text500: 'text-teal-500',
    text600: 'text-teal-600',
    text700: 'text-teal-700',
    text800: 'text-teal-800',
    text900: 'text-teal-900',
    hoverBg100: 'hover:bg-teal-100',
    ring500: 'focus-visible:ring-teal-500',
    groupHoverText600: 'group-hover:text-teal-600',
    groupHoverText700: 'group-hover:text-teal-700',
  },
  indigo: {
    bg50: 'bg-indigo-50',
    border200: 'border-indigo-200',
    text500: 'text-indigo-500',
    text600: 'text-indigo-600',
    text700: 'text-indigo-700',
    text800: 'text-indigo-800',
    text900: 'text-indigo-900',
    hoverBg100: 'hover:bg-indigo-100',
    ring500: 'focus-visible:ring-indigo-500',
    groupHoverText600: 'group-hover:text-indigo-600',
    groupHoverText700: 'group-hover:text-indigo-700',
  },
  amber: {
    bg50: 'bg-amber-50',
    border200: 'border-amber-200',
    text500: 'text-amber-500',
    text600: 'text-amber-600',
    text700: 'text-amber-700',
    text800: 'text-amber-800',
    text900: 'text-amber-900',
    hoverBg100: 'hover:bg-amber-100',
    ring500: 'focus-visible:ring-amber-500',
    groupHoverText600: 'group-hover:text-amber-600',
    groupHoverText700: 'group-hover:text-amber-700',
  },
  rose: {
    bg50: 'bg-rose-50',
    border200: 'border-rose-200',
    text500: 'text-rose-500',
    text600: 'text-rose-600',
    text700: 'text-rose-700',
    text800: 'text-rose-800',
    text900: 'text-rose-900',
    hoverBg100: 'hover:bg-rose-100',
    ring500: 'focus-visible:ring-rose-500',
    groupHoverText600: 'group-hover:text-rose-600',
    groupHoverText700: 'group-hover:text-rose-700',
  },
  emerald: {
    bg50: 'bg-emerald-50',
    border200: 'border-emerald-200',
    text500: 'text-emerald-500',
    text600: 'text-emerald-600',
    text700: 'text-emerald-700',
    text800: 'text-emerald-800',
    text900: 'text-emerald-900',
    hoverBg100: 'hover:bg-emerald-100',
    ring500: 'focus-visible:ring-emerald-500',
    groupHoverText600: 'group-hover:text-emerald-600',
    groupHoverText700: 'group-hover:text-emerald-700',
  },
  violet: {
    bg50: 'bg-violet-50',
    border200: 'border-violet-200',
    text500: 'text-violet-500',
    text600: 'text-violet-600',
    text700: 'text-violet-700',
    text800: 'text-violet-800',
    text900: 'text-violet-900',
    hoverBg100: 'hover:bg-violet-100',
    ring500: 'focus-visible:ring-violet-500',
    groupHoverText600: 'group-hover:text-violet-600',
    groupHoverText700: 'group-hover:text-violet-700',
  },
  red: {
    bg50: 'bg-red-50',
    border200: 'border-red-200',
    text500: 'text-red-500',
    text600: 'text-red-600',
    text700: 'text-red-700',
    text800: 'text-red-800',
    text900: 'text-red-900',
    hoverBg100: 'hover:bg-red-100',
    ring500: 'focus-visible:ring-red-500',
    groupHoverText600: 'group-hover:text-red-600',
    groupHoverText700: 'group-hover:text-red-700',
  },
};
