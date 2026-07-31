import { useEffect, useRef, useState } from 'react';

// Every image dropped into src/assets/works shows up here automatically,
// ordered by filename. Prefix files with 01-, 02-, ... to control the order.
const modules = import.meta.glob('../assets/works/*.{png,jpg,jpeg,gif,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const IMAGES = Object.keys(modules)
  .sort()
  .map((key) => modules[key]);

// Split into two rows that scroll in opposite directions.
const half = Math.ceil(IMAGES.length / 2);
const ROW_ONE = IMAGES.slice(0, half);
const ROW_TWO = IMAGES.slice(half);

const TILE_WIDTH = 420;
const GAP = 12;

/** Repeat a row enough times that it stays filled while it slides. */
function fill(row: string[]) {
  if (row.length === 0) return [];
  const perScreen = Math.ceil(2560 / (TILE_WIDTH + GAP));
  const copies = Math.max(3, Math.ceil((perScreen * 2) / row.length));
  return Array.from({ length: copies }, () => row).flat();
}

const ROW_ONE_TILES = fill(ROW_ONE);
const ROW_TWO_TILES = fill(ROW_TWO);

function Tile({ src }: { src: string }) {
  return (
    <div className="h-[270px] w-[420px] shrink-0 overflow-hidden rounded-2xl">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}

export default function MarqueeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const node = sectionRef.current;
      if (!node) return;
      const sectionTop = node.offsetTop;
      setOffset((window.scrollY - sectionTop + window.innerHeight) * 0.3);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const shift = offset - 200;

  return (
    <section
      ref={sectionRef}
      className="bg-[#0C0C0C] pb-10 pt-24 sm:pt-32 md:pt-40"
      style={{ overflow: 'hidden' }}
    >
      <div className="flex flex-col gap-3">
        <div
          className="flex gap-3"
          style={{ transform: `translateX(${shift}px)`, willChange: 'transform' }}
        >
          {ROW_ONE_TILES.map((src, i) => (
            <Tile key={`row1-${i}`} src={src} />
          ))}
        </div>

        <div
          className="flex gap-3"
          style={{ transform: `translateX(${-shift}px)`, willChange: 'transform' }}
        >
          {ROW_TWO_TILES.map((src, i) => (
            <Tile key={`row2-${i}`} src={src} />
          ))}
        </div>
      </div>
    </section>
  );
}
