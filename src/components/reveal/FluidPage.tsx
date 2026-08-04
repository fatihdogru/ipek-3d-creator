import { useEffect, useRef, type ReactNode } from 'react';
import RevealBackground from './RevealBackground';
import type { ImagePair } from './images';

// Extra scroll, in viewport heights, that the page holds still before letting
// go. Short on purpose: enough to rest on a page, not enough to feel stuck.
const HOLD_VH = 0.5;

export default function FluidPage({
  pair,
  index,
  total,
  children,
}: {
  pair: ImagePair;
  index: number;
  total: number;
  children?: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;

    const apply = () => {
      raf = 0;
      const wrapper = wrapperRef.current;
      const fill = fillRef.current;
      if (!wrapper || !fill) return;

      // The sticky child is one viewport tall, so the remainder is the hold.
      const distance = wrapper.offsetHeight - window.innerHeight;
      const travelled = -wrapper.getBoundingClientRect().top;
      const p =
        distance > 0 ? Math.min(1, Math.max(0, travelled / distance)) : 0;
      fill.style.transform = `scaleX(${p})`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section
      ref={wrapperRef}
      className="relative z-20 bg-black"
      style={{ height: `${(1 + HOLD_VH) * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {/* Painted immediately, and the whole picture below lg where the
            simulation is switched off. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${pair.base})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        <RevealBackground base={pair.base} reveal={pair.reveal} />

        {children}

        {/* Hold indicator: fills while the page refuses to move on */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center text-white"
          style={{
            paddingInline: 'var(--pad-x)',
            paddingBottom: 'var(--main-py)',
            gap: 'var(--btn-gap)',
          }}
        >
          <span
            className="font-medium tabular-nums"
            style={{ fontSize: 'var(--micro)', letterSpacing: '0.22em' }}
          >
            {String(index).padStart(2, '0')}
          </span>
          <div className="h-px w-24 bg-white/40 sm:w-40">
            <div
              ref={fillRef}
              className="h-full w-full origin-left bg-white"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
          <span
            className="font-medium tabular-nums"
            style={{ fontSize: 'var(--micro)', letterSpacing: '0.22em' }}
          >
            {String(total).padStart(2, '0')}
          </span>
        </div>
      </div>
    </section>
  );
}
