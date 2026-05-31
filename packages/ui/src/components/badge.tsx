import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import type { PersonType, RollCallState, VisitCategory } from '@pmg/contracts';
import { cn } from '../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold font-sans',
  {
    variants: {
      variant: {
        employee: 'bg-pmg-navy text-white',
        patient: 'bg-pmg-cyan text-pmg-navy',
        visitor: 'bg-pmg-green/20 text-pmg-navy',
        // Roll-call state colours — evacuation mode only
        unaccounted: 'bg-rollcall-red text-white',
        accounted: 'bg-rollcall-green text-pmg-navy',
        'expected-absent': 'bg-rollcall-amber text-white',
      },
    },
    defaultVariants: { variant: 'employee' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, className }))} {...props} />
  ),
);
Badge.displayName = 'Badge';

// ─── PersonTypeBadge ──────────────────────────────────────────────────────────
// Primary label = personType (employee / patient / visitor).
// visitCategory shown as secondary label (e.g. "Visitor · contractor") where present.

export interface PersonTypeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  personType: PersonType;
  visitCategory?: VisitCategory;
}

export function PersonTypeBadge({ personType, visitCategory, className }: Readonly<PersonTypeBadgeProps>) {
  const label =
    visitCategory && personType === 'visitor'
      ? `Visitor · ${visitCategory}`
      : personType.charAt(0).toUpperCase() + personType.slice(1);

  return (
    <Badge variant={personType} className={className}>
      {label}
    </Badge>
  );
}

// ─── RollCallStateBadge ───────────────────────────────────────────────────────

export interface RollCallStateBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: RollCallState;
}

const stateLabel: Record<RollCallState, string> = {
  unaccounted: 'Not accounted for',
  accounted: 'Accounted for',
  'expected-absent': 'Expected – not signed in',
};

export function RollCallStateBadge({ state, className }: Readonly<RollCallStateBadgeProps>) {
  return (
    <Badge variant={state} className={className}>
      {stateLabel[state]}
    </Badge>
  );
}
