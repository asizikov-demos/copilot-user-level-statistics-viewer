/**
 * Maps the legacy accent names used by shared UI primitives to Primer semantic roles.
 *
 * Decorative roles (`accent`, `done`, `neutral`) render as neutral cards; status roles
 * keep their semantic color. Components expose the resolved role as `data-role` and
 * style it with `semanticRoles.module.css`.
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
  | 'cyan'
  | 'emerald'
  | 'violet'
  | 'red';

export type SemanticRole =
  | 'accent'
  | 'success'
  | 'attention'
  | 'severe'
  | 'danger'
  | 'done'
  | 'neutral';

export type StatusRole = Extract<SemanticRole, 'success' | 'attention' | 'severe' | 'danger'>;

export const ACCENT_ROLE: Readonly<Record<AccentColor, SemanticRole>> = {
  blue: 'accent',
  cyan: 'accent',
  green: 'success',
  emerald: 'success',
  amber: 'attention',
  orange: 'severe',
  red: 'danger',
  rose: 'danger',
  purple: 'done',
  violet: 'done',
  indigo: 'done',
  teal: 'neutral',
};

const STATUS_ROLES: ReadonlySet<SemanticRole> = new Set<StatusRole>(['success', 'attention', 'severe', 'danger']);

export function isStatusRole(role: SemanticRole): role is StatusRole {
  return STATUS_ROLES.has(role);
}

export function resolveAccentRole(accent: AccentColor): SemanticRole {
  return ACCENT_ROLE[accent] ?? 'neutral';
}

/** Role used by stat cards: decorative accents collapse to a neutral card. */
export function resolveCardRole(accent: AccentColor): StatusRole | 'neutral' {
  const role = resolveAccentRole(accent);
  return isStatusRole(role) ? role : 'neutral';
}
