import { useEffect, useMemo, useRef } from 'react';
import InfiniteGallery from '@/components/ui/3d-gallery-photography';

// Every image dropped into src/assets/works shows up here automatically,
// ordered by filename. Prefix files with 01-, 02-, ... to control the order.
const modules = import.meta.glob('../assets/works/*.{png,jpg,jpeg,gif,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const IMAGES = Object.keys(modules)
  .sort()
  .map((key) => ({ src: modules[key], alt: '' }));

/**
 * How much page scroll the pinned gallery consumes before it lets go, as a
 * multiple of the viewport. 4 => the section is 500vh tall and stays stuck for
 * 400vh of scrolling.
 */
const PIN_LENGTH = 4;

export default function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      const node = sectionRef.current;
      if (!node) return;

      // The sticky child is one viewport tall, so the scrollable travel is
      // whatever height the section has beyond that.
      const travel = node.offsetHeight - window.innerHeight;
      const scrolled = -node.getBoundingClientRect().top;
      const progress =
        travel > 0 ? Math.max(0, Math.min(1, scrolled / travel)) : 0;

      progressRef.current = progress;

      // Written straight to the DOM rather than through state: this runs on
      // every scroll event and must not re-render the canvas.
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
      if (countRef.current) {
        countRef.current.textContent = `${Math.round(progress * 100)}%`;
      }
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Held as a stable element so scroll updates on this section can never
  // reconcile the WebGL scene underneath it.
  const gallery = useMemo(
    () => (
      <InfiniteGallery
        images={IMAGES}
        visibleCount={12}
        scrollMode="progress"
        progressRef={progressRef}
        progressCycles={1.6}
        progressSmoothing={3.5}
        idleDelay={3}
        idleSpeed={0.02}
        // Wide plateau between the fades: the stock settings only hold a photo
        // at full opacity for a sliver of its travel, which reads as murky.
        fadeSettings={{
          fadeIn: { start: 0.02, end: 0.1 },
          fadeOut: { start: 0.44, end: 0.49 },
        }}
        blurSettings={{
          blurIn: { start: 0.0, end: 0.1 },
          blurOut: { start: 0.44, end: 0.49 },
          maxBlur: 3.0,
        }}
        className="h-full w-full"
      />
    ),
    []
  );

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#BBCCD7]"
      style={{ height: `${PIN_LENGTH + 1}00vh` }}
    >
      <div className="sticky top-0 h-screen w-full bg-[#BBCCD7]">
        {gallery}

        {/* Exclusion blend so the wordmark inverts against whatever photo is
            passing behind it and never disappears into one. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center mix-blend-exclusion">
          <h2
            className="font-serif italic leading-none tracking-tight text-white"
            style={{ fontSize: 'clamp(2.75rem, 8vw, 150px)' }}
          >
            I create;
          </h2>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-8 px-6 md:bottom-10 md:px-10">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0C0C0C]/50">
              Works
            </span>

            <div className="h-px flex-1 bg-[#0C0C0C]/20">
              <div
                ref={barRef}
                className="h-full origin-left bg-[#0C0C0C]"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>

            <span
              ref={countRef}
              className="w-10 text-right font-mono text-[10px] font-semibold tabular-nums text-[#0C0C0C]/50"
            >
              0%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
