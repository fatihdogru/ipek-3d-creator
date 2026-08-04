import { useEffect, useRef, useState } from 'react';
import { snoise3 } from './noise';

/*
  Fallback for machines without WebGL2 float targets: a simplex-noise blob
  masked over the second image with a 2D canvas. No fluid, but the same idea —
  a hard-edged organic shape that wriggles as the pointer moves.
*/

// How closely the blob follows the cursor. Lower = floatier trail.
const EASE = 0.075;
const GRID_EASE = 0.06;
const PARALLAX = 16;

// Contour resolution. Higher = rounder curve, more noise lookups per frame.
const POINTS = 96;

// Shape of the wobble: angular frequency of the noise ring, how fast the field
// scrolls through time, and how far the radius is pushed around.
const NOISE_SCALE = 1.15;
const NOISE_SPEED = 0.32;
const WOBBLE = 0.26;

// Movement stretches the blob along its direction of travel, the way a fluid
// smears. PACE_EASE keeps that reaction from twitching frame to frame.
const STRETCH = 0.0075;
const MAX_STRETCH = 0.7;
const PACE_EASE = 0.06;

// The mask is stretched back to full size via `mask-size: 100% 100%`, so drawing
// it at half resolution is four times cheaper and softens the edge by ~2px.
const MASK_SCALE = 0.5;

function blobRadius() {
  return Math.round(Math.min(360, Math.max(150, window.innerWidth * 0.14)));
}

function gridCell() {
  return Math.round(Math.min(64, Math.max(36, window.innerWidth * 0.028)));
}

/** Traces a closed curve through the points, smoothed via their midpoints. */
function tracePath(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  scale: number,
) {
  const n = xs.length;
  ctx.beginPath();
  ctx.moveTo(
    ((xs[n - 1] + xs[0]) / 2) * scale,
    ((ys[n - 1] + ys[0]) / 2) * scale,
  );
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.quadraticCurveTo(
      xs[i] * scale,
      ys[i] * scale,
      ((xs[i] + xs[j]) / 2) * scale,
      ((ys[i] + ys[j]) / 2) * scale,
    );
  }
  ctx.closePath();
}

export default function ImageRevealBackground({
  base,
  reveal,
}: {
  base: string;
  reveal: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const patternRef = useRef<SVGPatternElement | null>(null);

  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const paceRef = useRef(0);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [cell, setCell] = useState(() =>
    typeof window === 'undefined' ? 48 : gridCell(),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    const xs = new Float32Array(POINTS);
    const ys = new Float32Array(POINTS);

    let radius = blobRadius();
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const sizeCanvas = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      maskCanvas.width = Math.max(1, Math.round(width * MASK_SCALE));
      maskCanvas.height = Math.max(1, Math.round(height * MASK_SCALE));
    };

    const onResize = () => {
      sizeCanvas();
      radius = blobRadius();
      setCell(gridCell());
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    sizeCanvas();
    // Start centred so the blob eases in from the middle of the frame.
    mouseRef.current = { x: width / 2, y: height / 2 };
    smoothRef.current = { ...mouseRef.current };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { rootMargin: '10% 0px' },
    );
    observer.observe(container);

    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!maskCtx || !visible) return;

      const mouse = mouseRef.current;
      const smooth = smoothRef.current;
      const prevX = smooth.x;
      const prevY = smooth.y;

      smooth.x += (mouse.x - smooth.x) * EASE;
      smooth.y += (mouse.y - smooth.y) * EASE;

      // Eased velocity drives both the stretch direction and the wobble gain,
      // so the shape reacts to movement instead of the raw pointer position.
      const vel = velRef.current;
      vel.x += (smooth.x - prevX - vel.x) * 0.15;
      vel.y += (smooth.y - prevY - vel.y) * 0.15;

      const speed = Math.hypot(vel.x, vel.y);
      paceRef.current +=
        (Math.min(1, speed / 26) - paceRef.current) * PACE_EASE;
      const pace = paceRef.current;

      const stretch = Math.min(MAX_STRETCH, speed * STRETCH);
      const angle = speed > 0.01 ? Math.atan2(vel.y, vel.x) : 0;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const t = performance.now() / 1000;
      const cx = smooth.x;
      const cy = smooth.y;

      for (let i = 0; i < POINTS; i++) {
        const a = (i / POINTS) * Math.PI * 2;
        const ux = Math.cos(a);
        const uy = Math.sin(a);

        // Two octaves sampled around a ring: the noise is continuous across the
        // seam because the ring closes on itself in the noise field.
        const n1 = snoise3(ux * NOISE_SCALE, uy * NOISE_SCALE, t * NOISE_SPEED);
        const n2 = snoise3(
          ux * NOISE_SCALE * 2.4 + 11,
          uy * NOISE_SCALE * 2.4 - 7,
          t * NOISE_SPEED * 1.7,
        );

        const r = radius * (1 + (n1 + n2 * 0.45) * WOBBLE * (1 + pace * 0.9));

        // Stretch along the travel direction: rotate into that frame, scale, rotate back.
        let lx = ux * r;
        let ly = uy * r;
        const rx = lx * cosA + ly * sinA;
        const ry = -lx * sinA + ly * cosA;
        const sx = rx * (1 + stretch);
        const sy = ry / (1 + stretch * 0.35);
        lx = sx * cosA - sy * sinA;
        ly = sx * sinA + sy * cosA;

        xs[i] = cx + lx;
        ys[i] = cy + ly;
      }

      // Hard-edged mask: a solid fill, so the reveal has a crisp organic border.
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.fillStyle = '#fff';
      tracePath(maskCtx, xs, ys, MASK_SCALE);
      maskCtx.fill();

      const revealLayer = revealRef.current;
      if (revealLayer) {
        const dataUrl = maskCanvas.toDataURL();
        revealLayer.style.maskImage = `url(${dataUrl})`;
        revealLayer.style.webkitMaskImage = `url(${dataUrl})`;
        revealLayer.style.maskSize = '100% 100%';
        revealLayer.style.webkitMaskSize = '100% 100%';
      }

      const pattern = patternRef.current;
      if (pattern) {
        const nx = width ? cx / width - 0.5 : 0;
        const ny = height ? cy / height - 0.5 : 0;
        const offset = offsetRef.current;
        offset.x += (nx * PARALLAX - offset.x) * GRID_EASE;
        offset.y += (ny * PARALLAX - offset.y) * GRID_EASE;
        pattern.setAttribute('x', String(offset.x));
        pattern.setAttribute('y', String(offset.y));
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const gridId = `noise-grid-${base.replace(/\W/g, '').slice(-12)}`;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${base})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        ref={revealRef}
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${reveal})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
        }}
      />
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.1 }}>
        <defs>
          <pattern
            ref={patternRef}
            id={gridId}
            width={cell}
            height={cell}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${cell} 0 L 0 0 0 ${cell}`}
              fill="none"
              stroke="#64748b"
              strokeWidth={0.6}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>
    </div>
  );
}
