import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** The shine is a gradient stop swept across the button by animating `--x`. */
const animationProps = {
  initial: { '--x': '100%', scale: 0.8 },
  animate: { '--x': '-100%', scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: 'loop',
    repeatDelay: 1,
    type: 'spring',
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: { type: 'spring', stiffness: 200, damping: 5, mass: 0.5 },
  },
} satisfies Partial<ComponentProps<typeof motion.button>>;

/**
 * React's drag and animation handlers collide with framer-motion's props of the
 * same name, so they are dropped rather than forwarded.
 */
type ShinyButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
> & {
  children: ReactNode;
  className?: string;
};

const SHINE_SWEEP =
  'linear-gradient(-75deg, #000 calc(var(--x) + 20%), transparent calc(var(--x) + 30%), #000 calc(var(--x) + 100%))';

/**
 * Deliberately ships no padding or font-size: without tailwind-merge the last
 * rule in the stylesheet wins rather than the last class in the string, so a
 * default `px-6` here would silently beat a caller's `px-12`.
 */
export default function ShinyButton({ children, className = '', ...props }: ShinyButtonProps) {
  return (
    <motion.button
      {...animationProps}
      {...props}
      className={`relative rounded-full border border-[#D7E2EA]/20 backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow-[0_0_22px_rgba(215,226,234,0.14)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span
        className="relative block size-full font-medium uppercase tracking-widest text-[#D7E2EA]"
        style={{ maskImage: SHINE_SWEEP, WebkitMaskImage: SHINE_SWEEP }}
      >
        {children}
      </span>

      {/* Border-only highlight: the two masks cancel out everything but the
          1px padding ring, so the sweep reads as a travelling edge light. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 block rounded-[inherit] p-px"
        style={{
          background:
            'linear-gradient(-75deg, rgba(215,226,234,0.10) calc(var(--x) + 20%), rgba(215,226,234,0.55) calc(var(--x) + 25%), rgba(215,226,234,0.10) calc(var(--x) + 100%))',
          mask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
          maskComposite: 'exclude',
          WebkitMask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
          WebkitMaskComposite: 'xor',
        }}
      />
    </motion.button>
  );
}

export { ShinyButton };
