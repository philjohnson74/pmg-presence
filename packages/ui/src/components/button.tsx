import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/utils.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-sans font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-pmg-navy text-white hover:bg-pmg-navy/90 focus-visible:ring-pmg-navy',
        accent: 'bg-pmg-orange text-white hover:bg-pmg-orange/90 focus-visible:ring-pmg-orange',
        outline:
          'border-2 border-pmg-navy text-pmg-navy bg-transparent hover:bg-pmg-navy hover:text-white',
        ghost: 'text-pmg-navy hover:bg-pmg-navy/10',
        destructive: 'bg-rollcall-red text-white hover:bg-rollcall-red/90',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        // Large touch target for kiosk tablet use
        kiosk: 'h-20 px-10 text-xl rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = 'Button';
