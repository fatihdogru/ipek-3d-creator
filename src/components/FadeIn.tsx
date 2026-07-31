import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  /** Seconds to wait before the animation starts. */
  delay?: number;
  duration?: number;
  /** Starting horizontal offset in px. */
  x?: number;
  /** Starting vertical offset in px. */
  y?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export default function FadeIn({
  children,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  as = 'div',
  className,
  style,
}: FadeInProps) {
  const MotionTag = useMemo(() => motion.create(as), [as]);

  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </MotionTag>
  );
}
