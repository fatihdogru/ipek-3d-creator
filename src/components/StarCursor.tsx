import { useEffect, useRef } from 'react';

/** Same 16-bit palette the About starfield uses, so the two read as one system. */
const PARTICLE_COLORS = [
  '#FFFFFF',
  '#FFFFAA',
  '#AAAAFF',
  '#FFAAAA',
  '#AAFFAA',
  '#FFAAFF',
  '#AAFFFF',
] as const;

const PIXEL = 3;
const MAX_PARTICLES = 260;
/** Roughly one particle per this many pixels of travel. */
const SPAWN_EVERY = 6;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

/**
 * Pixel-art five-pointed star: top point, the two arms, then the taper down
 * into the two legs. Written as a bitmap so the shape is readable here rather
 * than hidden in a coordinate list.
 */
const STAR_BITMAP = [
  '...X...',
  '..XXX..',
  'XXXXXXX',
  '.XXXXX.',
  '..XXX..',
  '..X.X..',
  '.X...X.',
];

/** Offsets from the cursor, in PIXEL units, centred on the bitmap. */
const STAR_CELLS: [number, number][] = STAR_BITMAP.flatMap((row, y) =>
  row
    .split('')
    .map((cell, x): [number, number] | null =>
      cell === 'X' ? [x - (row.length - 1) / 2, y - (STAR_BITMAP.length - 1) / 2] : null
    )
    .filter((cell): cell is [number, number] => cell !== null)
);

interface StarCursorProps {
  /**
   * id of the element the cursor takes over inside. Everywhere else the native
   * cursor is left alone and nothing is drawn.
   */
  targetId: string;
}

export default function StarCursor({ targetId }: StarCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Touch and pen input have no hovering cursor to replace, and hiding the
    // native one there would just remove a pointer the user still needs.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    const pointer = { x: -100, y: -100, seen: false };
    let last = { x: -100, y: -100 };
    let carry = 0;
    let frame = 0;
    let active = false;

    const setActive = (next: boolean) => {
      if (next === active) return;
      active = next;
      document.documentElement.classList.toggle('star-cursor', next);
      // Re-anchor on re-entry so crossing the boundary doesn't spray a trail
      // along the straight line back to wherever the pointer last was.
      if (next) {
        last = { x: pointer.x, y: pointer.y };
        carry = 0;
      }
    };

    const isOverTarget = (x: number, y: number) => {
      const target = document.getElementById(targetId);
      if (!target) return false;
      const rect = target.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (x: number, y: number) => {
      particles.push({
        x,
        y,
        // Drift outward slightly, then fall — reads as sparks settling.
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2 + 0.35,
        life: 1,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]!,
      });
      if (particles.length > MAX_PARTICLES) particles.shift();
    };

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (!pointer.seen) {
        pointer.seen = true;
        last = { x: pointer.x, y: pointer.y };
      }

      setActive(isOverTarget(pointer.x, pointer.y));
      if (!active) {
        last = { x: pointer.x, y: pointer.y };
        return;
      }

      // Spawn along the travelled distance rather than per event, so the trail
      // stays even whether the pointer is moved slowly or flung across.
      const dx = pointer.x - last.x;
      const dy = pointer.y - last.y;
      const distance = Math.hypot(dx, dy);
      carry += distance;

      while (carry >= SPAWN_EVERY) {
        carry -= SPAWN_EVERY;
        const t = distance > 0 ? carry / distance : 0;
        spawn(pointer.x - dx * t, pointer.y - dy * t);
      }

      last = { x: pointer.x, y: pointer.y };
    };

    const render = () => {
      frame = requestAnimationFrame(render);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (!pointer.seen) return;

      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]!;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.02;
        particle.life -= 0.022;

        if (particle.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        // Snapped to a PIXEL grid so the sparks stay square, like the starfield.
        ctx.fillRect(
          Math.round(particle.x / PIXEL) * PIXEL,
          Math.round(particle.y / PIXEL) * PIXEL,
          PIXEL,
          PIXEL
        );
      }

      if (!active) return;

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      for (const [cx, cy] of STAR_CELLS) {
        ctx.fillRect(
          Math.round(pointer.x / PIXEL) * PIXEL + cx * PIXEL,
          Math.round(pointer.y / PIXEL) * PIXEL + cy * PIXEL,
          PIXEL,
          PIXEL
        );
      }
    };

    // Scrolling moves the section under a stationary pointer, so the takeover
    // has to be re-checked without a pointermove to trigger it.
    const onScroll = () => {
      if (pointer.seen) setActive(isOverTarget(pointer.x, pointer.y));
    };

    const onLeave = () => setActive(false);

    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', resize);
      document.documentElement.classList.remove('star-cursor');
    };
  }, [targetId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
    />
  );
}
