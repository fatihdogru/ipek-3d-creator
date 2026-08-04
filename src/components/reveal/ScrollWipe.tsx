import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { WIPE_BASE, WIPE_REVEAL } from './images';

// Scroll only carries the wipe this far; past it the handle is the user's.
const SCROLL_TARGET = 0.2;

// Scroll budget for phase one, in viewport heights: the page holds still while
// the bar travels out to SCROLL_TARGET.
const PIN_VH = 0.7;

// Phase two: the page is still held, the bar has stopped, and the arrow swells
// to acknowledge the extra scrolling before the page finally lets go.
const EMPHASIS_VH = 0.5;

const PHASE_ONE = PIN_VH / (PIN_VH + EMPHASIS_VH);

// How large the arrow grows across phase two.
const ARROW_SCALE_TO = 2.1;

// Gap between the wipe edge and the arrow, and how far past the flip point the
// arrow has to come back before it returns to the right (stops it oscillating).
const ARROW_GAP = 18;
const FLIP_HYSTERESIS = 0.04;

// How far to either side of the edge we probe the artwork to pick the ink colour.
const SAMPLE_OFFSET = 60;

type Parts = {
  photo: HTMLDivElement | null;
  handle: HTMLDivElement | null;
  slider: HTMLDivElement | null;
  side: HTMLDivElement | null;
  arrow: HTMLDivElement | null;
  title: HTMLDivElement | null;
  fill: HTMLDivElement | null;
  percent: HTMLSpanElement | null;
};

type Sampler = {
  data: Uint8ClampedArray;
  w: number;
  h: number;
  iw: number;
  ih: number;
};

/**
 * Relative luminance of the artwork under a point, accounting for the way
 * `background-size: cover` crops it. Returns 1 (treat as light) when the
 * artwork has not been decoded yet.
 */
function luminanceAt(
  sampler: Sampler | null,
  clientX: number,
  clientY: number,
) {
  if (!sampler) return 1;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const scale = Math.max(W / sampler.iw, H / sampler.ih);
  const offsetX = (W - sampler.iw * scale) / 2;
  const offsetY = (H - sampler.ih * scale) / 2;

  // Screen -> natural image pixels -> the downscaled copy we actually read.
  const nx = (clientX - offsetX) / scale;
  const ny = (clientY - offsetY) / scale;
  const px = Math.round((nx / sampler.iw) * sampler.w);
  const py = Math.round((ny / sampler.ih) * sampler.h);

  let total = 0;
  let count = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = Math.min(sampler.w - 1, Math.max(0, px + dx));
      const y = Math.min(sampler.h - 1, Math.max(0, py + dy));
      const i = (y * sampler.w + x) * 4;
      total +=
        (0.2126 * sampler.data[i] +
          0.7152 * sampler.data[i + 1] +
          0.0722 * sampler.data[i + 2]) /
        255;
      count++;
    }
  }

  return total / count;
}

type PaintState = {
  p: number;
  emphasis: number;
  atEnd: boolean;
  titleY: number;
};

/** Writes the wipe position straight to the DOM — no re-render per frame. */
function paint(
  { p, emphasis, atEnd, titleY }: PaintState,
  parts: Parts,
  samplers: { base: Sampler | null; reveal: Sampler | null },
) {
  if (parts.photo)
    parts.photo.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
  if (parts.handle) parts.handle.style.left = `${p * 100}%`;
  if (parts.fill) parts.fill.style.transform = `scaleX(${p})`;
  if (parts.percent) parts.percent.textContent = `${Math.round(p * 100)}%`;
  if (parts.slider) {
    parts.slider.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }

  const W = window.innerWidth;
  const edgeX = p * W;

  // Everything left of the edge is the revealed photograph, everything right of
  // it is the drawing, so each mark reads whichever artwork it sits on.
  const inkAt = (x: number, y: number) => {
    const clamped = Math.min(W - 1, Math.max(0, x));
    const sampler = clamped < edgeX ? samplers.reveal : samplers.base;
    return luminanceAt(sampler, clamped, y) > 0.55 ? '#000000' : '#ffffff';
  };

  if (parts.side) {
    parts.side.style.transform = atEnd
      ? `translateY(-50%) translateX(calc(-100% - ${ARROW_GAP}px))`
      : `translateY(-50%) translateX(${ARROW_GAP}px)`;
  }

  if (parts.arrow) {
    parts.arrow.style.color = inkAt(
      atEnd ? edgeX - SAMPLE_OFFSET : edgeX + SAMPLE_OFFSET,
      window.innerHeight / 2,
    );
    parts.arrow.style.transformOrigin = atEnd ? 'right center' : 'left center';
    parts.arrow.style.transform = `scale(${1 + (ARROW_SCALE_TO - 1) * emphasis})`;
  }

  if (parts.title) {
    parts.title.style.color = inkAt(W / 2, titleY);
  }
}

