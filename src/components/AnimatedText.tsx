import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import type { CSSProperties } from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Animate whole words instead of single characters. Required for scripts
   * whose letters join up (Arabic): splitting those per character would break
   * the cursive connections and render the word unreadable.
   */
  perWord?: boolean;
}

interface PieceProps {
  content: string;
  progress: MotionValue<number>;
  range: [number, number];
}

function Piece({ content, progress, range }: PieceProps) {
  const opacity = useTransform(progress, range, [0.2, 1]);

  return (
    <span className="relative inline-block">
      {/* Invisible placeholder keeps the glyph's box in the flow. */}
      <span className="opacity-0">{content}</span>
      <motion.span style={{ opacity }} className="absolute start-0 top-0">
        {content}
      </motion.span>
    </span>
  );
}

export default function AnimatedText({ text, className, style, perWord }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    /**
     * Finishes while the text is still low on the screen, because this sits in
     * the last section on the page: once the document bottom is reached the
     * paragraph stops climbing at roughly mid-viewport, so any end offset above
     * that would leave the reveal permanently stuck part-way through.
     */
    offset: ['start 0.9', 'end 0.8'],
  });

  const words = text.split(' ');

  if (perWord) {
    return (
      <p ref={ref} className={className} style={style}>
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            <Piece
              content={word}
              progress={scrollYProgress}
              range={[i / words.length, (i + 1) / words.length]}
            />
            {i < words.length - 1 && ' '}
          </span>
        ))}
      </p>
    );
  }

  const totalChars = text.length;
  let charIndex = 0;

  return (
    <p ref={ref} className={className} style={style}>
      {words.map((word, wordIdx) => {
        const wordStart = charIndex;
        charIndex += word.length + 1; // +1 for the space that follows

        return (
          <span key={`${word}-${wordIdx}`} className="inline-block whitespace-nowrap">
            {word.split('').map((char, i) => {
              const index = wordStart + i;
              return (
                <Piece
                  key={`${char}-${i}`}
                  content={char}
                  progress={scrollYProgress}
                  range={[index / totalChars, (index + 1) / totalChars]}
                />
              );
            })}
            {wordIdx < words.length - 1 && <span>&nbsp;</span>}
          </span>
        );
      })}
    </p>
  );
}