export default function ScrollWipe() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const percentRef = useRef<HTMLSpanElement | null>(null);

  // Read the refs at paint time, never cache them: during the first render they
  // are still null, and this component does not re-render on scroll.
  const getParts = (): Parts => ({
    photo: photoRef.current,
    handle: handleRef.current,
    slider: sliderRef.current,
    side: sideRef.current,
    arrow: arrowRef.current,
    title: titleRef.current,
    fill: fillRef.current,
    percent: percentRef.current,
  });

  const scrollRef = useRef(0);
  const dragRef = useRef(0);
  const draggingRef = useRef(false);
  const grabOffsetRef = useRef(0);
  const arrowWidthRef = useRef(32);
  const titleYRef = useRef(80);
  const pastMiddleRef = useRef(false);
  const atEndRef = useRef(false);
  const samplersRef = useRef<{ base: Sampler | null; reveal: Sampler | null }>({
    base: null,
    reveal: null,
  });

  // The hint runs until the handle has actually been dragged once.
  const [hinting, setHinting] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [pastMiddle, setPastMiddle] = useState(false);

  const position = () => {
    const barFromScroll =
      Math.min(1, scrollRef.current / PHASE_ONE) * SCROLL_TARGET;
    return Math.max(barFromScroll, dragRef.current);
  };

  const render = () => {
    const p = position();
    const emphasis = Math.min(
      1,
      Math.max(0, (scrollRef.current - PHASE_ONE) / (1 - PHASE_ONE)),
    );

    // Flip sides exactly when the arrow runs out of room on the right, which is
    // what "the end" looks like regardless of viewport or type scale.
    const flipAt =
      1 - (arrowWidthRef.current + ARROW_GAP * 2) / window.innerWidth;
    const nextAtEnd = atEndRef.current
      ? p > flipAt - FLIP_HYSTERESIS
      : p > flipAt;
    if (nextAtEnd !== atEndRef.current) {
      atEndRef.current = nextAtEnd;
      setAtEnd(nextAtEnd);
    }

    // The readout swaps once the edge has crossed the middle of the screen.
    const nextPastMiddle = p > 0.5;
    if (nextPastMiddle !== pastMiddleRef.current) {
      pastMiddleRef.current = nextPastMiddle;
      setPastMiddle(nextPastMiddle);
    }

    paint(
      { p, emphasis, atEnd: nextAtEnd, titleY: titleYRef.current },
      getParts(),
      samplersRef.current,
    );
  };

  const renderRef = useRef(render);
  renderRef.current = render;

  useEffect(() => {
    let raf = 0;
    let cancelled = false;

    const schedule = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          renderRef.current();
        });
      }
    };

    const readScroll = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      // The sticky child is one viewport tall, so the remainder is the pin budget.
      const distance = wrapper.offsetHeight - window.innerHeight;
      const travelled = -wrapper.getBoundingClientRect().top;
      scrollRef.current =
        distance > 0 ? Math.min(1, Math.max(0, travelled / distance)) : 0;
      schedule();
    };

    // Decode both artworks once at low resolution so the marks can pick an ink
    // colour that stays legible wherever the edge is parked, on either side.
    const decode = (src: string, key: 'base' | 'reveal') => {
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        const w = 200;
        const h = Math.max(1, Math.round((200 * image.height) / image.width));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, w, h);
        samplersRef.current[key] = {
          data: ctx.getImageData(0, 0, w, h).data,
          w,
          h,
          iw: image.width,
          ih: image.height,
        };
        schedule();
      };
      image.src = src;
    };

    decode(WIPE_BASE, 'base');
    decode(WIPE_REVEAL, 'reveal');

    readScroll();
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', readScroll);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', readScroll);
      window.removeEventListener('resize', readScroll);
    };
  }, []);

  // The arrow's width decides where it flips sides, and it moves with the
  // fluid type scale.
  useEffect(() => {
    const measure = () => {
      if (arrowRef.current) {
        arrowWidthRef.current = arrowRef.current.getBoundingClientRect().width;
      }
      if (titleRef.current) {
        const rect = titleRef.current.getBoundingClientRect();
        titleYRef.current = rect.top + rect.height / 2;
      }
      renderRef.current();
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [atEnd, pastMiddle]);

  const setFromClientX = (clientX: number) => {
    dragRef.current = Math.min(1, Math.max(0, clientX / window.innerWidth));
    render();
  };

  // Shared by the edge itself and the arrow, so either can be grabbed. The grab
  // offset keeps the edge from jumping to wherever the pointer went down.
  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      setHinting(false);
      grabOffsetRef.current = e.clientX - position() * window.innerWidth;
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingRef.current)
        setFromClientX(e.clientX - grabOffsetRef.current);
    },
    onPointerUp: () => {
      draggingRef.current = false;
    },
    onPointerCancel: () => {
      draggingRef.current = false;
    },
  };

  return (
    <section
      ref={wrapperRef}
      className="relative z-20 bg-black"
      style={{ height: `${(1 + PIN_VH + EMPHASIS_VH) * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {/* The drawn version: on screen first, stays underneath the whole time */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${WIPE_BASE})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* The photoreal version: opened from the left as the handle travels right */}
        <div
          ref={photoRef}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${WIPE_REVEAL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            clipPath: 'inset(0 100% 0 0)',
          }}
        />

        {/* Readout, pinned top centre; swaps as the edge crosses the middle */}
        <div
          ref={titleRef}
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-orbitron uppercase"
          style={{
            top: 'var(--main-py)',
            fontSize: 'var(--wipe-title)',
            letterSpacing: '0.2em',
            fontWeight: 800,
            transition: 'color 180ms linear',
          }}
        >
          <span key={pastMiddle ? 'render' : 'sketch'} className="anim-fade-in">
            {pastMiddle ? 'RENDER' : 'SKETCH'}
          </span>
        </div>

        {/* The wipe edge, draggable once scroll has parked it at SCROLL_TARGET */}
        <div ref={handleRef} className="absolute inset-y-0 left-0">
          <div className="absolute inset-y-0 left-0 w-px bg-black" />

          <div
            ref={sliderRef}
            role="slider"
            tabIndex={0}
            aria-label="Drag to reveal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            className="absolute inset-y-0 -left-6 w-12 cursor-ew-resize"
            style={{ touchAction: 'none' }}
            {...dragHandlers}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              setHinting(false);
              const step = e.key === 'ArrowRight' ? 0.04 : -0.04;
              setFromClientX((dragRef.current + step) * window.innerWidth);
            }}
          />

          {/* Three nested layers so the side flip, the elastic hint and the
              scroll emphasis never fight over the same transform. */}
          <div
            ref={sideRef}
            className="absolute top-1/2 left-0 cursor-ew-resize select-none"
            style={{
              transform: `translateY(-50%) translateX(${ARROW_GAP}px)`,
              transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
              touchAction: 'none',
            }}
            {...dragHandlers}
          >
            <div className={hinting ? 'anim-rubber' : ''}>
              <div ref={arrowRef} className="flex items-center">
                <ChevronRight
                  strokeWidth={2}
                  style={{
                    width: 'var(--wipe-label)',
                    height: 'var(--wipe-label)',
                    transform: atEnd ? 'rotate(180deg)' : 'none',
                    transition:
                      'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll progress */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center"
          style={{
            paddingInline: 'var(--pad-x)',
            paddingBottom: 'var(--main-py)',
            gap: 'var(--btn-gap)',
          }}
        >
          <div className="h-px flex-1 bg-gray-400">
            <div
              ref={fillRef}
              className="h-full w-full origin-left bg-black"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
          <span
            ref={percentRef}
            className="shrink-0 font-medium tabular-nums"
            style={{ fontSize: 'var(--micro)', letterSpacing: '0.22em' }}
          >
            0%
          </span>
        </div>
      </div>
    </section>
  );
}
